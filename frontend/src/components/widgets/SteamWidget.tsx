import React, { useEffect, useState } from 'react';
import { Gamepad2, ExternalLink, Sparkles, Clock, Award } from 'lucide-react';

interface SteamWidgetProps {
  title?: string;
  steamId64?: string;
  steamId?: string;
  steamInput?: string;
  displayMode?: 'none' | 'recently_played' | 'top_games' | 'both';
}

export const SteamWidget: React.FC<SteamWidgetProps> = ({
  title = 'Steam Showcase',
  steamId64,
  steamId,
  steamInput,
  displayMode = 'both'
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const targetIdentifier = steamInput || steamId64 || steamId || '76561198000000000';

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/integrations/steam/${encodeURIComponent(targetIdentifier)}`)
      .then(res => {
        if (!res.ok) throw new Error('Steam fetch failed');
        return res.json();
      })
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [targetIdentifier]);

  if (loading) {
    return (
      <div className="nook-panel" style={{ padding: '1.25rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(23,37,53,0.85) 0%, rgba(16,24,34,0.9) 100%)' }}>
        <Sparkles size={22} className="animate-spin" color="#66c0f4" style={{ margin: '0 auto 0.5rem' }} />
        <span style={{ fontSize: '0.85rem', color: '#8f98a0' }}>Loading Steam Showcase...</span>
      </div>
    );
  }

  const player = data?.player;
  const recentlyPlayed = data?.recentlyPlayed || [];
  const topGames = data?.topGames || [];

  const wantRecent = displayMode === 'recently_played' || displayMode === 'both';
  const wantTop = displayMode === 'top_games' || displayMode === 'both';

  // Determine status display details
  const isInGame = player?.inGameTitle || player?.stateMessage?.toLowerCase().includes('in-game');
  const isOnline = player?.personaState > 0 || player?.stateMessage?.toLowerCase() === 'online' || isInGame;
  const statusColor = isInGame ? '#66c0f4' : (isOnline ? '#22c55e' : '#8f98a0');

  return (
    <div
      className="nook-panel"
      style={{
        background: 'linear-gradient(135deg, rgba(23, 37, 53, 0.95) 0%, rgba(16, 24, 34, 0.98) 100%)',
        border: '1px solid rgba(102, 192, 244, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)'
      }}
    >
      {/* Header Bar */}
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Gamepad2 size={20} color="#66c0f4" />
          <span style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.02em' }}>{title}</span>
        </div>
        {player?.profileUrl && (
          <a
            href={player.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#66c0f4',
              opacity: 0.85,
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              textDecoration: 'none',
              transition: 'opacity 0.2s ease'
            }}
          >
            <span>Profile</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* User Info Header Banner */}
      {player && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            marginBottom: displayMode === 'none' ? '0' : '1rem',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '0.75rem',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={player.avatar}
              alt={player.personaName}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: `2px solid ${statusColor}`
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: statusColor,
                border: '2px solid #101822'
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.personaName}
            </div>
            <div style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
              <span>
                {isInGame
                  ? `🎮 In-Game: ${player.inGameTitle || player.stateMessage.replace(/^In-Game:\s*/i, '')}`
                  : (isOnline ? '🟢 Online' : '⚪ Offline')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Games Lists (Recently Played & Top Games) */}
      {displayMode !== 'none' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top 3 Recently Played Games (Past 2 Weeks) */}
          {wantRecent && (
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#66c0f4',
                  marginBottom: '0.45rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Clock size={13} color="#66c0f4" />
                <span>Recently Played (Past 2 Weeks):</span>
              </div>

              {recentlyPlayed.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {recentlyPlayed.slice(0, 3).map((g: any, idx: number) => (
                    <div
                      key={g.appid || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                        <img
                          src={g.icon || g.headerUrl}
                          alt=""
                          style={{ width: '32px', height: '20px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#66c0f4', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                        {g.playtime_2weeks > 0 ? `${g.playtime_2weeks} hrs (2 wks)` : `${g.playtime_forever || 0} hrs total`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem', color: '#8f98a0', textAlign: 'center' }}>
                  No games played in the past 2 weeks 🎮
                </div>
              )}
            </div>
          )}

          {/* Top 3 All-Time Games (Lifetime Played Hours) */}
          {wantTop && (
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#a855f7',
                  marginBottom: '0.45rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Award size={13} color="#a855f7" />
                <span>Top All-Time Games:</span>
              </div>

              {topGames.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {topGames.slice(0, 3).map((g: any, idx: number) => (
                    <div
                      key={g.appid || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.3)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : '#d97706', fontWeight: 800, flexShrink: 0 }}>
                          #{idx + 1}
                        </span>
                        <img
                          src={g.icon || g.headerUrl}
                          alt=""
                          style={{ width: '32px', height: '20px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                        {g.playtime_forever || 0} hrs total
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem', color: '#8f98a0', textAlign: 'center' }}>
                  No lifetime game hours recorded 🎮
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
