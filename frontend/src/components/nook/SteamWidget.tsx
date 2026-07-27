import React, { useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';

interface SteamData {
  player: {
    personaName: string;
    avatar: string;
    personaState: number;
  } | null;
  games: {
    appid: number;
    name: string;
    playtime_2weeks: number;
    playtime_forever: number;
  }[];
}

export const SteamWidget: React.FC<{ steamId?: string }> = ({ steamId = 'demo' }) => {
  const [steamData, setSteamData] = useState<SteamData | null>(null);

  useEffect(() => {
    fetch(`/api/integrations/steam/${steamId}`)
      .then(res => res.json())
      .then(data => setSteamData(data))
      .catch(err => console.error(err));
  }, [steamId]);

  if (!steamData) return null;

  return (
    <div className="nook-panel">
      <div className="nook-panel-header">
        <Gamepad2 size={20} color="#66c0f4" />
        <span style={{ color: '#66c0f4' }}>Steam Gaming Stats</span>
      </div>
      {steamData.player && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.75rem', borderRadius: '10px' }}>
          <img src={steamData.player.avatar} alt="Steam Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #66c0f4' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{steamData.player.personaName}</div>
            <div style={{ fontSize: '0.75rem', color: '#66c0f4' }}>● Online & Gaming</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {steamData.games.map(game => (
          <div key={game.appid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
            <span style={{ fontWeight: 600 }}>{game.name}</span>
            <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>{game.playtime_2weeks}h past 2 wks</span>
          </div>
        ))}
      </div>
    </div>
  );
};
