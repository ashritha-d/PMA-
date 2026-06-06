import React, { createContext, useContext, useState } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Welcome back!');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Account created successfully!');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out');
  };

  const updateProfile = async (data) => {
    try {
      const res = await API.put('/auth/profile', data);
      const updated = { ...user, ...res.data.user };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      toast.success('Profile updated');
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
      return { success: false };
    }
  };

  const toggleFavorite = async (propertyId) => {
    if (!user) { toast.error('Please login'); return; }
    try {
      const { data } = await API.post(`/auth/favorites/${propertyId}`);
      const updated = { ...user, favorites: data.favorites };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (err) {
      toast.error('Failed to update favorites');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, toggleFavorite, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
