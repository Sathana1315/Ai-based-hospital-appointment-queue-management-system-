import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE_URL = 'http://127.0.0.1:8000';

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
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameOrEmail, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username_or_email: usernameOrEmail,
        password: password,
      });
      const { access_token, role, username } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      return { success: true, role };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Login failed';
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
