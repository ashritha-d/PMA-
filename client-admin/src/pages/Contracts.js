import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiFileText, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  active:     { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  expired:    { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  terminated: { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
  renewed:    { bg: '#e0f2fe', color: '#075985', dot: '#0ea5e9' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.expired;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const ExpiryCell = ({ endDate, status }) => {
  if (status !== 'active' || !endDate) return <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>—</span>;
  const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  const color = days < 0 ? '#ef4444' : days <= 30 ? '#f59e0b' : days <= 60 ? '#3b82f6' : 'var(--gray-600)';
  return (
    <div>
      <div style={{ fontSize: '0.82rem', color: 'var(--gray-700)' }}>{new Date(endDate).toLocaleDateString('en-GB')}</div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color }}>
        {days < 0 ? 'Expired' : days === 0 ? 'Today' : `${days}d left`}
        {days > 0 && days <= 30 && <FiAlertTriangle size={10} style={{ marginLeft: 3 }} />}
      </div>
    </div>
  );
};

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [stats, setStats] = useState({ active: 0, expiringSoon: 0, expired: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (expiringSoon) params.set('expiringSoon', 'true');
      const { data } = await API.get(`/contracts?${params}`);
      setContracts(data.contracts || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, expiringSoon]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  useEffect(() => {
    API.get('/contracts/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handleDelete = async () => {
    try {
      await API.delete(`/contracts/${deleteId}`);
      toast.success('Contract deleted');
      setDeleteId(null);
      fetchContracts();
    } catch {
      toast.error('Failed to delete contract');
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
  const fmtMoney = (n) => n ? `₹${Number(n).toLocaleString()}` : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contracts</h1>
          <p className="page-subtitle">{total} contract{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/contracts/new" className="btn btn-primary"><FiPlus /> New Contract</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Active', value: stats.active, color: '#10b981', bg: '#d1fae5' },
          { label: 'Expiring (30d)', value: stats.expiringSoon, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Expired', value: stats.expired, color: '#ef4444', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiFileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
            <FiSearch size={14} />
            <input
              placeholder="Search by contract #, tenant, property, owner..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setExpiringSoon(false); setPage(1); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
            <option value="renewed">Renewed</option>
          </select>
          <button
            className={`btn ${expiringSoon ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
            onClick={() => { setExpiringSoon(p => !p); setStatusFilter(''); setPage(1); }}
          >
            <FiAlertTriangle size={13} /> Expiring Soon
            {stats.expiringSoon > 0 && (
              <span style={{ background: '#f59e0b', color: 'white', borderRadius: 10, padding: '0 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                {stats.expiringSoon}
              </span>
            )}
          </button>
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
                  <th>Contract #</th>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Rent / Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
                        {c.contractNumber}
                      </span>
                      {c.renewedFrom && (
                        <div style={{ fontSize: '0.68rem', color: '#0ea5e9', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <FiRefreshCw size={9} /> Renewal
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.tenantName || (c.tenantId ? `${c.tenantId.firstName} ${c.tenantId.lastName}` : '—')}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{c.tenantCode}</div>
                    </td>
                    <td>
                      {c.propertyId ? (
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{c.propertyId.title}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{c.propertyCode}</div>
                        </div>
                      ) : <span style={{ color: 'var(--gray-400)' }}>{c.propertyCode || '—'}</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{fmtMoney(c.rentAmount)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{c.rentPaymentType}</div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{fmt(c.contractStartDate)}</td>
                    <td><ExpiryCell endDate={c.contractEndDate} status={c.status} /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <div className="td-actions">
                        <button onClick={() => navigate(`/contracts/${c._id}`)} className="btn btn-icon btn-ghost" title="View"><FiEye /></button>
                        <button onClick={() => navigate(`/contracts/edit/${c._id}`)} className="btn btn-icon btn-outline" title="Edit"><FiEdit2 /></button>
                        <button onClick={() => setDeleteId(c._id)} className="btn btn-icon btn-danger" title="Delete"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="icon"><FiFileText size={32} /></div>
                        <h4>No contracts found</h4>
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Create your first lease contract to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {contracts.length} of {total}</div>
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
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Contract?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: '0.9rem' }}>
              This permanently removes the contract record. Are you sure?
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

export default Contracts;
