import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiCalendar, FiLogOut, FiLock, FiClock } from 'react-icons/fi';
import TenantAPI from '../api/tenantAxios';
import { useTenantAuth } from '../context/TenantAuthContext';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '';
const getImgUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_URL}${url}`;
};
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const STATUS_COLOR = { rent: '#10b981', rent_deposit: '#1a56db', maintenance: '#f59e0b', repair: '#f59e0b' };

const TenantPortal = () => {
  const { logout } = useTenantAuth();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    TenantAPI.get('/tenant-portal/me')
      .then(({ data }) => {
        setTenant(data.tenant);
        setPayments(data.payments || []);
        setPayAmount(data.tenant.rentAmount || '');
      })
      .catch(() => toast.error('Failed to load your portal'))
      .finally(() => setLoading(false));
  }, []);

  const handlePayRent = async () => {
    if (!payAmount || Number(payAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay SDK');

      const { data } = await TenantAPI.post('/tenant-portal/razorpay/create-order', { amount: Number(payAmount) });

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'PropManage — Rent Payment',
        description: `Rent payment for ${tenant.propertyId?.title || tenant.propertyCode}`,
        order_id: data.order.id,
        prefill: { name: `${tenant.firstName} ${tenant.lastName}`, email: tenant.email, contact: tenant.mobile },
        theme: { color: '#1a56db' },
        handler: async (response) => {
          try {
            const verifyRes = await TenantAPI.post('/tenant-portal/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success('Payment successful! ' + fmtMoney(payAmount));
              setPayments(prev => [verifyRes.data.transaction, ...prev]);
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => toast.error(`Payment failed: ${response.error.description}`));
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Could not initiate payment');
    } finally {
      setPaying(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await TenantAPI.put('/tenant-portal/change-password', pwForm);
      toast.success('Password updated');
      setShowChangePw(false);
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/tenant-login'); };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!tenant) return null;

  const img = getImgUrl(tenant.propertyId?.images?.[0]?.url);

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: '100vh', paddingTop: 32, paddingBottom: 80 }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>Welcome, {tenant.firstName}</h1>
            <p style={{ color: 'var(--gray-500)' }}>Tenant Portal · {tenant.tenantCode}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowChangePw(v => !v)}><FiLock /> Change Password</button>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}><FiLogOut /> Logout</button>
          </div>
        </div>

        {showChangePw && (
          <div className="card card-body" style={{ marginBottom: 20, maxWidth: 420 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" required value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password (min 8 characters)</label>
                <input className="form-input" type="password" required minLength={8} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwSaving}>{pwSaving ? 'Saving...' : 'Update Password'}</button>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* Lease summary */}
          <div className="card card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FiHome /> Your Lease</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {img && <img src={img} alt="" style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{tenant.propertyId?.title || tenant.propertyCode || 'Property'}</div>
                <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{tenant.propertyId?.address?.city}{tenant.propertyId?.address?.state ? `, ${tenant.propertyId.address.state}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Monthly Rent</div><div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{fmtMoney(tenant.rentAmount)}</div></div>
              <div><div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Deposit</div><div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fmtMoney(tenant.depositAmount)}</div></div>
              <div><div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Lease Start</div><div style={{ fontWeight: 600 }}><FiCalendar size={12} style={{ marginRight: 4 }} />{fmtDate(tenant.leaseStartDate)}</div></div>
              <div><div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Lease End</div><div style={{ fontWeight: 600 }}><FiCalendar size={12} style={{ marginRight: 4 }} />{fmtDate(tenant.leaseEndDate)}</div></div>
            </div>
          </div>

          {/* Pay rent */}
          <div className="card card-body" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1a3a5c)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, background: '#2C6EE8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💳</div>
              <h3 style={{ fontWeight: 700 }}>Pay Rent Online</h3>
            </div>
            <p style={{ opacity: 0.85, fontSize: '0.85rem' }}>Secure payment via Razorpay — cards, UPI, net banking, wallets.</p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Amount (₹)</label>
              <input className="form-input" type="number" min="1" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ background: 'white' }} />
            </div>
            <button className="btn" onClick={handlePayRent} disabled={paying} style={{ background: '#2C6EE8', color: 'white', border: 'none', fontWeight: 700 }}>
              {paying ? 'Opening Razorpay...' : `💳 Pay ${fmtMoney(payAmount)}`}
            </button>
          </div>
        </div>

        {/* Payment history */}
        <div className="card">
          <div className="card-header"><h3>Payment History</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ref #</th><th>Type</th><th>Amount</th><th>Mode</th><th>Date</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{p.finTransRef}</td>
                    <td><span style={{ background: (STATUS_COLOR[p.transactionType] || '#6b7280') + '22', color: STATUS_COLOR[p.transactionType] || '#6b7280', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700 }}>{p.transactionType.replace('_', ' ')}</span></td>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(p.amount)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.paymentMode}</td>
                    <td>{fmtDate(p.transactionDate)}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <div className="icon"><FiClock size={32} /></div>
                      <h4>No payments yet</h4>
                      <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Your rent payments will appear here.</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantPortal;
