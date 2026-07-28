import React, { useEffect, useState } from 'react';
import { Gamepad2, ExternalLink, Sparkles } from 'lucide-react';

interface SteamWidgetProps {
  steamId64?: string;
}

export const SteamWidget: React.FC<SteamWidgetProps> = ({ steamId64 }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const targetId = steamId64 || '76561198000000000';
    fetch(`/api/integrations/steam/${targetId}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [steamId64]);

  if (loading) {
    return (
      <div className="nook-panel" style={{ padding: '1rem', textAlign: 'center' }}>
        <Sparkles size={20} className="animate-spin" color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Loading Steam profile...</span>
      </div>
    );
  }

  const player = data?.player;
  const games = data?.games || [];

  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Gamepad2 size={20} color="var(--accent-color)" />
          <span>Steam Showcase</span>
        </div>
        {steamId64 && (
          <a
            href={`https://steamcommunity.com/profiles/${steamId64}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-color)', opacity: 0.8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
          >
            <span>Steam Profile</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {player && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
          <img
            src={player.avatar}
            alt={player.personaName}
            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{player.personaName}</div>
            <div style={{ fontSize: '0.75rem', color: player.personaState ? '#22c55e' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: player.personaState ? '#22c55e' : '#9ca3af' }} />
              <span>{player.personaState ? 'Online / Gaming' : 'Offline'}</span>
            </div>
          </div>
        </div>
      )}

      {games.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Recently Played Games:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {games.map((g: any) => (
              <div
                key={g.appid}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ fontWeight: 600 }}>{g.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                  {g.playtime_2weeks ? `${g.playtime_2weeks} hrs past 2 weeks` : `${g.playtime_forever} hrs total`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
