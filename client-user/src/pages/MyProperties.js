import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiPlus, FiHome, FiMapPin, FiEdit2, FiTrash2, FiEye,
  FiSearch, FiFilter, FiTrendingUp, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';
import PropertyForm from '../components/PropertyForm';

const API_BASE = process.env.REACT_APP_API_URL || '';

const statusConfig = {
  Available: { color: '#10b981', bg: '#d1fae5', label: 'Available' },
  Occupied: { color: '#3b82f6', bg: '#dbeafe', label: 'Occupied' },
  'Under Maintenance': { color: '#f59e0b', bg: '#fef3c7', label: 'Maintenance' },
};

const StatCard = ({ icon, label, value, color, bg }) => (
  <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ background: bg, borderRadius: 12, padding: 12, color, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{label}</div>
    </div>
  </div>
);

const MyProperties = () => {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, monthlyIncome: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProperty, setEditProperty] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sort, setSort] = useState('-createdAt');

  const fetchStats = useCallback(async () => {
    try {
      const r = await API.get('/user-properties/my/stats');
      setStats(r.data.stats);
    } catch {}
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('type', filterType);
      if (sort) params.append('sort', sort);
      const r = await API.get(`/user-properties/my?${params.toString()}`);
      setProperties(r.data.properties || []);
    } catch { toast.error('Failed to load properties'); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterType, sort]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/user-properties/${id}`);
      toast.success('Property deleted');
      fetchProperties();
      fetchStats();
    } catch { toast.error('Failed to delete'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await API.put(`/user-properties/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      fetchProperties();
      fetchStats();
    } catch { toast.error('Failed to update status'); }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditProperty(null);
    fetchProperties();
    fetchStats();
  };

  const imgSrc = (p) => {
    const url = p.coverImage || p.images?.[0]?.url;
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE}${url}`;
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <StatCard icon={<FiHome size={22} />} label="Total Properties" value={stats.total} color="var(--primary)" bg="#ede9fe" />
        <StatCard icon={<FiCheckCircle size={22} />} label="Available" value={stats.available} color="#10b981" bg="#d1fae5" />
        <StatCard icon={<FiTrendingUp size={22} />} label="Occupied" value={stats.occupied} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon={<FiAlertCircle size={22} />} label="Monthly Income" value={`₹${(stats.monthlyIncome || 0).toLocaleString()}`} color="#f59e0b" bg="#fef3c7" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
          <input
            className="form-input"
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="">All Statuses</option>
          <option>Available</option>
          <option>Occupied</option>
          <option>Under Maintenance</option>
        </select>
        <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="">All Types</option>
          {['Apartment', 'Villa', 'House', 'Commercial', 'Land', 'Office', 'Shop', 'Other'].map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="form-input" value={sort} onChange={e => setSort(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="-createdAt">Newest First</option>
          <option value="createdAt">Oldest First</option>
          <option value="propertyName">Name A-Z</option>
          <option value="-rentAmount">Highest Rent</option>
        </select>
        <FiFilter style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={() => { setEditProperty(null); setShowForm(true); }}>
          <FiPlus /> Add Property
        </button>
      </div>

      {/* Property Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : properties.length === 0 ? (
        <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏠</div>
          <h3 style={{ marginBottom: 8 }}>No properties yet</h3>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Add your first property to start managing it</p>
          <button className="btn btn-primary" onClick={() => { setEditProperty(null); setShowForm(true); }}>
            <FiPlus style={{ marginRight: 8 }} /> Add First Property
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {properties.map(p => {
            const sc = statusConfig[p.status] || statusConfig.Available;
            const img = imgSrc(p);
            return (
              <div key={p._id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Image */}
                <div style={{ position: 'relative', height: 180, background: 'var(--gray-100)', overflow: 'hidden' }}>
                  {img
                    ? <img src={img} alt={p.propertyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray-300)', flexDirection: 'column', gap: 8 }}>
                        <FiHome size={40} />
                        <span style={{ fontSize: '0.8rem' }}>No Image</span>
                      </div>}
                  <span style={{ position: 'absolute', top: 12, left: 12, background: sc.bg, color: sc.color, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                    {sc.label}
                  </span>
                  <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem' }}>
                    {p.propertyType}
                  </span>
                </div>

                {/* Info */}
                <div style={{ padding: '16px', flex: 1 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.propertyName}</h3>
                  {(p.city || p.state) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 8 }}>
                      <FiMapPin size={13} /> {[p.city, p.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: 12 }}>
                    {p.bedrooms > 0 && <span>🛏 {p.bedrooms} Beds</span>}
                    {p.bathrooms > 0 && <span>🚿 {p.bathrooms} Baths</span>}
                    {p.totalArea && <span>📐 {p.totalArea} sq.ft</span>}
                  </div>
                  {p.rentAmount && (
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem', marginBottom: 8 }}>
                      ₹{p.rentAmount.toLocaleString()}<span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--gray-400)' }}>/mo</span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                    Added {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    to={`/my-properties/${p._id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'var(--gray-100)', color: 'var(--gray-700)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <FiEye size={14} /> View
                  </Link>
                  <button
                    onClick={() => { setEditProperty(p); setShowForm(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#dbeafe', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  >
                    <FiEdit2 size={14} /> Edit
                  </button>
                  {p.status !== 'Available' && (
                    <button
                      onClick={() => handleStatusChange(p._id, 'Available')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#d1fae5', color: '#10b981', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    >
                      ✓ Available
                    </button>
                  )}
                  {p.status !== 'Occupied' && (
                    <button
                      onClick={() => handleStatusChange(p._id, 'Occupied')}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#dbeafe', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                    >
                      🔑 Occupied
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p._id, p.propertyName)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: '#fee2e2', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    <FiTrash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <PropertyForm
          property={editProperty}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditProperty(null); }}
        />
      )}
    </div>
  );
};

export default MyProperties;
