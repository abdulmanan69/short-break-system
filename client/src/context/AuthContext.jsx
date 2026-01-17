import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';

const AuthContext = createContext();

export const socket = io(SOCKET_URL, { autoConnect: false });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
          setUser(res.data);
          socket.connect(); // Connect if token is valid
      })
      .catch(() => {
          localStorage.removeItem('token');
          socket.disconnect();
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
      socket.disconnect(); // Ensure disconnected if no token
    }
    
    // Listen for force logout
    // ... (rest of listener logic)
  }, []);
  
  // Real-time listener for current user force logout
  useEffect(() => {
      if(!user) return;
      
      const handleForceLogout = (data) => {
          if (data.userId == user.id) {
              alert("You have been logged out by the administrator.");
              performLogout(false); 
          }
      };

      socket.on('force_logout_user', handleForceLogout);
      return () => socket.off('force_logout_user', handleForceLogout);
  }, [user]);

  const login = async (username, password) => {
    try {
        const res = await axios.post(`${API_URL}/api/auth/login`, { username, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        socket.connect(); // Connect on login
        return res.data.user;
    } catch (err) {
        throw err; 
    }
  };

  const performLogout = (callServer = true) => {
      if(callServer && user) {
          axios.post(`${API_URL}/api/auth/logout`, { userId: user.id }).catch(console.error);
      }
      localStorage.removeItem('token');
      setUser(null);
      socket.disconnect(); // Disconnect on logout
  }

  const logout = () => {
      performLogout(true);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);