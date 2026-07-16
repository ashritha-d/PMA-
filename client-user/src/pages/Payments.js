import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

const statusColor = (s) =>
  ({ pending: '#f59e0b', completed: '#10b981', failed: '#ef4444', refunded: '#6b7280' }[s] || '#6b7280');

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual UPI modal state
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    amount: '', paymentType: 'booking_fee', paymentMode: 'upi',
    transactionId: '', notes: '', property: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Razorpay modal state
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [rzpForm, setRzpForm] = useState({ amount: '', paymentType: 'booking_fee', property: '', booking: '', notes: '' });
  const [rzpLoading, setRzpLoading] = useState(false);

  const fetchPayments = useCallback(() => {
    API.get('/payments/my').then((p) => setPayments(p.data.payments || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Manual UPI submit ───────────────────────────────────────────────────
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(manualForm).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const { data } = await API.post('/payments', fd);
      setPayments((prev) => [data.payment, ...prev]);
      toast.success('Payment submitted for verification!');
      setShowManual(false);
      setManualForm({ amount: '', paymentType: 'booking_fee', paymentMode: 'upi', transactionId: '', notes: '', property: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment');
    } finally { setSubmitting(false); }
  };

  // ── Razorpay checkout ───────────────────────────────────────────────────
  const handleRazorpayPay = async (e) => {
    e.preventDefault();
    if (!rzpForm.amount || Number(rzpForm.amount) <= 0) {
      return toast.error('Enter a valid amount');
    }

    setRzpLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay SDK');

      const { data } = await API.post('/payments/razorpay/create-order', {
        amount: Number(rzpForm.amount),
        currency: 'INR',
        notes: { paymentType: rzpForm.paymentType, notes: rzpForm.notes },
      });

      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'PropManage',
        description: rzpForm.paymentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        order_id: data.order.id,
        prefill: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: { color: '#0D1B2A' },
        modal: { backdropclose: false },
        handler: async (response) => {
          try {
            const verifyRes = await API.post('/payments/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: Number(rzpForm.amount),
              paymentType: rzpForm.paymentType,
              property: rzpForm.property || undefined,
              booking: rzpForm.booking || undefined,
              notes: rzpForm.notes,
            });
            if (verifyRes.data.success) {
              toast.success('Payment successful! ₹' + Number(rzpForm.amount).toLocaleString());
              setPayments((prev) => [verifyRes.data.payment, ...prev]);
              setShowRazorpay(false);
              setRzpForm({ amount: '', paymentType: 'booking_fee', property: '', booking: '', notes: '' });
            }
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
      setShowRazorpay(false);
    } catch (err) {
      toast.error(err.message || 'Could not initiate payment');
    } finally { setRzpLoading(false); }
  };

  const UPI_QR_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=propmanage@upi&pn=PropManage&cu=INR';

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '40px 0' }}>
      <div className="container">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>My Payments</h1>
            <p style={{ color: 'var(--gray-500)' }}>Track all your payment transactions</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => setShowManual(true)}>+ Manual / UPI</button>
            <button
              className="btn btn-primary"
              onClick={() => setShowRazorpay(true)}
              style={{ background: '#2C6EE8', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <img src="https://razorpay.com/favicon.png" alt="" style={{ width: 18, height: 18, borderRadius: 4 }} />
              Pay via Razorpay
            </button>
          </div>
        </div>

        {/* Payment method cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
          {/* UPI card */}
          <div className="card card-body" style={{ background: 'linear-gradient(135deg, #1a56db, #3b82f6)', color: 'white', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={UPI_QR_URL} alt="UPI QR Code" style={{ width: 100, height: 100, borderRadius: 8, background: 'white', padding: 4 }} />
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Scan & Pay via UPI</h3>
              <p style={{ opacity: 0.9, marginBottom: 8, fontSize: '0.9rem' }}>Use PhonePe, GPay, or Paytm</p>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem' }}>propmanage@upi</div>
            </div>
          </div>

          {/* Razorpay card */}
          <div className="card card-body" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1a3a5c)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, background: '#2C6EE8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💳</div>
              <h3 style={{ fontWeight: 700 }}>Razorpay Gateway</h3>
            </div>
            <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>Pay securely with cards, net banking, wallets, or UPI — instant confirmation, no manual verification needed.</p>
            <button
              className="btn"
              onClick={() => setShowRazorpay(true)}
              style={{ background: '#2C6EE8', color: 'white', border: 'none', alignSelf: 'flex-start', fontWeight: 700 }}
            >
              Pay Now →
            </button>
          </div>
        </div>

        {/* Payment list */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : payments.length === 0 ? (
          <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>💳</div>
            <h3>No payments yet</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Make a payment to book or rent a property</p>
            <button className="btn btn-primary" onClick={() => setShowRazorpay(true)}>Pay via Razorpay</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {payments.map((p) => (
              <div key={p._id} className="card card-body"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{p.paymentMode?.toUpperCase()}</span>
                    <span className="badge badge-gray">{p.paymentType?.replace(/_/g, ' ')}</span>
                    {p.paymentMode === 'online' && (
                      <span style={{ background: '#2C6EE822', color: '#2C6EE8', padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>RAZORPAY</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>₹{p.amount?.toLocaleString()}</div>
                  <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: 4 }}>
                    {p.property?.title && `${p.property.title} • `}
                    {new Date(p.createdAt).toLocaleDateString()}
                    {p.transactionId && ` • TxID: ${p.transactionId}`}
                  </div>
                  {p.paymentId && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>Ref: {p.paymentId}</div>}
                </div>
                <span style={{
                  background: statusColor(p.status) + '22', color: statusColor(p.status),
                  padding: '8px 16px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize',
                }}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Razorpay Modal ───────────────────────────────────────────────── */}
      {showRazorpay && (
        <div className="modal-overlay" onClick={() => setShowRazorpay(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="razorpay-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1a3a5c)', color: 'white', borderRadius: '12px 12px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, background: '#2C6EE8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">💳</div>
                <h3 className="modal-title" id="razorpay-modal-title" style={{ color: 'white' }}>Pay via Razorpay</h3>
              </div>
              <button className="modal-close" onClick={() => setShowRazorpay(false)} aria-label="Close" style={{ color: 'white' }}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.88rem', color: '#1e40af' }}>
                🔒 Payments are processed securely by Razorpay. Cards, net banking, wallets & UPI all supported. Instant confirmation — no manual verification needed.
              </div>
              <form onSubmit={handleRazorpayPay}>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input className="form-input" type="number" required min="1"
                    value={rzpForm.amount} onChange={(e) => setRzpForm({ ...rzpForm, amount: e.target.value })}
                    placeholder="Enter amount" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment For</label>
                  <select className="form-select" value={rzpForm.paymentType}
                    onChange={(e) => setRzpForm({ ...rzpForm, paymentType: e.target.value })}>
                    <option value="booking_fee">Booking Fee</option>
                    <option value="security_deposit">Security Deposit</option>
                    <option value="rent">Rent</option>
                    <option value="advance">Advance</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <input className="form-input" value={rzpForm.notes}
                    onChange={(e) => setRzpForm({ ...rzpForm, notes: e.target.value })}
                    placeholder="e.g. January rent for Flat 4B" />
                </div>
                <button type="submit" disabled={rzpLoading}
                  style={{
                    width: '100%', padding: '14px', background: '#2C6EE8', color: 'white',
                    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem',
                    cursor: rzpLoading ? 'not-allowed' : 'pointer', opacity: rzpLoading ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {rzpLoading ? 'Opening Razorpay...' : `💳  Pay ₹${rzpForm.amount ? Number(rzpForm.amount).toLocaleString() : '0'}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual / UPI Modal ───────────────────────────────────────────── */}
      {showManual && (
        <div className="modal-overlay" onClick={() => setShowManual(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="manual-payment-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" id="manual-payment-modal-title">Submit Manual / UPI Payment</h3>
              <button className="modal-close" onClick={() => setShowManual(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 24, padding: 16, background: 'var(--gray-50)', borderRadius: 12 }}>
                <img src={UPI_QR_URL} alt="UPI QR" style={{ width: 140, height: 140, margin: '0 auto', borderRadius: 8, background: 'white', padding: 4 }} />
                <p style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--gray-500)' }}>Scan to pay, then submit the transaction ID below</p>
              </div>
              <form onSubmit={handleManualSubmit}>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input className="form-input" type="number" required value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} placeholder="Enter amount" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment For</label>
                  <select className="form-select" value={manualForm.paymentType}
                    onChange={(e) => setManualForm({ ...manualForm, paymentType: e.target.value })}>
                    <option value="booking_fee">Booking Fee</option>
                    <option value="security_deposit">Security Deposit</option>
                    <option value="rent">Rent</option>
                    <option value="advance">Advance</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select className="form-select" value={manualForm.paymentMode}
                    onChange={(e) => setManualForm({ ...manualForm, paymentMode: e.target.value })}>
                    <option value="upi">UPI</option>
                    <option value="online">Online Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Transaction ID</label>
                  <input className="form-input" value={manualForm.transactionId}
                    onChange={(e) => setManualForm({ ...manualForm, transactionId: e.target.value })}
                    placeholder="Enter UPI/bank reference number" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    placeholder="Any additional notes" rows={2} />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
