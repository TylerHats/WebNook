import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Palette, Settings, Shield, LogOut, LogIn, UserPlus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [appName, setAppName] = useState('WebNook');
  const [logoUrl, setLogoUrl] = useState('/branding/logo.png');

  useEffect(() => {
    fetch('/api/branding/public')
      .then(res => res.json())
      .then(data => {
        if (data.app_name) setAppName(data.app_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
        document.title = data.app_name ? `${data.app_name} - Social Platform` : 'WebNook';
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <nav className="webnook-navbar">
      <Link to="/" className="webnook-brand">
        <img
          src={logoUrl}
          alt="Logo"
          style={{ height: '36px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }}
          onError={(e) => {
            // Fallback icon if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span>{appName}</span>
      </Link>

      <div className="webnook-nav-links">
        {user ? (
          <>
            <Link to={`/nook/${user.username}`} className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={18} />
              <span>My Nook</span>
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
    </nav>
  );
};
