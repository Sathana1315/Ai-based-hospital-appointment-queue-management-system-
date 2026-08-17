import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// In production, use VITE_API_BASE_URL or VITE_API_URL from environment
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // If running on localhost/127.0.0.1 in dev
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8000';
    }
    // If running on the deployed Render frontend, default directly to the deployed Render backend
    if (window.location.hostname.includes('onrender.com')) {
      return 'https://ai-based-hospital-appointment-queue-vgxx.onrender.com';
    }
    return window.location.origin;
  }
  return 'https://ai-based-hospital-appointment-queue-vgxx.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/auth/me`, { timeout: 6000 });
      setUser(response.data);
    } catch (error) {
      console.warn('[Q-Med Auth] Session token validation failed, redirecting to login:', error?.message);
      // Cleanly clear invalid token
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameOrEmail, password) => {
    console.log(`[Q-Med Auth] Attempting login to ${API_BASE_URL}/auth/login for user: ${usernameOrEmail}`);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username_or_email: usernameOrEmail,
        password: password,
      }, {
        timeout: 10000
      });
      const { access_token, role, username } = response.data;
      console.log(`[Q-Med Auth] Login successful. Role: ${role}, User: ${username}`);
      localStorage.setItem('token', access_token);
      setToken(access_token);
      return { success: true, role };
    } catch (error) {
      console.error('[Q-Med Auth] Login request failed:', {
        url: `${API_BASE_URL}/auth/login`,
        status: error.response?.status,
        statusText: error.response?.statusText,
        code: error.code,
        message: error.message,
        detail: error.response?.data?.detail
      });

      let errorMsg = 'Login failed. Please check your credentials.';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMsg = 'Server response timed out. Please check your connection and try again.';
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMsg = `Cannot connect to server at ${API_BASE_URL}. Please verify your backend deployment.`;
      }
      return { success: false, error: errorMsg };
    }
  };

  const googleLogin = async (credential) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/google`, {
        credential: credential,
      });
      const { access_token, role, username } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      return { success: true, role };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Google login failed. Please try again.';
      return { success: false, error: errorMsg };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Registration failed';
      return { success: false, error: errorMsg };
    }
  };

  const initGuest = async (district) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/guest/init`, { district });
      const { access_token, guest_id, role } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      return { success: true, guestId: guest_id };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Guest initialization failed';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, googleLogin, register, initGuest, logout, API_BASE_URL }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
