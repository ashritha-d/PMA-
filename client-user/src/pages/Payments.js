import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import toast from 'react-hot-toast';

const statusColor = (s) => ({ pending: '#f59e0b', completed: '#10b981', failed: '#ef4444', refunded: '#6b7280' }[s] || '#6b7280');

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: '', paymentType: 'booking_fee', paymentMode: 'upi', transactionId: '', notes: '', property: '' });
  const [properties, setProperties] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([API.get('/payments/my'), API.get('/auth/favorites')]).then(([p, f]) => {
      setPayments(p.data.payments || []);
      setProperties(f.data.favorites || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const { data } = await API.post('/payments', fd);
      setPayments(prev => [data.payment, ...prev]);
      toast.success('Payment submitted for verification!');
      setShowModal(false);
      setForm({ amount: '', paymentType: 'booking_fee', paymentMode: 'upi', transactionId: '', notes: '', property: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment');
    } finally { setSubmitting(false); }
  };

  const UPI_QR_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=propmanage@upi&pn=PropManage&cu=INR';

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '40px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>My Payments</h1>
            <p style={{ color: 'var(--gray-500)' }}>Track all your payment transactions</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Make Payment</button>
        </div>

        {/* UPI QR Banner */}
        <div className="card card-body" style={{ background: 'linear-gradient(135deg, #1a56db, #3b82f6)', color: 'white', display: 'flex', gap: 32, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          <img src={UPI_QR_URL} alt="UPI QR Code" style={{ width: 120, height: 120, borderRadius: 8, background: 'white', padding: 4 }} />
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Scan & Pay via UPI</h3>
            <p style={{ opacity: 0.9, marginBottom: 8 }}>Scan the QR code using any UPI app (PhonePe, GPay, Paytm)</p>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: 8, display: 'inline-block', fontWeight: 600 }}>UPI ID: propmanage@upi</div>
          </div>
        </div>

        {loading ? <div className="loading-screen"><div className="spinner" /></div> : payments.length === 0 ? (
          <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>💳</div>
            <h3>No payments yet</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Make a payment to book or rent a property</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Make First Payment</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {payments.map(p => (
              <div key={p._id} className="card card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span className="badge badge-primary">{p.paymentMode?.toUpperCase()}</span>
                    <span className="badge badge-gray">{p.paymentType?.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>₹{p.amount?.toLocaleString()}</div>
                  <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: 4 }}>
                    {p.property?.title} • {new Date(p.createdAt).toLocaleDateString()}
                    {p.transactionId && ` • TxID: ${p.transactionId}`}
                  </div>
                  {p.paymentId && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>Payment ID: {p.paymentId}</div>}
                </div>
                <span style={{ background: statusColor(p.status) + '22', color: statusColor(p.status), padding: '8px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize' }}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Submit Payment</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 24, padding: 16, background: 'var(--gray-50)', borderRadius: 12 }}>
                <img src={UPI_QR_URL} alt="UPI QR" style={{ width: 150, height: 150, margin: '0 auto', borderRadius: 8, background: 'white', padding: 4 }} />
                <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--gray-500)' }}>Scan to pay, then submit the transaction ID below</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input className="form-input" type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment For</label>
                  <select className="form-select" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value })}>
                    <option value="booking_fee">Booking Fee</option>
                    <option value="security_deposit">Security Deposit</option>
                    <option value="rent">Rent</option>
                    <option value="advance">Advance</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select className="form-select" value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}>
                    <option value="upi">UPI</option>
                    <option value="online">Online Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Transaction ID</label>
                  <input className="form-input" value={form.transactionId} onChange={e => setForm({ ...form, transactionId: e.target.value })} placeholder="Enter UPI/bank reference number" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes" rows={2} />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Payment'}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
