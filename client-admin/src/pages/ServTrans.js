import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye, FiTool, FiChevronRight } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  plumbing:    { label: 'Plumbing',    icon: '🔧', color: '#3b82f6' },
  electrical:  { label: 'Electrical',  icon: '⚡', color: '#f59e0b' },
  ac:          { label: 'AC',          icon: '❄️', color: '#06b6d4' },
  cleaning:    { label: 'Cleaning',    icon: '🧹', color: '#10b981' },
  carpentry:   { label: 'Carpentry',   icon: '🪚', color: '#92400e' },
  painting:    { label: 'Painting',    icon: '🖌️', color: '#8b5cf6' },
  pest_control:{ label: 'Pest Control',icon: '🐛', color: '#ef4444' },
  maintenance: { label: 'Maintenance', icon: '⚙️', color: '#6b7280' },
  other:       { label: 'Other',       icon: '📋', color: '#374151' },
};

const PIPELINE = [
  { key: 'open',        label: 'Open',        bg: '#fee2e2', color: '#991b1b' },
  { key: 'assigned',    label: 'Assigned',    bg: '#fef3c7', color: '#92400e' },
  { key: 'in_progress', label: 'In Progress', bg: '#dbeafe', color: '#1e40af' },
  { key: 'completed',   label: 'Completed',   bg: '#d1fae5', color: '#065f46' },
  { key: 'closed',      label: 'Closed',      bg: '#f3f4f6', color: '#374151' },
];

const NEXT_STATUS = {
  open: 'assigned', assigned: 'in_progress', in_progress: 'completed', completed: 'closed',
};

const StatusBadge = ({ status }) => {
  const s = PIPELINE.find(p => p.key === status) || PIPELINE[0];
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
      {s.label}
    </span>
  );
};

const fmtMoney = (n) => n != null && n !== '' ? `₹${Number(n).toLocaleString()}` : '—';
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

const ServTrans = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, assigned: 0, in_progress: 0, completed: 0, closed: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [advancing, setAdvancing] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('requestType', typeFilter);
      const [listRes, statsRes] = await Promise.all([
        API.get(`/servtrans?${params}`),
        API.get('/servtrans/stats'),
      ]);
      setRequests(listRes.data.requests || []);
      setTotal(listRes.data.total || 0);
      setPages(listRes.data.pages || 1);
      setStats(statsRes.data.stats || {});
    } catch {
      toast.error('Failed to load service requests');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    try {
      await API.delete(`/servtrans/${deleteId}`);
      toast.success('Request deleted');
      setDeleteId(null);
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const advanceStatus = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    setAdvancing(id);
    try {
      await API.patch(`/servtrans/${id}/status`, { status: next });
      const nextLabel = PIPELINE.find(p => p.key === next)?.label;
      toast.success(`Moved to ${nextLabel}`);
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status: next } : r));
      setStats(prev => ({ ...prev, [currentStatus]: Math.max(0, prev[currentStatus] - 1), [next]: (prev[next] || 0) + 1 }));
    } catch { toast.error('Failed to update status'); }
    finally { setAdvancing(null); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Requests</h1>
          <p className="page-subtitle">{total} request{total !== 1 ? 's' : ''} total</p>
        </div>
        <Link to="/servtrans/new" className="btn btn-primary"><FiPlus /> New Request</Link>
      </div>

      {/* Pipeline status bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
        {PIPELINE.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { setStatusFilter(statusFilter === s.key ? '' : s.key); setPage(1); }}
            style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
              background: statusFilter === s.key ? s.bg : 'white',
              borderRight: i < PIPELINE.length - 1 ? '1px solid var(--gray-200)' : 'none',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{stats[s.key] || 0}</div>
            <div style={{ fontSize: '0.72rem', color: s.color, fontWeight: 600 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
            <FiSearch size={14} />
            <input
              placeholder="Search by ref#, property, description, technician..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
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
                  <th>Ref #</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Technician</th>
                  <th>Cost (Est / Act)</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => {
                  const t = TYPE_LABELS[r.requestType] || TYPE_LABELS.other;
                  const canAdvance = !!NEXT_STATUS[r.status];
                  return (
                    <tr key={r._id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
                          {r.seqRef}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{r.propertyId?.title || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{r.propertyCode}</div>
                      </td>
                      <td>
                        <span style={{ background: t.color + '18', color: t.color, padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {t.icon} {t.label}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200 }}>
                        <div style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description}>
                          {r.description}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{r.attendedBy || <span style={{ color: 'var(--gray-300)' }}>Unassigned</span>}</td>
                      <td style={{ fontSize: '0.82rem' }}>
                        <div>{fmtMoney(r.estimatedCost)}</div>
                        {r.actualCost != null && r.actualCost !== '' && (
                          <div style={{ color: r.actualCost > r.estimatedCost ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                            {fmtMoney(r.actualCost)}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{fmt(r.requestDate)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <StatusBadge status={r.status} />
                          {canAdvance && (
                            <button
                              disabled={advancing === r._id}
                              onClick={() => advanceStatus(r._id, r.status)}
                              title={`Move to ${NEXT_STATUS[r.status]?.replace('_', ' ')}`}
                              style={{ background: 'none', border: '1px solid var(--gray-300)', borderRadius: 6, padding: '2px 5px', cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', alignItems: 'center' }}
                            >
                              <FiChevronRight size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="td-actions">
                          <button onClick={() => navigate(`/servtrans/${r._id}`)} className="btn btn-icon btn-ghost" title="View"><FiEye /></button>
                          <button onClick={() => navigate(`/servtrans/edit/${r._id}`)} className="btn btn-icon btn-outline" title="Edit"><FiEdit2 /></button>
                          <button onClick={() => setDeleteId(r._id)} className="btn btn-icon btn-danger" title="Delete"><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <div className="icon"><FiTool size={32} /></div>
                        <h4>No service requests found</h4>
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Raise a new service request to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {requests.length} of {total}</div>
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
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Request?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: '0.9rem' }}>This permanently removes the service request.</p>
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

export default ServTrans;
