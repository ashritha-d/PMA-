import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiMessageSquare } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#10b981', rejected: '#ef4444', completed: '#3b82f6', cancelled: '#6b7280' };

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await API.get(`/bookings?${params}`);
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const handleStatus = async (id, status) => {
    setUpdating(true);
    try {
      await API.put(`/bookings/${id}/status`, { status, adminNote: note });
      toast.success(`Booking ${status}`);
      setSelected(null);
      setNote('');
      fetchBookings();
    } catch { toast.error('Failed to update'); } finally { setUpdating(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Bookings</h1><p className="page-subtitle">{total} total bookings</p></div>
      </div>

      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['', 'pending', 'confirmed', 'rejected', 'completed', 'cancelled'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Booking ID</th><th>Property</th><th>User</th><th>Visit Date</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--gray-500)' }}>{b.bookingId}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.property?.title || '-'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.user?.firstName} {b.user?.lastName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{b.user?.email}</div>
                    </td>
                    <td>{b.visitDate ? new Date(b.visitDate).toLocaleDateString() : 'TBD'}{b.visitTime && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{b.visitTime}</div>}</td>
                    <td><span className="badge badge-info">{b.bookingType}</span></td>
                    <td><span style={{ background: (STATUS_COLORS[b.status] || '#6b7280') + '22', color: STATUS_COLORS[b.status] || '#6b7280', padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>{b.status}</span></td>
                    <td>
                      <div className="td-actions">
                        {b.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatus(b._id, 'confirmed')} className="btn btn-icon btn-success" title="Confirm"><FiCheck /></button>
                            <button onClick={() => handleStatus(b._id, 'rejected')} className="btn btn-icon btn-danger" title="Reject"><FiX /></button>
                          </>
                        )}
                        <button onClick={() => setSelected(b)} className="btn btn-icon btn-outline" title="Details"><FiMessageSquare /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="icon">📅</div><h4>No bookings found</h4></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {bookings.length} of {total}</div>
          <div className="pagination-btns">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => <button key={n} className={page === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" id="booking-modal-title">Booking Details</h3>
              <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>Booking #{selected.bookingId}</div>
                  {[['Property', selected.property?.title], ['User', `${selected.user?.firstName} ${selected.user?.lastName}`], ['Email', selected.user?.email], ['Phone', selected.user?.phone], ['Visit Date', selected.visitDate ? new Date(selected.visitDate).toLocaleDateString() : 'TBD'], ['Visit Time', selected.visitTime], ['Type', selected.bookingType], ['Message', selected.message]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--gray-500)' }}>{k}</span>
                      <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
                {selected.status === 'pending' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Admin Note (Optional)</label>
                      <textarea className="form-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note for the user..." />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn btn-success btn-full" onClick={() => handleStatus(selected._id, 'confirmed')} disabled={updating}>{updating ? '...' : '✓ Confirm'}</button>
                      <button className="btn btn-danger btn-full" onClick={() => handleStatus(selected._id, 'rejected')} disabled={updating}>{updating ? '...' : '✗ Reject'}</button>
                    </div>
                  </>
                )}
                {selected.status === 'confirmed' && (
                  <button className="btn btn-primary btn-full" onClick={() => handleStatus(selected._id, 'completed')} disabled={updating}>{updating ? '...' : 'Mark Completed'}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
