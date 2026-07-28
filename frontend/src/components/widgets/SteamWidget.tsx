import React, { useEffect, useState } from 'react';
import { Gamepad2, ExternalLink, Sparkles } from 'lucide-react';

interface SteamWidgetProps {
  steamId64?: string;
  displayMode?: 'none' | 'recently_played' | 'top_games' | 'both';
}

export const SteamWidget: React.FC<SteamWidgetProps> = ({
  steamId64,
  displayMode = 'both'
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const targetId = steamId64 || '76561198000000000';
    fetch(`/api/integrations/steam/${encodeURIComponent(targetId)}?mode=${displayMode}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [steamId64, displayMode]);

  if (loading) {
    return (
      <div className="nook-panel" style={{ padding: '1rem', textAlign: 'center' }}>
        <Sparkles size={20} className="animate-spin" color="var(--accent-color)" style={{ margin: '0 auto 0.5rem' }} />
        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Loading Steam profile...</span>
      </div>
    );
  }

  const player = data?.player;
  const recentlyPlayed = data?.recentlyPlayed || [];
  const topGames = data?.topGames || [];

  const showRecent = (displayMode === 'recently_played' || displayMode === 'both') && recentlyPlayed.length > 0;
  const showTop = (displayMode === 'top_games' || displayMode === 'both') && topGames.length > 0;

  return (
    <div className="nook-panel">
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Gamepad2 size={20} color="var(--accent-color)" />
          <span>Steam Showcase</span>
        </div>
        {player?.profileUrl && (
          <a
            href={player.profileUrl}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: displayMode === 'none' ? '0' : '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
          <img
            src={player.avatar}
            alt={player.personaName}
            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{player.personaName}</div>
            <div style={{ fontSize: '0.75rem', color: player.personaState ? '#22c55e' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: player.personaState ? '#22c55e' : '#9ca3af' }} />
              <span>{player.personaState ? (player.stateMessage || 'Online / Gaming') : 'Offline'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Render Games Lists according to displayMode */}
      {displayMode !== 'none' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {showRecent && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Top 3 Recently Played (Past 2 Weeks):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {recentlyPlayed.slice(0, 3).map((g: any, idx: number) => (
                  <div
                    key={g.appid || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {g.icon && <img src={g.icon} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />}
                      <span>{g.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                      {g.playtime_2weeks !== undefined ? `${g.playtime_2weeks} hrs (past 2 wks)` : `${g.playtime_forever} hrs total`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showTop && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Top 3 All-Time Games:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {topGames.slice(0, 3).map((g: any, idx: number) => (
                  <div
                    key={g.appid || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 700 }}>#{idx + 1}</span>
                      {g.icon && <img src={g.icon} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />}
                      <span>{g.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      {g.playtime_forever} hrs total
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
