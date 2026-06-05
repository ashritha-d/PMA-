import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiMapPin, FiX } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const statusColor = (s) => ({ pending: '#f59e0b', confirmed: '#10b981', rejected: '#ef4444', completed: '#3b82f6', cancelled: '#6b7280' }[s] || '#6b7280');

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/bookings/my').then(r => setBookings(r.data.bookings || [])).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await API.delete(`/bookings/${id}`);
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled');
    } catch { toast.error('Failed to cancel'); }
  };

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '40px 0' }}>
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>My Bookings</h1>
          <p style={{ color: 'var(--gray-500)' }}>Track all your property visit requests</p>
        </div>
        {loading ? <div className="loading-screen"><div className="spinner" /></div> : bookings.length === 0 ? (
          <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>📅</div>
            <h3>No bookings yet</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Browse properties and schedule a visit</p>
            <Link to="/properties" className="btn btn-primary">Browse Properties</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookings.map(b => (
              <div key={b._id} className="card card-body" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                {b.property?.images?.[0] && <img src={b.property.images[0].url} alt="" style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{b.property?.title || 'Property'}</div>
                  {b.property?.address && <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', display: 'flex', gap: 4, alignItems: 'center' }}><FiMapPin size={12} /> {b.property.address.city}</div>}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.85rem', color: 'var(--gray-500)', flexWrap: 'wrap' }}>
                    <span><FiCalendar size={12} style={{ verticalAlign: 'middle' }} /> {b.visitDate ? new Date(b.visitDate).toLocaleDateString() : 'TBD'}</span>
                    {b.visitTime && <span>🕐 {b.visitTime}</span>}
                    <span>ID: {b.bookingId}</span>
                  </div>
                  {b.adminNote && <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--gray-600)' }}>Note: {b.adminNote}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <span style={{ background: statusColor(b.status) + '22', color: statusColor(b.status), padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize' }}>{b.status}</span>
                  {b.status === 'pending' && (
                    <button onClick={() => handleCancel(b._id)} className="btn btn-sm" style={{ background: '#fee2e2', color: '#ef4444' }}><FiX size={12} /> Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
