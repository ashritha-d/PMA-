import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiHome, FiUsers, FiCalendar, FiDollarSign, FiMessageSquare } from 'react-icons/fi';
import API from '../api/axios';

const COLORS = ['#1a56db', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div>Failed to load dashboard</div>;

  const { stats, recentBookings, recentPayments, monthlyBookings, propertyTypes } = data;

  const STATS_CARDS = [
    { label: 'Total Properties', value: stats.totalProperties, icon: <FiHome />, color: '#dbeafe', iconColor: '#1a56db' },
    { label: 'Total Users', value: stats.totalUsers, icon: <FiUsers />, color: '#d1fae5', iconColor: '#10b981' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: <FiCalendar />, color: '#fef3c7', iconColor: '#f59e0b' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: <FiDollarSign />, color: '#fce7f3', iconColor: '#ec4899' },
    { label: 'Pending Inquiries', value: stats.pendingInquiries, icon: <FiMessageSquare />, color: '#ede9fe', iconColor: '#8b5cf6' },
  ];

  const chartData = monthlyBookings.map(m => ({ name: MONTHS[(m._id.month - 1)], bookings: m.count }));
  const pieData = propertyTypes.map(p => ({ name: p._id, value: p.count }));

  const statusColor = (s) => ({ pending: '#f59e0b', confirmed: '#10b981', rejected: '#ef4444', completed: '#3b82f6', cancelled: '#6b7280' }[s] || '#6b7280');

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
        {STATS_CARDS.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.color, color: s.iconColor }}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="card">
          <div className="card-header"><h3>Monthly Bookings</h3></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="#1a56db" strokeWidth={2.5} dot={{ fill: '#1a56db', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Property Types</h3></div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3>Recent Bookings</h3>
            <Link to="/bookings" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Property</th><th>User</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={b._id}>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.property?.title || '-'}</td>
                    <td>{b.user?.firstName} {b.user?.lastName}</td>
                    <td>{b.visitDate ? new Date(b.visitDate).toLocaleDateString() : 'TBD'}</td>
                    <td><span style={{ background: statusColor(b.status) + '22', color: statusColor(b.status), padding: '3px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>{b.status}</span></td>
                  </tr>
                ))}
                {recentBookings.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>No bookings yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Recent Payments</h3>
            <Link to="/payments" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Property</th><th>User</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recentPayments.map(p => (
                  <tr key={p._id}>
                    <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.property?.title || '-'}</td>
                    <td>{p.user?.firstName}</td>
                    <td style={{ fontWeight: 700 }}>₹{p.amount?.toLocaleString()}</td>
                    <td><span style={{ background: statusColor(p.status) + '22', color: statusColor(p.status), padding: '3px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>{p.status}</span></td>
                  </tr>
                ))}
                {recentPayments.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>No payments yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
