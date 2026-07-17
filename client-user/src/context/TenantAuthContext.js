import React, { createContext, useContext, useState } from 'react';
import TenantAPI from '../api/tenantAxios';
import toast from 'react-hot-toast';

// Independent of AuthContext (User) — separate localStorage keys so a
// person can be logged in as both a regular User and a Tenant in the same
// browser without collision, mirroring the separate Admin auth on the
// admin site.
const TenantAuthContext = createContext();

export const TenantAuthProvider = ({ children }) => {
  const [tenant, setTenant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tenant')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await TenantAPI.post('/tenant-portal/login', { email, password });
      localStorage.setItem('tenantToken', data.token);
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
      setTenant(data.tenant);
      toast.success(`Welcome, ${data.tenant.firstName}!`);
      return { success: true };
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('tenantToken');
    localStorage.removeItem('tenant');
    setTenant(null);
    toast.success('Logged out');
  };

  return (
    <TenantAuthContext.Provider value={{ tenant, loading, login, logout, isTenantAuthenticated: !!tenant }}>
      {children}
    </TenantAuthContext.Provider>
  );
};

export const useTenantAuth = () => useContext(TenantAuthContext);
