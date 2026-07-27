import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Shield, Activity, Users, Download, Upload, RefreshCw, Radio, HardDrive, Settings, Save, CheckCircle2, Image } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [channel, setChannel] = useState('stable');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'updater' | 'users' | 'backups' | 'settings'>('metrics');

  const [settings, setSettings] = useState<Record<string, string>>({
    app_name: 'WebNook',
    logo_url: '/branding/logo.png',
    steam_api_key: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: ''
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      loadMetrics();
      loadUsers();
      checkUpdates();
      loadSettings();
    }
  }, [token, user]);

  const loadMetrics = () => {
    fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error(err));
  };

  const loadUsers = () => {
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.users) setUsersList(data.users); })
      .catch(err => console.error(err));
  };

  const checkUpdates = () => {
    fetch('/api/admin/update/check', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setUpdateInfo(data);
        if (data.channel) setChannel(data.channel);
      })
      .catch(err => console.error(err));
  };

  const loadSettings = () => {
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.settings) setSettings(prev => ({ ...prev, ...data.settings })); })
      .catch(err => console.error(err));
  };

  const handleChangeChannel = async (newChannel: string) => {
    setChannel(newChannel);
    try {
      const res = await fetch('/api/admin/update/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channel: newChannel })
      });
      if (res.ok) {
        showToast(`Update channel set to ${newChannel}`, 'info');
        checkUpdates();
      }
    } catch (e) {
      showToast('Failed to change update channel', 'error');
    }
  };

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/update/apply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        checkUpdates();
        loadMetrics();
      } else {
        showToast(data.error || 'Update failed', 'error');
      }
    } catch (e) {
      showToast('Error executing update', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings })
      });
      if (res.ok) {
        showToast('Whitelabel & system settings saved!', 'success');
        window.location.reload();
      }
    } catch (e) {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleLogoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoFile || !token) return;

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const res = await fetch('/api/admin/branding/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Branding logo uploaded successfully!', 'success');
        setSettings(prev => ({ ...prev, logo_url: data.logo_url }));
        setLogoFile(null);
      } else {
        showToast(data.error || 'Failed to upload logo', 'error');
      }
    } catch (err) {
      showToast('Error uploading logo file', 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleToggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showToast('User role updated', 'success');
        loadUsers();
      }
    } catch (e) {
      showToast('Failed to update role', 'error');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Admin Access Denied</h2>
        <p>You must be an administrator to access the system suite.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={28} color="var(--accent-color)" />
            <span>{settings.app_name || 'WebNook'} Administration Suite</span>
          </h1>
          <p style={{ opacity: 0.7 }}>Manage performance, system self-updates, database backups, and whitelabel branding.</p>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'metrics', label: 'System Metrics', icon: Activity },
          { id: 'updater', label: 'Self Updater', icon: Radio },
          { id: 'users', label: 'User Accounts', icon: Users },
          { id: 'backups', label: 'Backup & Restore', icon: HardDrive },
          { id: 'settings', label: 'Whitelabel & Config', icon: Settings }
        ].map(t => {
          const IconComponent = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={activeTab === t.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              <IconComponent size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: System Metrics */}
      {activeTab === 'metrics' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="nook-panel">
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>Total Registered Users</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-color)' }}>{metrics.stats.totalUsers}</div>
          </div>
          <div className="nook-panel">
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>Total Active Nooks</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e' }}>{metrics.stats.totalNooks}</div>
          </div>
          <div className="nook-panel">
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>Database Schema Version</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>v{metrics.stats.dbVersion}</div>
          </div>
          <div className="nook-panel">
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>Memory Usage</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#eab308' }}>{metrics.system.memoryUsagePercent}%</div>
          </div>
        </div>
      )}

      {/* Tab 2: Release Switcher & Auto Updater */}
      {activeTab === 'updater' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Radio size={20} />
              <span>PolyPress Release Channel & Auto-Update</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 600 }}>Active Release Channel:</span>
              {['stable', 'beta', 'alpha'].map(ch => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', textTransform: 'capitalize', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="channel"
                    value={ch}
                    checked={channel === ch}
                    onChange={() => handleChangeChannel(ch)}
                  />
                  <span>{ch}</span>
                </label>
              ))}
            </div>

            {updateInfo && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{updateInfo.latestRelease?.name || 'Latest Version'}</h3>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Channel: {updateInfo.channel?.toUpperCase()} | Current: {updateInfo.currentVersion}</p>
                  </div>
                  {updateInfo.updateAvailable && (
                    <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>Update Available!</span>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.5 }}>
                  {updateInfo.latestRelease?.notes}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={checkUpdates} className="btn-secondary">
                <RefreshCw size={16} />
                <span>Check GitHub Releases</span>
              </button>
              <button onClick={handleApplyUpdate} className="btn-primary" disabled={isUpdating}>
                <CheckCircle2 size={16} />
                <span>{isUpdating ? 'Updating & Migrating DB...' : 'Apply Update & Migrate Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: User Accounts */}
      {activeTab === 'users' && (
        <div className="nook-panel">
          <div className="nook-panel-header">
            <Users size={20} />
            <span>Registered Users ({usersList.length})</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem' }}>ID</th>
                <th style={{ padding: '0.6rem' }}>Username</th>
                <th style={{ padding: '0.6rem' }}>Email</th>
                <th style={{ padding: '0.6rem' }}>Role</th>
                <th style={{ padding: '0.6rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.6rem' }}>#{u.id}</td>
                  <td style={{ padding: '0.6rem', fontWeight: 600 }}>@{u.username}</td>
                  <td style={{ padding: '0.6rem', opacity: 0.8 }}>{u.email}</td>
                  <td style={{ padding: '0.6rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: u.role === 'admin' ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem' }}>
                    {u.id !== user.id && (
                      <button onClick={() => handleToggleRole(u.id, u.role)} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                        Toggle Role
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Backup & Restore */}
      {activeTab === 'backups' && (
        <div className="nook-panel">
          <div className="nook-panel-header">
            <HardDrive size={20} />
            <span>Database Backup & Export</span>
          </div>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.25rem' }}>
            Download a single-file SQLite database backup containing all Nooks, stickers, widgets, and user accounts.
          </p>
          <a href={`/api/admin/backup/export?token=${token}`} download className="btn-primary">
            <Download size={18} />
            <span>Download Database Backup</span>
          </a>
        </div>
      )}

      {/* Tab 5: Whitelabel Branding & System Settings */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Whitelabel Branding Card */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Image size={20} />
              <span>Whitelabel Branding Settings</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Application Name</label>
                <input
                  type="text"
                  value={settings.app_name}
                  onChange={e => setSettings({ ...settings, app_name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Current Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '10px', width: 'fit-content' }}>
                  <img src={settings.logo_url} alt="Logo" style={{ height: '48px', maxWidth: '200px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{settings.logo_url}</span>
                </div>
              </div>

              <form onSubmit={handleLogoUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Upload New Logo Image (PNG / JPG / SVG)</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setLogoFile(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <button type="submit" className="btn-primary" disabled={!logoFile || isUploadingLogo}>
                    <Upload size={16} />
                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                  </button>
                </div>
              </form>

              <button onClick={handleSaveSettings} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                <Save size={16} />
                <span>Save Application Name</span>
              </button>
            </div>
          </div>

          {/* Steam & System Integrations Card */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Settings size={20} />
              <span>Integrations & API Keys</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Steam Web API Key</label>
                <input
                  type="text"
                  placeholder="Enter Steam Web API Key"
                  value={settings.steam_api_key}
                  onChange={e => setSettings({ ...settings, steam_api_key: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              <button onClick={handleSaveSettings} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                <Save size={16} />
                <span>Save API Keys</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
