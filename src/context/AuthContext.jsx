// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user has a valid session on load
    const verifySession = async () => {
      try {
        const data = await apiClient('/auth/me', "GET");
        setUser(data.username);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const logout = async() => {
    try {
        const data = await apiClient('/auth/logout', "POST");
        setUser(null);
      } catch (error) {} finally {
        setLoading(false);
      }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);