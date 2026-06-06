import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiCalendar, FiHeart, FiDollarSign, FiUser, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ bookings: 0, favorites: 0, payments: 0, inquiries: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/bookings/my'),
      API.get('/auth/favorites'),
      API.get('/payments/my'),
      API.get('/inquiries/my'),
    ]).then(([b, f, p, i]) => {
      setStats({ bookings: b.data.bookings?.length || 0, favorites: f.data.favorites?.length || 0, payments: p.data.payments?.length || 0, inquiries: i.data.inquiries?.length || 0 });
      setRecentBookings(b.data.bookings?.slice(0, 5) || []);
      setRecentPayments(p.data.payments?.slice(0, 5) || []);
    }).finally(() => setLoading(false));
  }, []);

  const statusColor = (s) => ({ pending: '#f59e0b', confirmed: '#10b981', rejected: '#ef4444', completed: '#3b82f6', cancelled: '#6b7280' }[s] || '#6b7280');

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '40px 0' }}>
      <div className="container">
        {/* Welcome */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome back, {user?.firstName}! 👋</h1>
          <p style={{ color: 'var(--gray-500)', marginTop: 4 }}>Here's an overview of your activity</p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 40 }}>
          {[
            { icon: <FiCalendar size={24} />, label: 'Bookings', value: stats.bookings, color: '#dbeafe', link: '/bookings' },
            { icon: <FiHeart size={24} />, label: 'Saved Properties', value: stats.favorites, color: '#fee2e2', link: '/favorites' },
            { icon: <FiDollarSign size={24} />, label: 'Payments', value: stats.payments, color: '#d1fae5', link: '/payments' },
            { icon: <FiMessageSquare size={24} />, label: 'Inquiries', value: stats.inquiries, color: '#fef3c7', link: '/contact' },
          ].map((s, i) => (
            <Link to={s.link} key={i} style={{ textDecoration: 'none' }}>
              <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ background: s.color, borderRadius: 12, padding: 12, color: 'var(--primary)' }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{s.value}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{s.label}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid-2">
          {/* Recent Bookings */}
          <div className="card">
            <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Recent Bookings</h3>
              <Link to="/bookings" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>View All</Link>
            </div>
            <div style={{ padding: 24 }}>
              {recentBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>No bookings yet</div>
              ) : recentBookings.map(b => (
                <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.property?.title || 'Property'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>{b.visitDate ? new Date(b.visitDate).toLocaleDateString() : 'TBD'}</div>
                  </div>
                  <span style={{ background: statusColor(b.status) + '22', color: statusColor(b.status), padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{b.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card">
            <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700 }}>Recent Payments</h3>
              <Link to="/payments" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>View All</Link>
            </div>
            <div style={{ padding: 24 }}>
              {recentPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>No payments yet</div>
              ) : recentPayments.map(p => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>₹{p.amount?.toLocaleString()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>{p.paymentType?.replace('_', ' ')}</div>
                  </div>
                  <span style={{ background: statusColor(p.status) + '22', color: statusColor(p.status), padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/properties" className="btn btn-primary"><FiHome /> Browse Properties</Link>
            <Link to="/bookings" className="btn btn-outline"><FiCalendar /> My Bookings</Link>
            <Link to="/favorites" className="btn btn-outline"><FiHeart /> Saved Properties</Link>
            <Link to="/profile" className="btn btn-outline"><FiUser /> Edit Profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
