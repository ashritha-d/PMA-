import axios from 'axios';

// Separate axios instance for the tenant portal — attaches tenantToken, not
// the regular User token, so the two independent auth types never collide
// on the same shared client (mirrors client-admin's fully separate app,
// scoped down to one instance since this portal lives inside client-user).
const TenantAPI = axios.create({
  baseURL: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api',
});

TenantAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('tenantToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

TenantAPI.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tenantToken');
      localStorage.removeItem('tenant');
      window.location.href = '/tenant-login';
    }
    return Promise.reject(err);
  }
);

export default TenantAPI;
