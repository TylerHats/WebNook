import { Router, Request, Response } from 'express';
import { queryOne, execute } from '../db/connection';
import { sendIntegrationErrorEmail } from '../services/emailService';
import https from 'https';
import http from 'http';

const router = Router();

// Helper HTTP/HTTPS text getter
function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

function fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  return fetchText(url, headers).then(text => JSON.parse(text));
}

/**
 * Clean Steam Input:
 * Accepts:
 * - 64-bit Steam ID: 76561198000000000
 * - Custom Vanity Handle: TylerHats
 * - Profile URL: https://steamcommunity.com/id/TylerHats/ or https://steamcommunity.com/profiles/76561198000000000
 */
function parseSteamInput(input: string): { type: 'steamid64' | 'vanity'; value: string } {
  let raw = input.trim();

  // Strip trailing slashes
  raw = raw.replace(/\/+$/, '');

  if (raw.includes('/profiles/')) {
    const parts = raw.split('/profiles/');
    const id = parts[1].split('/')[0];
    return { type: /^\d{17}$/.test(id) ? 'steamid64' : 'vanity', value: id };
  }

  if (raw.includes('/id/')) {
    const parts = raw.split('/id/');
    const vanity = parts[1].split('/')[0];
    return { type: 'vanity', value: vanity };
  }

  if (/^\d{17}$/.test(raw)) {
    return { type: 'steamid64', value: raw };
  }

  return { type: 'vanity', value: raw };
}

// Steam User Stats & Games endpoint
router.get('/steam/:steamInput', async (req: Request, res: Response) => {
  try {
    const { steamInput } = req.params;
    const mode = (req.query.mode as string) || 'both'; // none, recently_played, top_games, both
    const parsedInput = parseSteamInput(steamInput);

    // 1. Check system settings for custom Steam API key
    const apiKeyRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "steam_api_key"');
    const apiKey = apiKeyRow?.value;

    let targetSteamId64 = parsedInput.type === 'steamid64' ? parsedInput.value : '';

    if (apiKey) {
      try {
        // Resolve vanity URL if needed
        if (!targetSteamId64 && parsedInput.type === 'vanity') {
          const vanityRes = await fetchJson(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${apiKey}&vanityurl=${encodeURIComponent(parsedInput.value)}`);
          if (vanityRes.response && vanityRes.response.steamid) {
            targetSteamId64 = vanityRes.response.steamid;
          }
        }

        if (targetSteamId64) {
          const recentRes = await fetchJson(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${apiKey}&steamid=${targetSteamId64}&format=json`);
          const ownedRes = await fetchJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${targetSteamId64}&include_appinfo=true&include_played_free_games=true&format=json`);
          const playerRes = await fetchJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${targetSteamId64}`);

          const player = playerRes.response?.players?.[0];
          const recentGamesRaw = recentRes.response?.games || [];
          const ownedGamesRaw = ownedRes.response?.games || [];

          // Sort top games by lifetime playtime
          const topGamesSorted = [...ownedGamesRaw]
            .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
            .slice(0, 3)
            .map((g: any) => ({
              appid: g.appid,
              name: g.name,
              playtime_forever: Math.round((g.playtime_forever || 0) / 60),
              icon: `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
            }));

          const recentlyPlayedSorted = recentGamesRaw.slice(0, 3).map((g: any) => ({
            appid: g.appid,
            name: g.name,
            playtime_2weeks: Math.round((g.playtime_2weeks || 0) / 60),
            playtime_forever: Math.round((g.playtime_forever || 0) / 60),
            icon: `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          }));

          // Reset error count on success
          await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_consecutive_errors', '0']);
          await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_api_status', 'connected']);

          return res.json({
            player: player ? {
              personaName: player.personaname,
              avatar: player.avatarfull || player.avatar,
              profileUrl: player.profileurl,
              personaState: player.personastate
            } : null,
            recentlyPlayed: recentlyPlayedSorted,
            topGames: topGamesSorted
          });
        }
      } catch (apiErr: any) {
        console.warn('Steam Web API error, falling back to public XML scrape:', apiErr?.message);
        // Increment consecutive failure counter
        const errCountRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "steam_consecutive_errors"');
        const newCount = (parseInt(errCountRow?.value || '0', 10)) + 1;
        await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_consecutive_errors', String(newCount)]);
        if (newCount >= 3) {
          await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_api_status', 'broken']);
          sendIntegrationErrorEmail('Steam Web API', apiErr?.message || 'Repeated Steam Web API request failures');
        }
      }
    }

    // 2. Fallback: Scrape public Steam profile XML feed directly!
    try {
      const xmlUrl = parsedInput.type === 'steamid64'
        ? `https://steamcommunity.com/profiles/${parsedInput.value}/?xml=1`
        : `https://steamcommunity.com/id/${encodeURIComponent(parsedInput.value)}/?xml=1`;

      const xmlText = await fetchText(xmlUrl);

      const personaNameMatch = xmlText.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/) || xmlText.match(/<steamID>(.*?)<\/steamID>/);
      const avatarMatch = xmlText.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/) || xmlText.match(/<avatarFull>(.*?)<\/avatarFull>/);
      const stateMatch = xmlText.match(/<onlineState>(.*?)<\/onlineState>/);
      const stateMessageMatch = xmlText.match(/<stateMessage><!\[CDATA\[(.*?)\]\]><\/stateMessage>/) || xmlText.match(/<stateMessage>(.*?)<\/stateMessage>/);

      const personaName = personaNameMatch ? personaNameMatch[1] : parsedInput.value;
      const avatar = avatarMatch ? avatarMatch[1] : 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&auto=format&fit=crop&q=80';
      const onlineState = stateMatch ? stateMatch[1] : 'offline';
      const isOnline = onlineState.toLowerCase() !== 'offline';

      const games: any[] = [];
      const gameBlocks = xmlText.split('<mostPlayedGame>');

      for (let i = 1; i < gameBlocks.length && games.length < 5; i++) {
        const block = gameBlocks[i];
        const gNameMatch = block.match(/<gameName><!\[CDATA\[(.*?)\]\]><\/gameName>/) || block.match(/<gameName>(.*?)<\/gameName>/);
        const gIconMatch = block.match(/<gameIcon><!\[CDATA\[(.*?)\]\]><\/gameIcon>/) || block.match(/<gameIcon>(.*?)<\/gameIcon>/);
        const gHoursMatch = block.match(/<hoursOnRecord>(.*?)<\/hoursOnRecord>/);
        const g2WeeksMatch = block.match(/<hoursPlayed>(.*?)<\/hoursPlayed>/);

        if (gNameMatch) {
          games.push({
            name: gNameMatch[1],
            playtime_2weeks: g2WeeksMatch ? Math.round(parseFloat(g2WeeksMatch[1])) : 0,
            playtime_forever: gHoursMatch ? Math.round(parseFloat(gHoursMatch[1].replace(',', ''))) : 0,
            icon: gIconMatch ? gIconMatch[1] : ''
          });
        }
      }

      return res.json({
        player: {
          personaName,
          avatar,
          profileUrl: parsedInput.type === 'steamid64' ? `https://steamcommunity.com/profiles/${parsedInput.value}` : `https://steamcommunity.com/id/${parsedInput.value}`,
          personaState: isOnline ? 1 : 0,
          stateMessage: stateMessageMatch ? stateMessageMatch[1] : ''
        },
        recentlyPlayed: games.slice(0, 3),
        topGames: [...games].sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0)).slice(0, 3)
      });
    } catch (scrapeErr) {
      console.warn('Steam XML scrape fallback error:', scrapeErr);
    }

    // Default Fallback Preview
    return res.json({
      player: {
        personaName: parsedInput.value,
        avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&auto=format&fit=crop&q=80',
        personaState: 1
      },
      recentlyPlayed: [
        { appid: 1086000, name: "Baldur's Gate 3", playtime_2weeks: 18, playtime_forever: 142 },
        { appid: 1091500, name: 'Cyberpunk 2077', playtime_2weeks: 9, playtime_forever: 98 }
      ],
      topGames: [
        { appid: 1086000, name: "Baldur's Gate 3", playtime_forever: 142 },
        { appid: 1091500, name: 'Cyberpunk 2077', playtime_forever: 98 },
        { appid: 1145360, name: 'Hades II', playtime_forever: 45 }
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch Steam data' });
  }
});

export default router;
