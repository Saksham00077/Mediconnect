import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch /auth/me on mount if token exists
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        setDoctorProfile(data.doctorProfile);
        setPatientProfile(data.patientProfile);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch (err) {
        console.error('Session check failed:', err.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setDoctorProfile(data.doctorProfile);
      setPatientProfile(data.patientProfile);
      toast.success(data.message || 'Welcome back!');
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
      throw err;
    }
  };

  const register = async (registrationData) => {
    try {
      const { data } = await api.post('/auth/register', registrationData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setDoctorProfile(data.doctorProfile);
      setPatientProfile(data.patientProfile);
      toast.success(data.message || 'Account registered successfully!');
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast.error(msg);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setDoctorProfile(null);
    setPatientProfile(null);
    toast.success('Logged out successfully');
  };

  const refreshMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setDoctorProfile(data.doctorProfile);
      setPatientProfile(data.patientProfile);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      console.error('Refresh profile error:', err);
    }
  };

  const value = {
    user,
    token,
    doctorProfile,
    patientProfile,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    refreshMe
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

