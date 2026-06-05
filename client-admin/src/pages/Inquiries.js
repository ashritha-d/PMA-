import React, { useState, useEffect } from 'react';
import { FiEye, FiCheckCircle } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = { new: '#ef4444', in_progress: '#f59e0b', resolved: '#10b981', closed: '#6b7280' };

const Inquiries = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await API.get(`/inquiries?${params}`);
      setInquiries(data.inquiries || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchInquiries(); }, [page, statusFilter]);

  const handleRespond = async () => {
    if (!response.trim()) { toast.error('Enter a response'); return; }
    setSubmitting(true);
    try {
      await API.put(`/inquiries/${selected._id}`, { adminResponse: response, status: 'resolved' });
      toast.success('Response sent!');
      setSelected(null);
      setResponse('');
      fetchInquiries();
    } catch { toast.error('Failed to respond'); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Inquiries</h1><p className="page-subtitle">{total} total inquiries</p></div>
      </div>

      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', 'new', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}>
              {s ? s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Inquiry ID</th><th>From</th><th>Subject</th><th>Property</th><th>Type</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>
                {inquiries.map(inq => (
                  <tr key={inq._id} style={{ background: !inq.isRead ? '#fffbeb' : 'white' }}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>{inq.inquiryId}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{inq.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{inq.email}</div>
                    </td>
                    <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inq.subject || inq.message?.substring(0, 40)}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inq.property?.title || '-'}</td>
                    <td><span className="badge badge-info">{inq.type?.replace('_', ' ')}</span></td>
                    <td><span style={{ background: (STATUS_COLORS[inq.status] || '#6b7280') + '22', color: STATUS_COLORS[inq.status] || '#6b7280', padding: '3px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>{inq.status?.replace('_', ' ')}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date(inq.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => { setSelected(inq); setResponse(inq.adminResponse || ''); }} className="btn btn-icon btn-outline" title="View & Respond"><FiEye /></button>
                    </td>
                  </tr>
                ))}
                {inquiries.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="icon">💬</div><h4>No inquiries found</h4></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {inquiries.length} of {total}</div>
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
              <h3 className="modal-title">Inquiry #{selected.inquiryId}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{selected.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{selected.email}</div>
                    {selected.phone && <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{selected.phone}</div>}
                  </div>
                  <span style={{ background: (STATUS_COLORS[selected.status] || '#6b7280') + '22', color: STATUS_COLORS[selected.status] || '#6b7280', padding: '4px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700, height: 'fit-content' }}>{selected.status}</span>
                </div>
                {selected.subject && <div style={{ fontWeight: 600, marginBottom: 8 }}>{selected.subject}</div>}
                <p style={{ color: 'var(--gray-700)', lineHeight: 1.7, fontSize: '0.9rem', background: 'white', padding: 14, borderRadius: 8 }}>{selected.message}</p>
                {selected.adminResponse && (
                  <div style={{ marginTop: 12, borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>Your Response:</div>
                    <p style={{ color: 'var(--gray-700)', fontSize: '0.875rem' }}>{selected.adminResponse}</p>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Reply to User</label>
                <textarea className="form-textarea" rows={5} value={response} onChange={e => setResponse(e.target.value)} placeholder="Write your response here..." />
              </div>
              <button className="btn btn-primary btn-full" onClick={handleRespond} disabled={submitting}>
                <FiCheckCircle /> {submitting ? 'Sending...' : 'Send Response & Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inquiries;
