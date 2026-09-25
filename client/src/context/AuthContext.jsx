import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext();

const SESSION_KEY = 'exptracker_has_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Fast-path: Only block with a loading screen if this browser previously had a session
  const hasSavedSession = localStorage.getItem(SESSION_KEY) === 'true';
  const [loading, setLoading] = useState(hasSavedSession);

  useEffect(() => {
    let isMounted = true;

    // If there is no previous session recorded, instantly allow rendering without blocking
    if (!hasSavedSession) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await axios.get('/auth/me', { timeout: 8000 });
        if (isMounted) {
          setUser(res.data.user);
          localStorage.setItem(SESSION_KEY, 'true');
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem(SESSION_KEY);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [hasSavedSession]);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem(SESSION_KEY, 'true');
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      localStorage.removeItem(SESSION_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);