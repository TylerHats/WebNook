import { Router, Request, Response } from 'express';
import { queryOne } from '../db/connection';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import https from 'https';

const router = Router();

// Helper HTTP JSON GET getter
function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Spotify Aggregate Data endpoint (Proxy / Demo Provider)
router.get('/spotify/top-artists', async (req: Request, res: Response) => {
  try {
    // Return sample/aggregated top artists structure when custom API key is not connected
    const topArtists = [
      { name: 'The Cure', genre: 'Post-Punk / New Wave', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', track: 'Pictures of You' },
      { name: 'Daft Punk', genre: 'French Touch / Electronic', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80', track: 'Digital Love' },
      { name: 'Depeche Mode', genre: 'Synth-Pop', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80', track: 'Enjoy the Silence' },
      { name: 'Gorillaz', genre: 'Alternative / Hip-Hop', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80', track: 'Feel Good Inc.' }
    ];

    return res.json({ artists: topArtists });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch Spotify top artists' });
  }
});

// Steam User Stats & Recent Games endpoint
router.get('/steam/:steamId', async (req: Request, res: Response) => {
  try {
    const { steamId } = req.params;

    // Check system settings for custom Steam API key if provided
    const apiKeyRow = await queryOne<any>('SELECT value FROM system_settings WHERE key = "steam_api_key"');
    const apiKey = apiKeyRow?.value;

    if (apiKey && /^\d{17}$/.test(steamId)) {
      try {
        const gamesRes = await fetchJson(`https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json`);
        const playerRes = await fetchJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`);

        const games = gamesRes.response?.games || [];
        const player = playerRes.response?.players?.[0];

        return res.json({
          player: player ? {
            personaName: player.personaname,
            avatar: player.avatarfull,
            profileUrl: player.profileurl,
            personaState: player.personastate
          } : null,
          games: games.slice(0, 4).map((g: any) => ({
            appid: g.appid,
            name: g.name,
            playtime_2weeks: Math.round(g.playtime_2weeks / 60),
            playtime_forever: Math.round(g.playtime_forever / 60),
            icon: `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          }))
        });
      } catch (apiErr) {
        console.warn('Steam API error, falling back to mock data:', apiErr);
      }
    }

    // Default Fallback Preview Games for Steam Widget
    return res.json({
      player: {
        personaName: 'CyberGamer99',
        avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300&auto=format&fit=crop&q=80',
        personaState: 1
      },
      games: [
        { appid: 1086000, name: "Baldur's Gate 3", playtime_2weeks: 18, playtime_forever: 142, icon: '' },
        { appid: 1091500, name: 'Cyberpunk 2077', playtime_2weeks: 9, playtime_forever: 98, icon: '' },
        { appid: 1145360, name: 'Hades II', playtime_2weeks: 14, playtime_forever: 45, icon: '' }
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch Steam data' });
  }
});

export default router;
