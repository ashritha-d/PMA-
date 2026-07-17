import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTenantAuth } from '../context/TenantAuthContext';

const TenantLogin = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const { login, loading } = useTenantAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(form.email, form.password);
    if (res.success) navigate('/tenant-portal');
  };

  return (
    <div className="auth-page">
      <div style={{ width: '100%', padding: '0 24px' }}>
        <div className="auth-card">
          <div className="auth-logo">
            <div style={{ fontSize: '2rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--primary)' }}>Prop<span style={{ color: 'var(--secondary)' }}>Manage</span></div>
          </div>
          <h2 className="auth-title" style={{ textAlign: 'center' }}>Tenant Portal</h2>
          <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: 32 }}>Sign in to view your lease and pay rent</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" style={{ paddingLeft: 40 }} type="email" required placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input className="form-input" style={{ paddingLeft: 40, paddingRight: 40 }} type={showPass ? 'text' : 'password'} required placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--gray-400)' }}>
            Don't have portal access yet? Ask your property manager for an invite.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TenantLogin;
