import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEye } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: '#f59e0b', completed: '#10b981', failed: '#ef4444', refunded: '#6b7280' };

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await API.get(`/payments?${params}`);
      setPayments(data.payments || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setTotalRevenue(data.totalRevenue || 0);
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPayments(); }, [page, statusFilter]);

  const handleVerify = async (id, status) => {
    try {
      await API.put(`/payments/${id}/verify`, { status });
      toast.success(`Payment ${status}`);
      setSelected(null);
      fetchPayments();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Total Revenue: <strong style={{ color: 'var(--accent)' }}>₹{totalRevenue.toLocaleString()}</strong></p>
        </div>
      </div>

      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', 'pending', 'completed', 'failed'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Payment ID</th><th>Property</th><th>User</th><th>Amount</th><th>Mode</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{p.paymentId}</td>
                    <td style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.property?.title || '-'}</td>
                    <td><div style={{ fontWeight: 600 }}>{p.user?.firstName} {p.user?.lastName}</div><div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{p.user?.email}</div></td>
                    <td style={{ fontWeight: 800, fontSize: '1rem' }}>₹{p.amount?.toLocaleString()}</td>
                    <td><span className="badge badge-gray">{p.paymentMode?.toUpperCase()}</span></td>
                    <td style={{ fontSize: '0.8rem' }}>{p.paymentType?.replace('_', ' ')}</td>
                    <td><span style={{ background: (STATUS_COLORS[p.status] || '#6b7280') + '22', color: STATUS_COLORS[p.status] || '#6b7280', padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>{p.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="td-actions">
                        <button onClick={() => setSelected(p)} className="btn btn-icon btn-outline" title="View"><FiEye /></button>
                        {p.status === 'pending' && (
                          <>
                            <button onClick={() => handleVerify(p._id, 'completed')} className="btn btn-icon btn-success" title="Approve"><FiCheck /></button>
                            <button onClick={() => handleVerify(p._id, 'failed')} className="btn btn-icon btn-danger" title="Reject"><FiX /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={9}><div className="empty-state"><div className="icon">💳</div><h4>No payments found</h4></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {payments.length} of {total}</div>
          <div className="pagination-btns">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => <button key={n} className={page === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Payment Details</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
                {[['Payment ID', selected.paymentId], ['Property', selected.property?.title], ['User', `${selected.user?.firstName} ${selected.user?.lastName}`], ['Email', selected.user?.email], ['Amount', `₹${selected.amount?.toLocaleString()}`], ['Payment Mode', selected.paymentMode], ['Payment Type', selected.paymentType?.replace('_', ' ')], ['Transaction ID', selected.transactionId], ['Notes', selected.notes], ['Date', new Date(selected.createdAt).toLocaleString()]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.875rem', borderBottom: '1px solid var(--gray-200)', paddingBottom: 10 }}>
                    <span style={{ color: 'var(--gray-500)' }}>{k}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
              {selected.screenshotUrl && <div style={{ marginBottom: 20 }}><p style={{ fontWeight: 600, marginBottom: 8 }}>Payment Screenshot</p><img src={selected.screenshotUrl} alt="screenshot" style={{ width: '100%', borderRadius: 8 }} /></div>}
              {selected.status === 'pending' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-success btn-full" onClick={() => handleVerify(selected._id, 'completed')}>✓ Approve Payment</button>
                  <button className="btn btn-danger btn-full" onClick={() => handleVerify(selected._id, 'failed')}>✗ Reject</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
