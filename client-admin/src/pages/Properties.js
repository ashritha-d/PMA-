import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiStar, FiSearch, FiEye } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const formatPrice = (p) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : p >= 100000 ? `₹${(p / 100000).toFixed(1)}L` : `₹${p?.toLocaleString()}`;

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ type: '', status: '', listingType: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.set('search', search);
      Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
      const { data } = await API.get(`/properties?${params}&isActive=true`);
      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProperties(); }, [page, search, filter]);

  const handleDelete = async () => {
    try {
      await API.delete(`/properties/${deleteId}`);
      toast.success('Property removed');
      setDeleteId(null);
      fetchProperties();
    } catch { toast.error('Failed to delete'); }
  };

  const toggleFeatured = async (id, current) => {
    try {
      await API.patch(`/properties/${id}/featured`, { isFeatured: !current });
      setProperties(prev => prev.map(p => p._id === id ? { ...p, isFeatured: !current } : p));
      toast.success(current ? 'Removed from featured' : 'Marked as featured');
    } catch { toast.error('Failed'); }
  };

  const statusColor = { available: '#10b981', rented: '#1a56db', sold: '#f59e0b', maintenance: '#ef4444' };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Properties</h1><p className="page-subtitle">{total} properties total</p></div>
        <Link to="/properties/new" className="btn btn-primary"><FiPlus /> Add Property</Link>
      </div>

      {/* Filters */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <FiSearch size={14} />
            <input placeholder="Search properties..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
            <option value="">All Types</option>
            {['apartment','villa','commercial','office','plot','pg'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filter.listingType} onChange={e => setFilter({ ...filter, listingType: e.target.value })}>
            <option value="">Rent/Sale</option>
            <option value="rent">For Rent</option>
            <option value="sale">For Sale</option>
          </select>
          <select className="form-select" style={{ width: 'auto' }} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Status</option>
            {['available','rented','sold','maintenance'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Views</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.images?.[0] && <img src={p.images[0].url} alt="" style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{p.propertyCode}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-primary">{p.type}</span></td>
                    <td style={{ fontWeight: 700 }}>{formatPrice(p.price)}</td>
                    <td>{p.address?.city}</td>
                    <td><span style={{ background: (statusColor[p.status] || '#6b7280') + '22', color: statusColor[p.status] || '#6b7280', padding: '3px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>{p.status}</span></td>
                    <td>
                      <button onClick={() => toggleFeatured(p._id, p.isFeatured)} className="btn-icon btn" style={{ background: p.isFeatured ? '#fef3c7' : 'var(--gray-100)', color: p.isFeatured ? '#f59e0b' : 'var(--gray-400)' }}>
                        <FiStar fill={p.isFeatured ? '#f59e0b' : 'none'} />
                      </button>
                    </td>
                    <td style={{ color: 'var(--gray-500)' }}>{p.views || 0}</td>
                    <td>
                      <div className="td-actions">
                        <a href={`http://localhost:3000/properties/${p._id}`} target="_blank" rel="noreferrer" className="btn btn-icon btn-ghost" title="View on site"><FiEye /></a>
                        <button onClick={() => navigate(`/properties/edit/${p._id}`)} className="btn btn-icon btn-outline" title="Edit"><FiEdit2 /></button>
                        <button onClick={() => setDeleteId(p._id)} className="btn btn-icon btn-danger" title="Delete"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {properties.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="icon">🏠</div><h4>No properties found</h4></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {properties.length} of {total}</div>
          <div className="pagination-btns">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => <button key={n} className={page === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <div className="confirm-overlay" onClick={() => setDeleteId(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Property?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: '0.9rem' }}>This action will hide the property from the user website. Are you sure?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;
