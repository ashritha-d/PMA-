import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiUsers, FiAlertCircle } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  active:  { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  former:  { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
  pending: { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const leaseWarning = (endDate) => {
  if (!endDate) return null;
  const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>Expired</span>;
  if (days <= 30) return <FiAlertCircle size={12} color="#f59e0b" title={`${days} days left`} style={{ marginLeft: 4 }} />;
  return null;
};

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await API.get(`/tenants?${params}`);
      setTenants(data.tenants || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleDelete = async () => {
    try {
      await API.delete(`/tenants/${deleteId}`);
      toast.success('Tenant deleted');
      setDeleteId(null);
      fetchTenants();
    } catch {
      toast.error('Failed to delete tenant');
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">{total} tenant{total !== 1 ? 's' : ''} registered</p>
        </div>
        <Link to="/tenants/new" className="btn btn-primary"><FiPlus /> Add Tenant</Link>
      </div>

      {/* Filters */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
            <FiSearch size={14} />
            <input
              placeholder="Search by name, email, mobile, code, property..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="former">Former</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Code</th>
                  <th>Property</th>
                  <th>Lease Period</th>
                  <th>Rent / Mo</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                          {t.firstName?.[0]?.toUpperCase()}{t.lastName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.salutation} {t.firstName} {t.lastName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{t.email || t.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
                        {t.tenantCode}
                      </span>
                    </td>
                    <td>
                      {t.propertyId ? (
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t.propertyId.title}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{t.propertyCode}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>{t.propertyCode || '—'}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {fmt(t.leaseStartDate)} – {fmt(t.leaseEndDate)}
                        {t.leaseEndDate && leaseWarning(t.leaseEndDate)}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {t.rentAmount ? `₹${t.rentAmount.toLocaleString()}` : '—'}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <div className="td-actions">
                        <button onClick={() => navigate(`/tenants/${t._id}`)} className="btn btn-icon btn-ghost" title="View profile"><FiEye /></button>
                        <button onClick={() => navigate(`/tenants/edit/${t._id}`)} className="btn btn-icon btn-outline" title="Edit"><FiEdit2 /></button>
                        <button onClick={() => setDeleteId(t._id)} className="btn btn-icon btn-danger" title="Delete"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="icon"><FiUsers size={32} /></div>
                        <h4>No tenants found</h4>
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Add your first tenant to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {tenants.length} of {total}</div>
          <div className="pagination-btns">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {deleteId && (
        <div className="confirm-overlay" onClick={() => setDeleteId(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Tenant?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: '0.9rem' }}>
              This will remove the tenant record and free up the linked property. Are you sure?
            </p>
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

export default Tenants;
