import React, { useState, useEffect } from 'react';
import { FiStar, FiTrash2 } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    API.get('/reviews').then(r => setReviews(r.data.reviews || [])).finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    try {
      await API.delete(`/reviews/${deleteId}`);
      setReviews(prev => prev.filter(r => r._id !== deleteId));
      setDeleteId(null);
      toast.success('Review deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const Stars = ({ rating }) => (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(s => <FiStar key={s} size={13} fill={s <= rating ? '#f59e0b' : 'none'} color="#f59e0b" />)}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Reviews</h1><p className="page-subtitle">{reviews.length} total reviews</p></div>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Property</th><th>Rating</th><th>Title</th><th>Comment</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{r.user?.firstName} {r.user?.lastName}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{r.property?.title || '-'}</td>
                    <td><Stars rating={r.rating} /></td>
                    <td style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{r.title || '-'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--gray-500)' }}>{r.comment}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => setDeleteId(r._id)} className="btn btn-icon btn-danger"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && <tr><td colSpan={7}><div className="empty-state"><div className="icon">⭐</div><h4>No reviews yet</h4></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteId && (
        <div className="confirm-overlay" onClick={() => setDeleteId(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Review?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: '0.875rem' }}>This will permanently delete this review.</p>
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

export default Reviews;
