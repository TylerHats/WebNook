import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  status_message?: string;
  status_emoji?: string;
  role: 'admin' | 'user';
  is_totp_enabled: boolean;
  is_email_verified?: boolean;
  onboarding_completed?: boolean;
  privacy_default?: string;
  reaction_picker_json?: string;
  default_reaction?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
  refreshUser: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('webnook_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('webnook_token');
    if (!savedToken) {
      document.cookie = "token=; path=/; max-age=0;";
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Automatically sync token to browser cookie for media image requests
    document.cookie = `token=${savedToken}; path=/; max-age=604800; SameSite=Lax`;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('webnook_token');
        document.cookie = "token=; path=/; max-age=0;";
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Auth refresh failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('webnook_token', newToken);
    document.cookie = `token=${newToken}; path=/; max-age=604800; SameSite=Lax`;
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('webnook_token');
    document.cookie = "token=; path=/; max-age=0;";
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
