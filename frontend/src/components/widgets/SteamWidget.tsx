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

  const minContainerHeight = displayMode === 'none' ? '120px' : (displayMode === 'both' ? '390px' : '260px');

  if (loading) {
    return (
      <div className="nook-panel" style={{ minHeight: minContainerHeight, display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar Skeleton */}
        <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gamepad2 size={20} color="var(--accent-color)" />
            <span style={{ fontWeight: 700 }}>{title}</span>
          </div>
          <Sparkles size={16} className="animate-spin" color="var(--accent-color)" style={{ opacity: 0.8 }} />
        </div>

        {/* User Summary Skeleton Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            marginBottom: displayMode === 'none' ? '0' : '1rem',
            background: 'linear-gradient(135deg, #171a21 0%, #1b2838 100%)',
            padding: '0.75rem',
            borderRadius: '10px',
            border: '1px solid rgba(102, 192, 244, 0.35)'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '110px', height: '15px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.2)', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width: '70px', height: '12px', borderRadius: '4px', background: 'rgba(102, 192, 244, 0.3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>

        {/* Game List Skeleton Placeholders */}
        {displayMode !== 'none' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', flex: 1 }}>
            <div style={{ width: '130px', height: '12px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.15)', marginBottom: '0.2rem' }} />
            <div style={{ height: '34px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)' }} />
            <div style={{ height: '34px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)' }} />
            {displayMode === 'both' && (
              <>
                <div style={{ width: '130px', height: '12px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.15)', marginTop: '0.3rem', marginBottom: '0.2rem' }} />
                <div style={{ height: '34px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)' }} />
              </>
            )}
          </div>
        )}
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
  const statusColor = isInGame ? '#66c0f4' : (isOnline ? '#57cbde' : '#c6d4df');

  // Format 2-week playtime display
  const formatRecentTime = (g: any) => {
    if (g.playtime_2weeks_minutes && g.playtime_2weeks_minutes < 60) {
      return `${g.playtime_2weeks_minutes} mins (2 wks)`;
    }
    if (g.playtime_2weeks && g.playtime_2weeks > 0) {
      return `${g.playtime_2weeks} hrs (2 wks)`;
    }
    return `< 1 hr (2 wks)`;
  };

  return (
    <div className="nook-panel" style={{ minHeight: minContainerHeight }}>
      {/* Header Bar */}
      <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Gamepad2 size={20} color="var(--accent-color)" />
          <span style={{ fontWeight: 700 }}>{title}</span>
        </div>
        {player?.profileUrl && (
          <a
            href={player.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent-color)',
              opacity: 0.85,
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              textDecoration: 'none'
            }}
          >
            <span>Profile</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* User Info Header Banner (Steam Blue Signature Box) */}
      {player && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            marginBottom: displayMode === 'none' ? '0' : '1rem',
            background: 'linear-gradient(135deg, #171a21 0%, #1b2838 100%)',
            padding: '0.75rem',
            borderRadius: '10px',
            border: '1px solid rgba(102, 192, 244, 0.35)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
          }}
        >
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

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.personaName}
            </div>
            <div style={{ fontSize: '0.78rem', color: statusColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
              <span>
                {isInGame
                  ? `🎮 In-Game: ${player.inGameTitle || player.stateMessage.replace(/^In-Game:\s*/i, '')}`
                  : (isOnline ? '🟢 Online' : (player.stateMessage || '⚪ Offline'))}
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
                  opacity: 0.8,
                  marginBottom: '0.45rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Clock size={13} color="var(--accent-color)" />
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
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                        <img
                          src={g.icon || g.headerUrl}
                          alt=""
                          style={{ width: '32px', height: '20px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                        {formatRecentTime(g)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem', opacity: 0.7, textAlign: 'center' }}>
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
                  opacity: 0.8,
                  marginBottom: '0.45rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Award size={13} color="var(--accent-color)" />
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
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 800, flexShrink: 0 }}>
                          #{idx + 1}
                        </span>
                        <img
                          src={g.icon || g.headerUrl}
                          alt=""
                          style={{ width: '32px', height: '20px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.75, fontWeight: 700, flexShrink: 0, marginLeft: '0.5rem' }}>
                        {g.playtime_forever || 0} hrs total
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'rgba(0, 0, 0, 0.15)', padding: '0.65rem', borderRadius: '6px', fontSize: '0.78rem', opacity: 0.7, textAlign: 'center', lineHeight: 1.4 }}>
                  {player?.isPrivateGames ? (
                    <span>🔒 Lifetime games list hidden by Steam account privacy settings.<br/><span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Set "Game details" to Public on Steam to display all-time top games.</span></span>
                  ) : (
                    <span>No lifetime game hours recorded 🎮</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
