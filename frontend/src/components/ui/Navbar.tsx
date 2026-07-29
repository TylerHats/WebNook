import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Palette, Settings, Shield, LogOut, LogIn, UserPlus, Users, Menu, X } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [appName, setAppName] = useState('WebNook');
  const [logoUrl, setLogoUrl] = useState('/branding/logo.png');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/branding/public')
      .then(res => res.json())
      .then(data => {
        if (data.app_name) setAppName(data.app_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
        
        // Dynamically set Document Title & Favicon
        document.title = data.app_name ? `${data.app_name} - Social Platform` : 'WebNook';
        const favicon = document.getElementById('favicon') as HTMLLinkElement;
        if (favicon && data.logo_url) {
          favicon.href = data.logo_url;
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <nav className="webnook-navbar">
      <Link to="/" className="webnook-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <img
          src={logoUrl}
          alt={appName}
          style={{ height: '36px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span>{appName}</span>
      </Link>

      {/* Desktop Links */}
      <div className="webnook-nav-links webnook-nav-links-desktop">
        {user ? (
          <>
            <Link to={`/nook/${user.username}`} className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={18} />
              <span>My Nook</span>
            </Link>
            <Link to="/friends" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={18} />
              <span>Friends</span>
            </Link>
            <Link to="/customize" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Palette size={18} />
              <span>Customizer</span>
            </Link>
            <Link to="/settings" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Settings size={18} />
              <span>Settings</span>
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-color)' }}>
                <Shield size={18} />
                <span>Admin</span>
              </Link>
            )}
            <NotificationDropdown />
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogIn size={18} />
              <span>Login</span>
            </Link>
            <Link to="/register" className="btn-primary">
              <UserPlus size={18} />
              <span>Sign Up</span>
            </Link>
          </>
        )}
      </div>

      {/* Mobile Hamburger Menu Toggle & Dropdown */}
      <div className="webnook-nav-mobile-toggle" style={{ display: 'none', alignItems: 'center', gap: '0.5rem', position: 'relative' }} ref={mobileMenuRef}>
        {user && <NotificationDropdown />}
        <button
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          className="btn-secondary"
          style={{ padding: '0.45rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.75rem)',
              right: 0,
              width: '240px',
              background: 'var(--bg-panel-solid, #1e1e2e)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              zIndex: 9999
            }}
          >
            {user ? (
              <>
                <Link to={`/nook/${user.username}`} className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem' }}>
                  <User size={18} color="var(--accent-color)" />
                  <span>My Nook</span>
                </Link>
                <Link to="/friends" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem' }}>
                  <Users size={18} color="var(--accent-color)" />
                  <span>Friends</span>
                </Link>
                <Link to="/customize" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem' }}>
                  <Palette size={18} color="var(--accent-color)" />
                  <span>Customizer</span>
                </Link>
                <Link to="/settings" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem' }}>
                  <Settings size={18} color="var(--accent-color)" />
                  <span>Settings</span>
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', color: 'var(--accent-color)' }}>
                    <Shield size={18} />
                    <span>Admin Panel</span>
                  </Link>
                )}
                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.2rem 0' }} />
                <button
                  onClick={() => { setIsMobileMenuOpen(false); logout(); navigate('/login'); }}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.8rem', fontSize: '0.9rem' }}
                >
                  <LogOut size={16} />
                  <span>Logout (@{user.username})</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem' }}>
                  <LogIn size={18} color="var(--accent-color)" />
                  <span>Login</span>
                </Link>
                <Link to="/register" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.3rem' }}>
                  <UserPlus size={18} />
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
