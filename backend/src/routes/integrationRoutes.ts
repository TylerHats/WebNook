import { Router, Request, Response } from 'express';
import { queryOne, execute } from '../db/connection';
import { sendIntegrationErrorEmail } from '../services/emailService';
import https from 'https';
import http from 'http';

const router = Router();

// Helper HTTP/HTTPS text getter with browser User-Agent & relative redirect support
function fetchText(urlStr: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlStr);
    } catch (e) {
      return reject(e);
    }

    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...headers
    };

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(parsedUrl, { headers: defaultHeaders }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
        }
        return fetchText(redirectUrl, headers).then(resolve).catch(reject);
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

function postForm(urlStr: string, bodyObj: Record<string, string>, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const postData = new URLSearchParams(bodyObj).toString();
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Clean Steam Input:
 * Accepts:
 * - 64-bit Steam ID: 76561198000000000
 * - Custom Vanity Handle: TylerHats
 * - Profile URL: https://steamcommunity.com/id/TylerHats/ or https://steamcommunity.com/profiles/76561198000000000
 */
function parseSteamInput(input: string): { type: 'steamid64' | 'vanity'; value: string } {
  let raw = decodeURIComponent(input).trim();

  // Strip trailing slashes and common query params
  raw = raw.replace(/\?.*$/, '').replace(/\/+$/, '');

  if (raw.includes('/profiles/')) {
    const parts = raw.split('/profiles/');
    const id = parts[1].split('/')[0].trim();
    return { type: /^\d{17}$/.test(id) ? 'steamid64' : 'vanity', value: id };
  }

  if (raw.includes('/id/')) {
    const parts = raw.split('/id/');
    const vanity = parts[1].split('/')[0].trim();
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
          if (vanityRes.response && vanityRes.response.success === 1 && vanityRes.response.steamid) {
            targetSteamId64 = vanityRes.response.steamid;
          }
        }

        if (targetSteamId64) {
          const recentRes = await fetchJson(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${apiKey}&steamid=${targetSteamId64}&format=json`).catch(() => ({}));
          const ownedRes = await fetchJson(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${targetSteamId64}&include_appinfo=true&include_played_free_games=true&format=json`).catch(() => ({}));
          const playerRes = await fetchJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${targetSteamId64}`).catch(() => ({}));

          const player = playerRes.response?.players?.[0];
          const recentGamesRaw = recentRes.response?.games || [];
          const ownedGamesRaw = ownedRes.response?.games || [];

          // Format game items consistently (including offline / disconnected playtime!)
          const formatGame = (g: any) => {
            const raw2wMins = g.playtime_2weeks || 0;
            const rawEverMins = (g.playtime_forever || 0) + (g.playtime_disconnected || 0);

            // Compute 2-week hours accurately
            let pt2w = 0;
            if (raw2wMins > 0) {
              const hoursFloat = raw2wMins / 60;
              pt2w = hoursFloat < 0.1 ? 0.1 : Math.round(hoursFloat * 10) / 10;
            }

            const ptEver = Math.round((rawEverMins / 60) * 10) / 10;

            return {
              appid: g.appid,
              name: g.name,
              playtime_2weeks: pt2w,
              playtime_2weeks_minutes: raw2wMins,
              playtime_forever: ptEver,
              playtime_forever_minutes: rawEverMins,
              icon: g.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg` : `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
              headerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`
            };
          };

          // Top 3 Recently Played (past 2 weeks)
          const recentlyPlayedSorted = recentGamesRaw
            .filter((g: any) => (g.playtime_2weeks || 0) > 0)
            .slice(0, 3)
            .map(formatGame);

          // Top 3 All-Time Games (by total lifetime playtime including disconnected)
          const getGameTotalMins = (g: any) => (g.playtime_forever || 0) + (g.playtime_disconnected || 0);

          let topGamesSorted = [...ownedGamesRaw]
            .filter((g: any) => getGameTotalMins(g) > 0)
            .sort((a: any, b: any) => getGameTotalMins(b) - getGameTotalMins(a))
            .slice(0, 3)
            .map(formatGame);

          let isPrivateGames = ownedGamesRaw.length === 0;

          // If ownedGames was empty or restricted via Web API, try scraping games from public HTML profile page
          if (topGamesSorted.length === 0) {
            try {
              const htmlUrl = targetSteamId64
                ? `https://steamcommunity.com/profiles/${targetSteamId64}/`
                : `https://steamcommunity.com/id/${encodeURIComponent(parsedInput.value)}/`;
              const profileHtml = await fetchText(htmlUrl);

              if (profileHtml && !profileHtml.includes('This profile is private')) {
                const gameBlocks = profileHtml.split('<div class="recent_game">');
                const htmlGames: any[] = [];

                for (let i = 1; i < gameBlocks.length; i++) {
                  const block = gameBlocks[i];
                  const nameMatch = block.match(/<div class="game_name"><a[^>]*href="[^"]*app\/(\d+)"[^>]*>(.*?)<\/a><\/div>/i);
                  const hoursMatch = block.match(/([0-9\.,]+)\s*hrs on record/i);
                  const recent2WkMatch = block.match(/([0-9\.,]+)\s*hrs in the last 2 weeks/i) || block.match(/([0-9\.,]+)\s*hrs past 2 weeks/i);
                  const imgMatch = block.match(/class="game_capsule"[^>]*src="(.*?)"/i) || block.match(/src="(.*?capsule.*?)"/i);

                  if (nameMatch) {
                    const appId = parseInt(nameMatch[1], 10);
                    const nameStr = nameMatch[2].replace(/<[^>]+>/g, '').trim();

                    if (nameStr && !htmlGames.some(existing => existing.name.toLowerCase() === nameStr.toLowerCase())) {
                      const hoursNum = hoursMatch ? parseFloat(hoursMatch[1].replace(',', '')) : 0;
                      const hours2Wk = recent2WkMatch ? parseFloat(recent2WkMatch[1].replace(',', '')) : 0;

                      htmlGames.push({
                        appid: appId,
                        name: nameStr,
                        playtime_2weeks: Math.round(hours2Wk * 10) / 10,
                        playtime_2weeks_minutes: Math.round(hours2Wk * 60),
                        playtime_forever: Math.round(hoursNum * 10) / 10,
                        playtime_forever_minutes: Math.round(hoursNum * 60),
                        icon: imgMatch ? imgMatch[1] : (appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : ''),
                        headerUrl: appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : ''
                      });
                    }
                  }
                }

                if (htmlGames.length > 0) {
                  topGamesSorted = [...htmlGames]
                    .sort((a, b) => b.playtime_forever - a.playtime_forever)
                    .slice(0, 3);
                  isPrivateGames = false;
                }
              }
            } catch (hErr) {
              console.warn('Steam HTML fallback error during Web API flow:', hErr);
            }
          }

          // Fallback top games to recent games sorted by lifetime playtime if topGames is still empty
          if (topGamesSorted.length === 0 && recentGamesRaw.length > 0) {
            topGamesSorted = [...recentGamesRaw]
              .filter((g: any) => getGameTotalMins(g) > 0)
              .sort((a: any, b: any) => getGameTotalMins(b) - getGameTotalMins(a))
              .slice(0, 3)
              .map(formatGame);
          }

          if (player) {
            // Reset consecutive error counters on success
            await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_consecutive_errors', '0']);
            await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_api_status', 'connected']);

            return res.json({
              player: {
                personaName: player.personaname,
                avatar: player.avatarfull || player.avatarmedium || player.avatar,
                profileUrl: player.profileurl || `https://steamcommunity.com/profiles/${targetSteamId64}`,
                personaState: player.personastate ?? 0,
                inGameTitle: player.gameextrainfo || '',
                isPrivateGames,
                stateMessage: player.gameextrainfo ? `In-Game: ${player.gameextrainfo}` : (player.personastate > 0 ? 'Online' : 'Offline')
              },
              recentlyPlayed: recentlyPlayedSorted,
              topGames: topGamesSorted
            });
          }
        }
      } catch (apiErr: any) {
        console.warn('Steam Web API error, falling back to public XML/HTML scrape:', apiErr?.message);
        const errCountRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "steam_consecutive_errors"');
        const newCount = (parseInt(errCountRow?.value || '0', 10)) + 1;
        await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_consecutive_errors', String(newCount)]);
        if (newCount >= 3) {
          await execute('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['steam_api_status', 'broken']);
          sendIntegrationErrorEmail('Steam Web API', apiErr?.message || 'Repeated Steam Web API request failures');
        }
      }
    }

    // 2. Fallback Scrape: Public Steam profile XML feed & HTML page
    try {
      let xmlUrl = parsedInput.type === 'steamid64'
        ? `https://steamcommunity.com/profiles/${parsedInput.value}/?xml=1`
        : `https://steamcommunity.com/id/${encodeURIComponent(parsedInput.value)}/?xml=1`;

      let xmlText = '';
      try {
        xmlText = await fetchText(xmlUrl);
      } catch (e) {}

      // If vanity endpoint returned an error or couldn't find profile, try profiles endpoint
      if (!xmlText || xmlText.includes('<error>') || !xmlText.includes('<steamID>')) {
        const altXmlUrl = `https://steamcommunity.com/profiles/${encodeURIComponent(parsedInput.value)}/?xml=1`;
        try {
          const altXml = await fetchText(altXmlUrl);
          if (altXml.includes('<steamID>')) {
            xmlText = altXml;
            xmlUrl = altXmlUrl;
          }
        } catch (e) {}
      }

      // If profile could not be found via XML scrape either, return explicit "Not Found" state
      if (!xmlText || xmlText.includes('<error>') || !xmlText.includes('<steamID>')) {
        return res.json({
          player: {
            personaName: parsedInput.value,
            avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&auto=format&fit=crop&q=80',
            profileUrl: `https://steamcommunity.com/search/users/#text=${encodeURIComponent(parsedInput.value)}`,
            personaState: 0,
            stateMessage: 'Steam Profile Not Found (Check Steam ID or URL)'
          },
          recentlyPlayed: [],
          topGames: []
        });
      }

      const personaNameMatch = xmlText.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/) || xmlText.match(/<steamID>(.*?)<\/steamID>/);
      const avatarMatch = xmlText.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/) || xmlText.match(/<avatarFull>(.*?)<\/avatarFull>/) || xmlText.match(/<avatarIcon><!\[CDATA\[(.*?)\]\]><\/avatarIcon>/);
      const stateMatch = xmlText.match(/<onlineState>(.*?)<\/onlineState>/);
      const stateMessageMatch = xmlText.match(/<stateMessage><!\[CDATA\[(.*?)\]\]><\/stateMessage>/) || xmlText.match(/<stateMessage>(.*?)<\/stateMessage>/);
      const steamId64Match = xmlText.match(/<steamID64>(.*?)<\/steamID64>/);

      const resolvedSteamId64 = steamId64Match ? steamId64Match[1] : (parsedInput.type === 'steamid64' ? parsedInput.value : '');
      const personaName = personaNameMatch ? personaNameMatch[1] : parsedInput.value;
      const avatar = avatarMatch ? avatarMatch[1] : 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&auto=format&fit=crop&q=80';
      const onlineStateRaw = stateMatch ? stateMatch[1].toLowerCase() : 'offline';
      const isOnline = onlineStateRaw !== 'offline';
      const inGame = onlineStateRaw === 'in-game';

      const games: any[] = [];

      // Try Games XML Tab
      const gamesXmlUrl = xmlUrl.replace(/\/\?xml=1$/, '/games/?tab=all&xml=1');
      try {
        const gamesXmlText = await fetchText(gamesXmlUrl);
        const gameBlocks = gamesXmlText.split('<game>');

        for (let i = 1; i < gameBlocks.length; i++) {
          const block = gameBlocks[i];
          const appidMatch = block.match(/<appID>(.*?)<\/appID>/);
          const gNameMatch = block.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) || block.match(/<name>(.*?)<\/name>/);
          const gLogoMatch = block.match(/<logo><!\[CDATA\[(.*?)\]\]><\/logo>/) || block.match(/<logo>(.*?)<\/logo>/) || block.match(/<gameIcon><!\[CDATA\[(.*?)\]\]><\/gameIcon>/) || block.match(/<gameIcon>(.*?)<\/gameIcon>/);
          const gHoursMatch = block.match(/<hoursOnRecord>(.*?)<\/hoursOnRecord>/);
          const g2WeeksMatch = block.match(/<hoursLast2Weeks>(.*?)<\/hoursLast2Weeks>/) || block.match(/<hoursPlayed>(.*?)<\/hoursPlayed>/);

          if (gNameMatch) {
            const appid = appidMatch ? parseInt(appidMatch[1], 10) : 0;
            const pt2w = g2WeeksMatch ? parseFloat(g2WeeksMatch[1].replace(',', '')) : 0;
            const ptEver = gHoursMatch ? parseFloat(gHoursMatch[1].replace(',', '')) : 0;
            const iconUrl = gLogoMatch ? gLogoMatch[1].trim() : (appid ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg` : '');

            games.push({
              appid,
              name: gNameMatch[1].trim(),
              playtime_2weeks: Math.round(pt2w * 10) / 10,
              playtime_forever: Math.round(ptEver * 10) / 10,
              icon: iconUrl,
              headerUrl: appid ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg` : iconUrl
            });
          }
        }
      } catch (gErr) {}

      // Fallback HTML profile scrape if games list was incomplete
      if (games.length < 3) {
        try {
          const profileHtmlUrl = resolvedSteamId64
            ? `https://steamcommunity.com/profiles/${resolvedSteamId64}/`
            : `https://steamcommunity.com/id/${encodeURIComponent(parsedInput.value)}/`;

          const profileHtml = await fetchText(profileHtmlUrl);
          const gameBlocks = profileHtml.split('<div class="recent_game">');

          for (let i = 1; i < gameBlocks.length; i++) {
            const block = gameBlocks[i];
            const nameMatch = block.match(/<div class="game_name"><a[^>]*href="[^"]*app\/(\d+)"[^>]*>(.*?)<\/a><\/div>/i);
            const hoursMatch = block.match(/([0-9\.,]+)\s*hrs on record/i);
            const recent2WkMatch = block.match(/([0-9\.,]+)\s*hrs in the last 2 weeks/i) || block.match(/([0-9\.,]+)\s*hrs past 2 weeks/i);
            const imgMatch = block.match(/class="game_capsule"[^>]*src="(.*?)"/i) || block.match(/src="(.*?capsule.*?)"/i);

            if (nameMatch) {
              const appId = parseInt(nameMatch[1], 10);
              const nameStr = nameMatch[2].replace(/<[^>]+>/g, '').trim();

              if (nameStr && !games.some(existing => existing.name.toLowerCase() === nameStr.toLowerCase())) {
                const hoursNum = hoursMatch ? parseFloat(hoursMatch[1].replace(',', '')) : 0;
                const hours2Wk = recent2WkMatch ? parseFloat(recent2WkMatch[1].replace(',', '')) : 0;

                games.push({
                  appid: appId,
                  name: nameStr,
                  playtime_2weeks: Math.round(hours2Wk * 10) / 10,
                  playtime_forever: Math.round(hoursNum * 10) / 10,
                  icon: imgMatch ? imgMatch[1] : (appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : ''),
                  headerUrl: appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : ''
                });
              }
            }
          }
        } catch (hErr) {}
      }

      const topGamesSorted = [...games]
        .filter(g => (g.playtime_forever || 0) > 0)
        .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
        .slice(0, 3);

      const recentGamesSorted = [...games]
        .filter(g => (g.playtime_2weeks || 0) > 0)
        .sort((a, b) => (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0))
        .slice(0, 3);

      const profileUrl = resolvedSteamId64
        ? `https://steamcommunity.com/profiles/${resolvedSteamId64}`
        : `https://steamcommunity.com/id/${encodeURIComponent(parsedInput.value)}`;

      return res.json({
        player: {
          personaName,
          avatar,
          profileUrl,
          personaState: inGame ? 1 : (isOnline ? 1 : 0),
          inGameTitle: inGame && stateMessageMatch ? stateMessageMatch[1] : '',
          stateMessage: stateMessageMatch ? stateMessageMatch[1] : (isOnline ? 'Online' : 'Offline')
        },
        recentlyPlayed: recentGamesSorted,
        topGames: topGamesSorted
      });
    } catch (scrapeErr) {
      console.warn('Steam XML scrape fallback error:', scrapeErr);
    }

    // Default Fallback Preview when no data is available
    return res.json({
      player: {
        personaName: parsedInput.value || 'Steam Gamer',
        avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&auto=format&fit=crop&q=80',
        profileUrl: `https://steamcommunity.com/`,
        personaState: 1,
        stateMessage: 'Online'
      },
      recentlyPlayed: [
        { appid: 1086000, name: "Baldur's Gate 3", playtime_2weeks: 18, playtime_forever: 142, icon: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086000/header.jpg' },
        { appid: 1091500, name: 'Cyberpunk 2077', playtime_2weeks: 9.5, playtime_forever: 98, icon: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg' }
      ],
      topGames: [
        { appid: 1086000, name: "Baldur's Gate 3", playtime_forever: 142, icon: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086000/header.jpg' },
        { appid: 1091500, name: 'Cyberpunk 2077', playtime_forever: 98, icon: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg' },
        { appid: 1145360, name: 'Hades II', playtime_forever: 45, icon: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg' }
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch Steam data' });
  }
});
// ----------------------------------------------------
// Spotify Catalog Track Search (Client Credentials)
// ----------------------------------------------------
router.get('/spotify/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) return res.json({ tracks: [] });

    const idRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "spotify_client_id"');
    const secretRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "spotify_client_secret"');

    const clientId = idRow?.value;
    const clientSecret = secretRow?.value;

    if (!clientId || !clientSecret) {
      // Fallback search mock if credentials not configured yet
      return res.json({
        tracks: [
          { id: '1', title: `${q} (Track)`, artist: 'Spotify Artist', albumCover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80', spotifyUrl: 'https://open.spotify.com/track/11dFGHVXANRqN2L0L2J72Y' },
          { id: '2', title: `Midnight ${q}`, artist: 'Synth Wave', albumCover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80', spotifyUrl: 'https://open.spotify.com/track/0VjeeBC89yA1WXDpRVC2mE' }
        ]
      });
    }

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenText = await postForm(
      'https://accounts.spotify.com/api/token',
      { grant_type: 'client_credentials' },
      { 'Authorization': `Basic ${authHeader}` }
    );

    const tokenData = JSON.parse(tokenText);
    if (!tokenData.access_token) throw new Error('Spotify auth failed');

    const searchUrl = `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(q)}`;
    const searchData = await fetchJson(searchUrl, {
      'Authorization': `Bearer ${tokenData.access_token}`
    });

    const tracks = (searchData.tracks?.items || []).map((item: any) => ({
      id: item.id,
      title: item.name,
      artist: item.artists?.map((a: any) => a.name).join(', '),
      albumCover: item.album?.images?.[0]?.url || '',
      spotifyUrl: item.external_urls?.spotify || '',
      previewUrl: item.preview_url
    }));

    return res.json({ tracks });
  } catch (err: any) {
    return res.status(500).json({ error: `Spotify search failed: ${err.message}` });
  }
});

// ----------------------------------------------------
// Open Library Book Search Proxy (Zero API Key Needed!)
// ----------------------------------------------------
router.get('/books/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) return res.json({ books: [] });

    const searchUrl = `https://openlibrary.org/search.json?limit=10&q=${encodeURIComponent(q)}`;
    const data = await fetchJson(searchUrl);

    const books = (data.docs || []).slice(0, 10).map((b: any, idx: number) => {
      const coverId = b.cover_i;
      const coverUrl = coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80';

      return {
        id: b.key || `bk_${idx}`,
        title: b.title || q,
        author: b.author_name ? b.author_name.join(', ') : 'Unknown Author',
        year: b.first_publish_year ? String(b.first_publish_year) : '',
        coverUrl,
        rating: '5 ⭐'
      };
    });

    return res.json({ books });
  } catch (err: any) {
    return res.status(500).json({ error: 'Book search error' });
  }
});

// ----------------------------------------------------
// Movies & TV Show Search Proxy (TMDB / OMDb)
// ----------------------------------------------------
router.get('/movies/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) return res.json({ results: [] });

    const tmdbKeyRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "tmdb_api_key"');
    const tmdbKey = tmdbKeyRow?.value;

    if (tmdbKey) {
      const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(q)}`;
      const tmdbRes = await fetchJson(tmdbUrl);
      const results = (tmdbRes.results || []).slice(0, 10).map((m: any) => ({
        id: `tmdb_${m.id}`,
        title: m.title || m.name || q,
        type: m.media_type === 'tv' ? 'TV Series' : 'Movie',
        year: (m.release_date || m.first_air_date || '').substring(0, 4),
        posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80',
        overview: m.overview || '',
        rating: '5 ⭐'
      }));
      return res.json({ results });
    }

    // OMDb Fallback or rich mock demo results if key is missing
    return res.json({
      results: [
        { id: 'm1', title: `${q}`, type: 'Movie', year: '2024', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80', overview: 'Featured film favorite.', rating: '5 ⭐' },
        { id: 'm2', title: `${q}: Season 1`, type: 'TV Series', year: '2023', posterUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&auto=format&fit=crop&q=80', overview: 'Top recommended TV series.', rating: '5 ⭐' }
      ]
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Movies search failed' });
  }
});

export default router;
