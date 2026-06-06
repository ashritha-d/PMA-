import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiUser, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const statusDot = (isActive) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: isActive ? '#d1fae5' : '#fee2e2',
    color: isActive ? '#065f46' : '#991b1b',
    padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700,
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#10b981' : '#ef4444', display: 'inline-block' }} />
    {isActive ? 'Active' : 'Inactive'}
  </span>
);

const Owners = () => {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await API.get(`/owners?${params}`);
      setOwners(data.owners || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Failed to load owners');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  const handleDelete = async () => {
    try {
      await API.delete(`/owners/${deleteId}`);
      toast.success('Owner deleted');
      setDeleteId(null);
      fetchOwners();
    } catch {
      toast.error('Failed to delete owner');
    }
  };

  const toggleStatus = async (id, current) => {
    try {
      await API.patch(`/owners/${id}/status`);
      setOwners(prev => prev.map(o => o._id === id ? { ...o, isActive: !current } : o));
      toast.success(current ? 'Owner deactivated' : 'Owner activated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const expiryWarning = (dateStr) => {
    if (!dateStr) return null;
    const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>Expired</span>;
    if (days <= 30) return <span style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>{days}d left</span>;
    return null;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Owners</h1>
          <p className="page-subtitle">{total} owner{total !== 1 ? 's' : ''} registered</p>
        </div>
        <Link to="/owners/new" className="btn btn-primary"><FiPlus /> Add Owner</Link>
      </div>

      {/* Filters */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
            <FiSearch size={14} />
            <input
              placeholder="Search by name, email, mobile, code..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
                  <th>Owner</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Nationality</th>
                  <th>Passport Expiry</th>
                  <th>Visa Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.map(o => (
                  <tr key={o._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'var(--primary-light)', color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                        }}>
                          {o.firstName?.[0]?.toUpperCase()}{o.lastName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {o.salutation} {o.firstName} {o.lastName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{o.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
                        {o.ownerCode}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{o.mobile || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{o.nationality || '—'}</td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {o.passportExpiryDate ? new Date(o.passportExpiryDate).toLocaleDateString('en-GB') : '—'}
                        {o.passportExpiryDate && <> {expiryWarning(o.passportExpiryDate)}</>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {o.visaExpiryDate ? new Date(o.visaExpiryDate).toLocaleDateString('en-GB') : '—'}
                        {o.visaExpiryDate && <> {expiryWarning(o.visaExpiryDate)}</>}
                      </div>
                    </td>
                    <td>{statusDot(o.isActive)}</td>
                    <td>
                      <div className="td-actions">
                        <button
                          onClick={() => navigate(`/owners/${o._id}`)}
                          className="btn btn-icon btn-ghost"
                          title="View profile"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => navigate(`/owners/edit/${o._id}`)}
                          className="btn btn-icon btn-outline"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => toggleStatus(o._id, o.isActive)}
                          className="btn btn-icon btn-ghost"
                          title={o.isActive ? 'Deactivate' : 'Activate'}
                          style={{ color: o.isActive ? '#f59e0b' : '#10b981' }}
                        >
                          {o.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                        </button>
                        <button
                          onClick={() => setDeleteId(o._id)}
                          className="btn btn-icon btn-danger"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {owners.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="icon"><FiUser size={32} /></div>
                        <h4>No owners found</h4>
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Add your first owner to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {owners.length} of {total}</div>
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
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Owner?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: '0.9rem' }}>
              This will permanently remove the owner record. Are you sure?
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

export default Owners;
