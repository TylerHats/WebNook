import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PasswordComplexityIndicator } from '../components/ui/PasswordComplexityIndicator';
import { Shield, Activity, Users, Download, Upload, RefreshCw, Radio, HardDrive, Settings, Save, CheckCircle2, Image, Mail, Trash2, Key, AlertTriangle, X, Power, Send, Gamepad2, Film, BookOpen } from 'lucide-react';

// Render Markdown helper for Release Notes
const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div style={{ lineHeight: 1.6, fontSize: '0.9rem' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: '0.4rem' }} />;

        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} style={{ fontSize: '1rem', fontWeight: 800, margin: '0.75rem 0 0.25rem', color: 'var(--accent-color)' }}>{trimmed.replace('### ', '')}</h4>;
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return <h3 key={idx} style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.85rem 0 0.35rem', color: 'var(--accent-color)' }}>{trimmed.replace(/^#+\s*/, '')}</h3>;
        }

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
        const content = isBullet ? trimmed.replace(/^[-•*]\s*/, '') : trimmed;

        const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);

        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pIdx} style={{ fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={pIdx}>{part.slice(1, -1)}</em>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={pIdx} style={{ background: 'rgba(255,255,255,0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>{part.slice(1, -1)}</code>;
          }
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            return <a key={pIdx} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>{linkMatch[1]}</a>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--accent-color)', fontWeight: 800, flexShrink: 0 }}>•</span>
              <div>{renderedParts}</div>
            </div>
          );
        }

        return <p key={idx} style={{ margin: '0 0 0.35rem' }}>{renderedParts}</p>;
      })}
    </div>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const { token, user, logout } = useAuth();
  const { showToast } = useToast();

  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [channel, setChannel] = useState('stable');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'updater' | 'users' | 'config' | 'integrations'>('metrics');

  const [settings, setSettings] = useState<Record<string, string>>({
    app_name: 'WebNook',
    logo_url: '/branding/logo.png',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_secure: 'false',
    auto_backup_enabled: 'false',
    auto_backup_interval: 'daily'
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  // Modals state
  const [disableModalUser, setDisableModalUser] = useState<any | null>(null);
  const [disableReason, setDisableReason] = useState('');

  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [deleteModalUser, setDeleteModalUser] = useState<any | null>(null);

  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  useEffect(() => {
    if (token && user?.role === 'admin') {
      loadMetrics();
      loadUsers();
      loadBackups();
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

  const loadBackups = () => {
    fetch('/api/admin/backups', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.backups) setBackupsList(data.backups); })
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

  const handleTestIntegration = async (type: 'steam' | 'spotify' | 'apple') => {
    try {
      const res = await fetch(`/api/admin/integrations/test/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `${type.toUpperCase()} integration test passed!`, 'success');
        loadSettings();
      } else {
        showToast(data.error || `${type.toUpperCase()} integration test failed`, 'error');
        loadSettings();
      }
    } catch (e) {
      showToast(`Error testing ${type} integration`, 'error');
    }
  };

  const renderStatusBadge = (statusKey: string, configured: boolean) => {
    const status = settings[statusKey] || (configured ? 'connected' : 'not_configured');
    if (status === 'connected') {
      return <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>🟢 Connected / Working</span>;
    }
    if (status === 'broken') {
      return <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>🔴 Broken / Error</span>;
    }
    return <span style={{ background: 'rgba(255,255,255,0.1)', color: '#aaa', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>⚪ Not Configured</span>;
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetVersion: updateInfo?.targetVersion })
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
        showToast('System configuration saved!', 'success');
      }
    } catch (e) {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to_email: testEmailAddress || user?.email })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to send test email', 'error');
      }
    } catch (e) {
      showToast('Error testing SMTP connection', 'error');
    } finally {
      setIsTestingEmail(false);
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

  const handleDisableSubmit = async () => {
    if (!disableModalUser) return;
    const isCurrentlyDisabled = !!disableModalUser.is_disabled;
    const targetDisabledState = !isCurrentlyDisabled;

    try {
      const res = await fetch(`/api/admin/users/${disableModalUser.id}/disable`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ disabled: targetDisabledState, reason: disableReason })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setDisableModalUser(null);
        setDisableReason('');
        loadUsers();
      } else {
        showToast(data.error || 'Failed to change disable status', 'error');
      }
    } catch (e) {
      showToast('Error updating account status', 'error');
    }
  };

  const handlePasswordResetSubmit = async (manual: boolean) => {
    if (!passwordModalUser) return;
    try {
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(manual ? { new_password: newPassword } : { send_reset_email: true })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setPasswordModalUser(null);
        setNewPassword('');
      } else {
        showToast(data.error || 'Password reset failed', 'error');
      }
    } catch (e) {
      showToast('Error executing password reset', 'error');
    }
  };

  const handleDeleteUserSubmit = async () => {
    if (!deleteModalUser) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteModalUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setDeleteModalUser(null);
        loadUsers();
      } else {
        showToast(data.error || 'Failed to delete user', 'error');
      }
    } catch (e) {
      showToast('Error deleting user', 'error');
    }
  };

  const handleCreateCompressedBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await fetch('/api/admin/backups/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Compressed .tar.gz backup created successfully!', 'success');
        loadBackups();
        loadMetrics();
      } else {
        showToast(data.error || 'Backup creation failed', 'error');
      }
    } catch (e) {
      showToast('Error generating compressed backup archive', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreSubmit = async (filename?: string) => {
    setIsRestoring(true);
    const formData = new FormData();
    if (restoreFile) {
      formData.append('backup_file', restoreFile);
    } else if (filename) {
      formData.append('filename', filename);
    }

    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Backup restored & DB schema migrated!', 'success');
        setRestoreFile(null);
        loadMetrics();
        loadUsers();
      } else {
        showToast(data.error || 'Restore failed', 'error');
      }
    } catch (e) {
      showToast('Error restoring backup', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFactoryResetWipe = async () => {
    if (wipeConfirmInput.toUpperCase() !== 'WIPE') {
      showToast('Please type WIPE to confirm application reset!', 'error');
      return;
    }

    setIsWiping(true);
    try {
      const res = await fetch('/api/admin/system/wipe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Application wiped! Restarting setup...', 'success');
        logout();
        window.location.href = '/setup';
      } else {
        showToast(data.error || 'Wipe failed', 'error');
      }
    } catch (e) {
      showToast('Error completing factory reset', 'error');
    } finally {
      setIsWiping(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
          <p style={{ opacity: 0.7 }}>Manage system performance, release updates, accounts, SMTP emails, compressed backups, and whitelabeling.</p>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'metrics', label: 'System Metrics', icon: Activity },
          { id: 'updater', label: 'Self Updater', icon: Radio },
          { id: 'users', label: 'User Accounts', icon: Users },
          { id: 'config', label: 'Config & System Suite', icon: Settings },
          { id: 'integrations', label: 'Integrations & API Keys', icon: Gamepad2 }
        ].map(t => {
          const IconComponent = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={activeTab === t.id ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
            >
              <IconComponent size={16} style={{ flexShrink: 0 }} />
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
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>Database File Size</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#eab308' }}>{formatBytes(metrics.stats.dbSizeBytes)}</div>
          </div>
          <div className="nook-panel">
            <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>Uploaded Files Size</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a855f7' }}>{formatBytes(metrics.stats.uploadsSizeBytes)}</div>
          </div>
        </div>
      )}

      {/* Tab 2: Release Switcher & Auto Updater */}
      {activeTab === 'updater' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={20} style={{ flexShrink: 0 }} />
              <span>Release Channel & Auto-Update Engine</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{updateInfo.latestRelease?.name || 'Latest Version'}</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '2px' }}>
                      <strong>Channel:</strong> {updateInfo.channel?.toUpperCase()} | <strong>Current:</strong> <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{updateInfo.currentVersion}</code> → <strong>New:</strong> <code style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{updateInfo.targetVersion || updateInfo.latestRelease?.tag}</code>
                    </p>
                  </div>
                  {updateInfo.updateAvailable ? (
                    <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontWeight: 700 }}>Update Available!</span>
                  ) : (
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '20px', opacity: 0.7 }}>Up to Date</span>
                  )}
                </div>
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {renderMarkdown(updateInfo.latestRelease?.notes)}
                </div>

                <div style={{ background: updateInfo.is_docker ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.12)', padding: '1rem', borderRadius: '10px', border: updateInfo.is_docker ? '1px solid #eab308' : '1px solid #3b82f6', fontSize: '0.85rem', lineHeight: 1.6, marginTop: '1rem' }}>
                  🐳 <strong>{updateInfo.is_docker ? 'Docker Environment Detected (UI Self-Update Disabled)' : 'Git Host Installation Environment'}</strong>
                  {updateInfo.is_docker ? (
                    <div style={{ marginTop: '0.4rem' }}>
                      WebNook is running in a Docker container. In-app self-updating via UI is disabled to maintain container immutability. To update WebNook to the latest release:
                      <ol style={{ marginLeft: '1.25rem', marginTop: '0.4rem', marginBottom: 0 }}>
                        <li>Pull the latest Docker image: <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#facc15' }}>docker pull tylerhats/webnook:latest</code></li>
                        <li>Restart your container: <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#facc15' }}>docker compose up -d</code></li>
                        <li><em>WebNook automatically executes all database schema migrations on startup when the container boots!</em></li>
                      </ol>
                    </div>
                  ) : (
                    <p style={{ marginTop: '0.3rem' }}>Applying updates via UI pulls latest code and runs database migrations automatically.</p>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={checkUpdates} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <RefreshCw size={16} style={{ flexShrink: 0 }} />
                <span>Check GitHub Releases</span>
              </button>
              <button
                onClick={handleApplyUpdate}
                className={updateInfo?.updateAvailable && !updateInfo?.is_docker ? 'btn-primary' : 'btn-secondary'}
                disabled={isUpdating || !updateInfo?.updateAvailable || updateInfo?.is_docker}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0,
                  opacity: updateInfo?.updateAvailable && !updateInfo?.is_docker ? 1 : 0.4,
                  cursor: updateInfo?.updateAvailable && !updateInfo?.is_docker ? 'pointer' : 'not-allowed'
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{isUpdating ? 'Updating & Migrating DB...' : updateInfo?.is_docker ? 'Self-Update Disabled in Docker' : updateInfo?.updateAvailable ? 'Apply Update & Pull Code' : 'No Update Available'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: User Accounts Management Suite */}
      {activeTab === 'users' && (
        <div className="nook-panel">
          <div className="nook-panel-header">
            <Users size={20} />
            <span>Registered User Accounts ({usersList.length})</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem' }}>ID</th>
                  <th style={{ padding: '0.6rem' }}>User</th>
                  <th style={{ padding: '0.6rem' }}>Email</th>
                  <th style={{ padding: '0.6rem' }}>Role</th>
                  <th style={{ padding: '0.6rem' }}>Status</th>
                  <th style={{ padding: '0.6rem' }}>Actions</th>
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
                      {u.is_disabled ? (
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                          Disabled
                        </span>
                      ) : (
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#22c55e', color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>
                          Active
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {u.id !== user.id && (
                          <>
                            <button
                              onClick={() => handleToggleRole(u.id, u.role)}
                              className="btn-secondary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              title="Toggle Role"
                            >
                              Role
                            </button>

                            <button
                              onClick={() => { setDisableModalUser(u); setDisableReason(u.disabled_reason || ''); }}
                              className="btn-secondary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: u.is_disabled ? '#22c55e' : '#eab308' }}
                              title={u.is_disabled ? 'Enable Account' : 'Disable Account'}
                            >
                              <Power size={12} />
                              <span>{u.is_disabled ? 'Enable' : 'Disable'}</span>
                            </button>

                            <button
                              onClick={() => { setPasswordModalUser(u); setNewPassword(''); }}
                              className="btn-secondary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                              title="Reset Password"
                            >
                              <Key size={12} />
                              <span>Reset Pass</span>
                            </button>

                            <button
                              onClick={() => setDeleteModalUser(u)}
                              className="btn-secondary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }}
                              title="Delete User"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Combined Config & System Suite */}
      {activeTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Whitelabel Branding Settings */}
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
                <span>Save Whitelabel Settings</span>
              </button>
            </div>
          </div>

          {/* Card 2: SMTP Mail Engine Credentials */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Mail size={20} />
              <span>SMTP Mail Engine Credentials (System Notifications)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>SMTP Host</label>
                <input
                  type="text"
                  placeholder="smtp.example.com"
                  value={settings.smtp_host}
                  onChange={e => setSettings({ ...settings, smtp_host: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>SMTP Port</label>
                <input
                  type="text"
                  placeholder="587"
                  value={settings.smtp_port}
                  onChange={e => setSettings({ ...settings, smtp_port: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>SMTP Username</label>
                <input
                  type="text"
                  placeholder="user@example.com"
                  value={settings.smtp_user}
                  onChange={e => setSettings({ ...settings, smtp_user: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>SMTP Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={settings.smtp_pass}
                  onChange={e => setSettings({ ...settings, smtp_pass: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>From Address</label>
                <input
                  type="email"
                  placeholder="noreply@webnook.local"
                  value={settings.smtp_from}
                  onChange={e => setSettings({ ...settings, smtp_from: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Test Destination Email</label>
                <input
                  type="email"
                  placeholder={user.email}
                  value={testEmailAddress}
                  onChange={e => setTestEmailAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleSaveSettings} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <Save size={16} style={{ flexShrink: 0 }} />
                <span>Save SMTP Settings</span>
              </button>
              <button onClick={handleTestEmail} className="btn-secondary" disabled={isTestingEmail} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <Send size={16} style={{ flexShrink: 0 }} />
                <span>{isTestingEmail ? 'Sending Test Email...' : 'Send Test Email'}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Password Complexity Policy Settings */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <Key size={20} />
              <span>Password Complexity Policy Settings</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Minimum Length</label>
                <input
                  type="number"
                  min={4}
                  max={64}
                  value={settings.pwd_min_length || '8'}
                  onChange={e => setSettings({ ...settings, pwd_min_length: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.pwd_require_uppercase === 'true'}
                    onChange={e => setSettings({ ...settings, pwd_require_uppercase: String(e.target.checked) })}
                  />
                  <span>Require Uppercase (A-Z)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.pwd_require_lowercase === 'true'}
                    onChange={e => setSettings({ ...settings, pwd_require_lowercase: String(e.target.checked) })}
                  />
                  <span>Require Lowercase (a-z)</span>
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.pwd_require_number === 'true'}
                    onChange={e => setSettings({ ...settings, pwd_require_number: String(e.target.checked) })}
                  />
                  <span>Require Number (0-9)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.pwd_require_special === 'true'}
                    onChange={e => setSettings({ ...settings, pwd_require_special: String(e.target.checked) })}
                  />
                  <span>Require Special Character (!@#$)</span>
                </label>
              </div>
            </div>
            <button onClick={handleSaveSettings} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <Save size={16} style={{ flexShrink: 0 }} />
              <span>Save Password Policy</span>
            </button>
          </div>

          {/* Card 3: Compressed Backup & Schema-Aware Restore Suite */}
          <div className="nook-panel">
            <div className="nook-panel-header">
              <HardDrive size={20} />
              <span>Compressed Backup & Schema-Aware Restore Suite</span>
            </div>

            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1.25rem' }}>
              Generate single compressed <code>.tar.gz</code> backup archives containing your SQLite database, uploaded profile images, stickers, and custom branding assets.
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleCreateCompressedBackup} className="btn-primary" disabled={isCreatingBackup}>
                <Download size={18} />
                <span>{isCreatingBackup ? 'Creating Compressed Archive...' : 'Create Compressed Backup (.tar.gz)'}</span>
              </button>
            </div>

            {/* List of Available Local Backups */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Available Local Backup Archives ({backupsList.length})</h4>
              {backupsList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>No local backup archives found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {backupsList.map(b => (
                    <div key={b.filename} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.filename}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{formatBytes(b.sizeBytes)} • {new Date(b.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a href={`/api/admin/backups/download/${b.filename}?token=${token}`} download className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                          <Download size={14} />
                          <span>Download</span>
                        </a>
                        <button onClick={() => handleRestoreSubmit(b.filename)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#3b82f6' }} disabled={isRestoring}>
                          <RefreshCw size={14} />
                          <span>Restore</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Restore File Uploader */}
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Restore Backup File (Automatic Schema Migration)</h4>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="file"
                  accept=".tar.gz,.db"
                  onChange={e => setRestoreFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
                <button onClick={() => handleRestoreSubmit()} className="btn-primary" disabled={!restoreFile || isRestoring}>
                  <Upload size={16} />
                  <span>{isRestoring ? 'Restoring & Migrating DB...' : 'Upload & Restore'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Danger Zone - Factory Reset & Wipe Application */}
          <div className="nook-panel" style={{ border: '1px solid #ef4444' }}>
            <div className="nook-panel-header" style={{ color: '#ef4444' }}>
              <AlertTriangle size={20} />
              <span>Danger Zone: Factory Reset & OOBE Application Wipe</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Wipe all database records (users, nooks, widgets, stickers, guestbooks) and uploaded media files, resetting WebNook to its initial Out-Of-The-Box Experience (OOBE) setup wizard.
            </p>
            <button onClick={() => { setShowWipeModal(true); setWipeConfirmInput(''); }} className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444', alignSelf: 'flex-start' }}>
              <Trash2 size={16} />
              <span>Factory Reset & Wipe Application</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Integrations & API Keys Suite */}
      {activeTab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Steam Integration */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Gamepad2 size={20} style={{ flexShrink: 0 }} />
                <span>Steam Web API Key & Integration</span>
              </div>
              {renderStatusBadge('steam_api_status', !!settings.steam_api_key)}
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.25rem' }}>
              Configure your system-wide Steam API Key to fetch official player summaries and recently played games.
            </p>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Steam Web API Key</label>
                <input
                  type="password"
                  placeholder="32-character hexadecimal key (e.g. 1234567890ABCDEF1234567890ABCDEF)"
                  value={settings.steam_api_key || ''}
                  onChange={e => setSettings({ ...settings, steam_api_key: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--accent-color)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                💡 <strong>Steam API Setup Instructions:</strong>
                <ol style={{ marginLeft: '1.25rem', marginTop: '0.4rem' }}>
                  <li>Log in to Steam and visit <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>steamcommunity.com/dev/apikey</a>.</li>
                  <li>Enter your domain name (e.g. <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>webnook.example.com</code>) and click <strong>Register</strong>.</li>
                  <li>Copy your 32-character API Key into the field above and click <strong>Save Settings</strong>.</li>
                  <li><em>Note: Even without an API key, WebNook automatically falls back to live public profile XML scraping!</em></li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} style={{ flexShrink: 0 }} />
                  <span>Save Steam Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestIntegration('steam')}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={16} style={{ flexShrink: 0 }} />
                  <span>Test Connection</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Spotify Developer Integration */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Radio size={20} style={{ flexShrink: 0 }} />
                <span>Spotify API Credentials (Developer Dashboard)</span>
              </div>
              {renderStatusBadge('spotify_api_status', !!(settings.spotify_client_id && settings.spotify_client_secret))}
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.25rem' }}>
              Optional API keys for fetching top artist picks and Spotify search previews.
            </p>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Spotify Client ID</label>
                  <input
                    type="text"
                    placeholder="Spotify Client ID"
                    value={settings.spotify_client_id || ''}
                    onChange={e => setSettings({ ...settings, spotify_client_id: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Spotify Client Secret</label>
                  <input
                    type="password"
                    placeholder="Spotify Client Secret"
                    value={settings.spotify_client_secret || ''}
                    onChange={e => setSettings({ ...settings, spotify_client_secret: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--accent-color)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                💡 <strong>Spotify Developer App Setup Instructions:</strong>
                <ol style={{ marginLeft: '1.25rem', marginTop: '0.4rem' }}>
                  <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>developer.spotify.com/dashboard</a>.</li>
                  <li>Click <strong>Create App</strong>, set App Name to <em>WebNook Social</em>.</li>
                  <li>In App Settings, add this exact Redirect URI to <strong>Redirect URIs</strong>:
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem', marginBottom: '0.3rem' }}>
                      <code style={{ background: 'rgba(0,0,0,0.4)', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#22c55e', fontFamily: 'monospace', fontSize: '0.8rem', flex: 1, wordBreak: 'break-all' }}>
                        {`${window.location.origin}/api/integrations/spotify/callback`}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/api/integrations/spotify/callback`);
                          showToast('Spotify Callback URI copied to clipboard!', 'info');
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', flexShrink: 0 }}
                      >
                        Copy URI
                      </button>
                    </div>
                  </li>
                  <li>Copy the Client ID and Client Secret into the inputs above and click <strong>Save Spotify Credentials</strong>.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} style={{ flexShrink: 0 }} />
                  <span>Save Spotify Credentials</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestIntegration('spotify')}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={16} style={{ flexShrink: 0 }} />
                  <span>Test Connection</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Apple Music Developer Integration */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Radio size={20} style={{ flexShrink: 0 }} />
                <span>Apple Music Kit Integration</span>
              </div>
              {renderStatusBadge('apple_api_status', !!settings.apple_music_token)}
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.25rem' }}>
              Optional MusicKit developer token for querying the Apple Music catalog.
            </p>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Apple Music Developer Token (JWT)</label>
                <textarea
                  rows={2}
                  placeholder="Bearer eyJhbGciOiJFUzI1NiIs..."
                  value={settings.apple_music_token || ''}
                  onChange={e => setSettings({ ...settings, apple_music_token: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                💡 <strong>Apple Music Setup Instructions:</strong>
                <ol style={{ marginLeft: '1.25rem', marginTop: '0.4rem' }}>
                  <li>Visit <a href="https://developer.apple.com/account/resources/certificates/list" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>developer.apple.com</a> with your Apple Developer Account.</li>
                  <li>Create a MusicKit Key and download the <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>.p8</code> private key file.</li>
                  <li>Generate a MusicKit Developer JWT Token and paste it above.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} style={{ flexShrink: 0 }} />
                  <span>Save Apple Music Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestIntegration('apple')}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={16} style={{ flexShrink: 0 }} />
                  <span>Test Connection</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 4: TMDB (The Movie Database) Integration */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Film size={20} style={{ flexShrink: 0 }} />
                <span>TMDB (The Movie Database) API Integration</span>
              </div>
              {renderStatusBadge('tmdb_api_status', !!settings.tmdb_api_key)}
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '1.25rem' }}>
              Configure your TMDB API Key to search and fetch movie & TV series posters, release dates, and summaries.
            </p>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>TMDB API Key (v3 auth)</label>
                <input
                  type="password"
                  placeholder="32-character TMDB API Key"
                  value={settings.tmdb_api_key || ''}
                  onChange={e => setSettings({ ...settings, tmdb_api_key: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--accent-color)', fontSize: '0.82rem', lineHeight: 1.5 }}>
                💡 <strong>TMDB Setup Instructions:</strong>
                <ol style={{ marginLeft: '1.25rem', marginTop: '0.4rem' }}>
                  <li>Create a free account at <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>themoviedb.org</a>.</li>
                  <li>Go to <strong>Settings → API</strong> and request an API key for Developer / Personal use.</li>
                  <li>Copy your <strong>API Key (v3 auth)</strong> into the field above and click <strong>Save Settings</strong>.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} style={{ flexShrink: 0 }} />
                  <span>Save TMDB Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestIntegration('tmdb' as any)}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={16} style={{ flexShrink: 0 }} />
                  <span>Test Connection</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 5: Books & Open Library Integration */}
          <div className="nook-panel">
            <div className="nook-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={20} style={{ flexShrink: 0 }} />
                <span>Books & Open Library Integration</span>
              </div>
              <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 700 }}>🟢 Active (No API Key Required)</span>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.5rem' }}>
              WebNook's book showcase is powered by <strong>Open Library</strong> (Internet Archive) and StoryGraph CSV importing.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              📖 <strong>Zero-Config Books Search & StoryGraph CSV Import:</strong>
              <p style={{ marginTop: '0.3rem', opacity: 0.85 }}>
                Open Library allows searching millions of public domain and published books out of the box with zero API key configuration! Additionally, users can import their StoryGraph library `.csv` files directly in their Nook Customizer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Disable Account Reason Modal */}
      {disableModalUser && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {disableModalUser.is_disabled ? 'Re-enable Account' : 'Disable Account'} @{disableModalUser.username}
              </h3>
              <button onClick={() => setDisableModalUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {!disableModalUser.is_disabled ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  Disabling an account blocks the user from logging in and sends a styled notification email explaining the reason.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Reason for Disabling Account</label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason (e.g. Terms of Service violation)..."
                    value={disableReason}
                    onChange={e => setDisableReason(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'var(--text-main)', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button onClick={() => setDisableModalUser(null)} className="btn-secondary">Cancel</button>
                  <button onClick={handleDisableSubmit} className="btn-primary" style={{ background: '#ef4444' }}>Disable & Send Notice Email</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Are you sure you want to re-enable account @{disableModalUser.username}?</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button onClick={() => setDisableModalUser(null)} className="btn-secondary">Cancel</button>
                  <button onClick={handleDisableSubmit} className="btn-primary">Enable Account</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password Modal */}
      {passwordModalUser && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Reset Password for @{passwordModalUser.username}</h3>
              <button onClick={() => setPasswordModalUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Option A: Manual Password */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Option 1: Set New Password Manually</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                  <button onClick={() => handlePasswordResetSubmit(true)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    Set Password
                  </button>
                </div>
                <PasswordComplexityIndicator password={newPassword} />
              </div>

              {/* Option B: Send Reset Email */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Option 2: Send Password Reset Email Link</h4>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.75rem' }}>Sends a styled email token link to {passwordModalUser.email}</p>
                <button onClick={() => handlePasswordResetSubmit(false)} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
                  <Mail size={16} />
                  <span>Send Reset Email</span>
                </button>
              </div>

              <button onClick={() => setPasswordModalUser(null)} className="btn-secondary" style={{ alignSelf: 'flex-end' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>Delete User Account @{deleteModalUser.username}</h3>
              <button onClick={() => setDeleteModalUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5, marginBottom: '1.25rem' }}>
              CAUTION: This will permanently delete @<strong>{deleteModalUser.username}</strong>, their Nook profile, widgets, stickers, guestbook entries, and uploaded media files. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setDeleteModalUser(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDeleteUserSubmit} className="btn-primary" style={{ background: '#ef4444' }}>Delete User Entirely</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Factory Reset WIPE Confirmation Modal */}
      {showWipeModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-content" style={{ border: '1px solid #ef4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>Factory Reset & Application Wipe</h3>
              <button onClick={() => setShowWipeModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5, marginBottom: '1rem' }}>
              WARNING: This action will completely erase all database tables, user accounts, Nook customizations, uploaded files, and system settings. The server will restart at the initial OOBE setup wizard.
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: '#ef4444' }}>
                Type "WIPE" to confirm permanent application reset:
              </label>
              <input
                type="text"
                placeholder="WIPE"
                value={wipeConfirmInput}
                onChange={e => setWipeConfirmInput(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--border-radius-btn)', background: 'rgba(0,0,0,0.4)', border: '1px solid #ef4444', color: '#fff', fontSize: '0.9rem', letterSpacing: '1px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setShowWipeModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleFactoryResetWipe} className="btn-primary" style={{ background: '#ef4444' }} disabled={isWiping}>
                {isWiping ? 'Wiping System...' : 'Permanently Wipe System'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
