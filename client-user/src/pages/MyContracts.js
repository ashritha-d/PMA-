import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiFileText, FiHome, FiCalendar, FiDollarSign, FiDownload, FiEye, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiLock, FiUnlock } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

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

const STATUS_CONFIG = {
  draft:              { label: 'Draft',             color: '#6b7280', bg: '#f3f4f6' },
  pending_signatures: { label: 'Pending Approval',  color: '#92400e', bg: '#fef3c7' },
  active:             { label: 'Active',             color: '#065f46', bg: '#d1fae5' },
  completed:          { label: 'Completed',          color: '#1e40af', bg: '#dbeafe' },
  cancelled:          { label: 'Cancelled',          color: '#991b1b', bg: '#fee2e2' },
};

const StatusIcon = ({ status }) => {
  const icons = { draft: <FiClock size={14} />, pending_signatures: <FiAlertCircle size={14} />, active: <FiCheckCircle size={14} />, completed: <FiCheckCircle size={14} />, cancelled: <FiXCircle size={14} /> };
  return icons[status] || <FiClock size={14} />;
};

const formatPrice = (p) => p >= 10000000 ? `₹${(p / 10000000).toFixed(2)}Cr` : p >= 100000 ? `₹${(p / 100000).toFixed(2)}L` : `₹${Number(p || 0).toLocaleString()}`;

const ContractDetailModal = ({ contract, onClose, onPaymentDone, onSigned }) => {
  const [payingAdvance, setPayingAdvance] = useState(false);
  const [signing, setSigning] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const signButtonRef = useRef(null);
  if (!contract) return null;
  const cfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;

  const canSign = !contract.buyerSignedAt &&
    contract.status === 'pending_signatures' &&
    (contract.advanceAmount === 0 || contract.advancePaid);

  const handleSign = async () => {
    if (!window.confirm('By clicking OK you confirm you have read and agree to all terms of this contract. This action cannot be undone.')) return;
    setSigning(true);
    try {
      const { data } = await API.post(`/purchase-contracts/${contract._id}/sign`, {
        signatureData: `${contract.buyerName} — digitally signed on ${new Date().toLocaleString('en-IN')}`,
      });
      if (data.success) {
        toast.success('Contract signed successfully! Awaiting admin approval.');
        onSigned(data.contract);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sign contract');
    } finally { setSigning(false); }
  };

  const handleAdvancePayment = async () => {
    setPayingAdvance(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay');

      const { data } = await API.post(`/purchase-contracts/${contract._id}/razorpay/create-order`);
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'PropManage',
        description: `Advance Payment — ${data.contract.contractNumber}`,
        order_id: data.order.id,
        prefill: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: { color: '#1a56db' },
        modal: { backdropclose: false },
        handler: async (response) => {
          try {
            const verifyRes = await API.post(`/purchase-contracts/${contract._id}/razorpay/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              toast.success(`Advance of ₹${data.contract.advanceAmount.toLocaleString()} paid! You can now sign the contract.`);
              setJustPaid(true);
              onPaymentDone(verifyRes.data.contract);
              // Sign button only mounts once advancePaid flips true (next
              // render) — defer the scroll a tick so it's actually there.
              setTimeout(() => signButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            }
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r) => toast.error(`Payment failed: ${r.error.description}`));
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not initiate payment');
    } finally {
      setPayingAdvance(false);
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Contract ${contract.contractNumber}</title>
      <style>
        body { font-family: Georgia, serif; margin: 40px; color: #111; line-height: 1.7; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 8px; border-bottom: 1px solid #eee; }
        th { background: #f3f4f6; text-align: left; }
        .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; margin-bottom: 10px; font-size: 1rem; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .box { padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; }
      </style></head><body>
      <div class="header">
        <h2 style="margin:0;font-size:1.3rem">PROPERTY PURCHASE AGREEMENT</h2>
        <p style="font-size:0.85rem;color:#555;margin:4px 0">Contract No: <strong>${contract.contractNumber}</strong> &nbsp;|&nbsp; Date: <strong>${new Date(contract.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></p>
        <p style="font-size:0.85rem;color:#555;margin:4px 0">Status: <strong>${cfg.label}</strong></p>
      </div>
      <div class="grid section">
        <div class="box"><div class="section-title" style="color:#2563eb">BUYER</div><strong>${contract.buyerName}</strong><br><small>${contract.buyerEmail}</small>${contract.buyerPhone ? `<br><small>${contract.buyerPhone}</small>` : ''}</div>
        <div class="box"><div class="section-title" style="color:#16a34a">SELLER / OWNER</div><strong>${contract.ownerName || '—'}</strong><br><small>${contract.ownerEmail || '—'}</small></div>
      </div>
      <div class="section">
        <div class="section-title">PROPERTY DETAILS</div>
        <table><tbody>
          <tr><td style="color:#777">Property</td><td><strong>${contract.propertyTitle}</strong></td></tr>
          <tr><td style="color:#777">Property ID</td><td>${contract.propertyCode || '—'}</td></tr>
          <tr><td style="color:#777">Address</td><td>${contract.propertyAddress || '—'}</td></tr>
        </tbody></table>
      </div>
      <div class="section">
        <div class="section-title">FINANCIAL TERMS</div>
        <table><tbody>
          <tr><td style="color:#777">Purchase Price</td><td><strong>${formatPrice(contract.purchasePrice)}</strong></td></tr>
          <tr><td style="color:#777">Advance Amount</td><td>${formatPrice(contract.advanceAmount)}</td></tr>
          <tr><td style="color:#777">Balance Amount</td><td>${formatPrice(contract.balanceAmount)}</td></tr>
          <tr><td style="color:#777">Handover Date</td><td>${contract.handoverDate ? new Date(contract.handoverDate).toLocaleDateString('en-IN') : 'As mutually agreed'}</td></tr>
        </tbody></table>
      </div>
      <div class="section" style="margin-top:40px">
        <div class="section-title">SIGNATURES</div>
        <div class="grid">
          <div class="box" style="text-align:center">
            <div style="height:60px;border:1px dashed #ccc;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px">${contract.buyerSignedAt ? '✓ Signed' : 'Pending'}</div>
            <strong>${contract.buyerName}</strong><br><small>Buyer</small><br><small style="color:#aaa">${contract.buyerSignedAt ? new Date(contract.buyerSignedAt).toLocaleDateString('en-IN') : ''}</small>
          </div>
          <div class="box" style="text-align:center">
            <div style="height:60px;border:1px dashed #ccc;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px">${contract.ownerSignedAt ? '✓ Signed' : 'Pending'}</div>
            <strong>${contract.ownerName || 'Owner'}</strong><br><small>Seller/Owner</small><br><small style="color:#aaa">${contract.ownerSignedAt ? new Date(contract.ownerSignedAt).toLocaleDateString('en-IN') : ''}</small>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin-top:24px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px">
        Contract ID: ${contract.contractNumber} | PropManage Property Services | Generated: ${new Date().toLocaleString('en-IN')}
      </div>
      <script>window.onload = function(){ window.print(); }</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '40px 20px' }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="contract-detail-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 660, width: '100%', maxHeight: 'none' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="contract-detail-title">Contract {contract.contractNumber}</h3>
            <span style={{ fontSize: '0.78rem', background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
              <StatusIcon status={contract.status} /> {cfg.label}
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {/* Parties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#f0f7ff', padding: 14, borderRadius: 8, borderLeft: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: 6 }}>Buyer</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{contract.buyerName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{contract.buyerEmail}</div>
              {contract.buyerPhone && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{contract.buyerPhone}</div>}
            </div>
            <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: 6 }}>Seller / Owner</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{contract.ownerName || '—'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{contract.ownerEmail || '—'}</div>
            </div>
          </div>

          {/* Property */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 14, marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 6 }}>Property</div>
            <div style={{ fontWeight: 700 }}>{contract.propertyTitle}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 2 }}>{contract.propertyAddress}</div>
          </div>

          {/* Financials */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Purchase Price', value: formatPrice(contract.purchasePrice), icon: <FiDollarSign />, color: '#2563eb' },
              { label: 'Advance Paid', value: formatPrice(contract.advanceAmount), icon: <FiCheckCircle />, color: '#16a34a' },
              { label: 'Balance Due', value: formatPrice(contract.balanceAmount), icon: <FiClock />, color: '#d97706' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ color, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Dates & Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: '0.82rem' }}>
            <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 8 }}>
              <FiCalendar size={13} style={{ marginRight: 4 }} />
              <span style={{ color: 'var(--gray-500)' }}>Created:</span> {new Date(contract.createdAt).toLocaleDateString('en-IN')}
            </div>
            <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 8 }}>
              <FiCalendar size={13} style={{ marginRight: 4 }} />
              <span style={{ color: 'var(--gray-500)' }}>Handover:</span> {contract.handoverDate ? new Date(contract.handoverDate).toLocaleDateString('en-IN') : 'TBD'}
            </div>
            <div style={{ padding: 12, background: contract.buyerSignedAt ? '#f0fdf4' : 'var(--gray-50)', borderRadius: 8 }}>
              {contract.buyerSignedAt ? <FiCheckCircle size={13} color="#16a34a" style={{ marginRight: 4 }} /> : <FiClock size={13} style={{ marginRight: 4 }} />}
              <span style={{ color: 'var(--gray-500)' }}>Buyer signed:</span> {contract.buyerSignedAt ? new Date(contract.buyerSignedAt).toLocaleDateString('en-IN') : 'Pending'}
            </div>
            <div style={{ padding: 12, background: contract.ownerSignedAt ? '#f0fdf4' : 'var(--gray-50)', borderRadius: 8 }}>
              {contract.ownerSignedAt ? <FiCheckCircle size={13} color="#16a34a" style={{ marginRight: 4 }} /> : <FiClock size={13} style={{ marginRight: 4 }} />}
              <span style={{ color: 'var(--gray-500)' }}>Owner approved:</span> {contract.ownerSignedAt ? new Date(contract.ownerSignedAt).toLocaleDateString('en-IN') : 'Pending'}
            </div>
          </div>

          {/* ── Step indicator ─────────────────────────────────────────── */}
          {contract.status === 'pending_signatures' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, background: '#f8fafc', borderRadius: 10, padding: '12px 16px' }}>
              {[
                { num: 1, label: 'Terms Accepted', done: true },
                { num: 2, label: 'Pay Advance', done: contract.advancePaid || contract.advanceAmount === 0 },
                { num: 3, label: 'Sign Contract', done: !!contract.buyerSignedAt },
              ].map((step, i) => (
                <React.Fragment key={step.num}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: step.done ? '#16a34a' : '#1a56db', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                      {step.done ? '✓' : step.num}
                    </div>
                    <div style={{ fontSize: '0.72rem', marginTop: 4, color: step.done ? '#16a34a' : '#1a56db', fontWeight: 600, textAlign: 'center' }}>{step.label}</div>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 2, background: step.done ? '#16a34a' : '#e2e8f0', marginBottom: 16 }} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── Razorpay Payment Gate ───────────────────────────────────── */}
          {contract.status === 'pending_signatures' && !contract.advancePaid && contract.advanceAmount > 0 && (
            <div style={{ border: '2px solid #1a56db', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#1a3a6e', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>Price Summary</span>
                <FiLock size={16} color="#90caf9" />
              </div>
              <div style={{ background: '#f0f7ff', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: '#555' }}>
                  <span>Purchase Price</span>
                  <span style={{ fontWeight: 600 }}>₹{contract.purchasePrice?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', color: '#555' }}>
                  <span>Balance Amount</span>
                  <span style={{ fontWeight: 600 }}>₹{contract.balanceAmount?.toLocaleString()}</span>
                </div>
                <div style={{ borderTop: '1px solid #bfdbfe', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>Advance Due Now</span>
                  <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1a56db' }}>₹{contract.advanceAmount?.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ background: 'white', padding: '14px 20px', borderTop: '1px solid #dbeafe' }}>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 12 }}>
                  🔒 Pay the advance amount to unlock contract signing.
                </p>
                <button onClick={handleAdvancePayment} disabled={payingAdvance}
                  style={{ width: '100%', padding: '13px', background: '#1a56db', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: payingAdvance ? 'not-allowed' : 'pointer', opacity: payingAdvance ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {payingAdvance ? 'Opening Razorpay...' : `💳  Pay Advance ₹${contract.advanceAmount?.toLocaleString()}`}
                </button>
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.75rem', color: '#aaa' }}>
                  Secured by <strong>Razorpay</strong> · Cards, Net Banking, Wallets & UPI
                </div>
              </div>
            </div>
          )}

          {/* ── Advance paid banner ─────────────────────────────────────── */}
          {(contract.advancePaid || contract.advanceAmount === 0) && !contract.buyerSignedAt && contract.status === 'pending_signatures' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: justPaid ? '16px' : '10px 16px', marginBottom: 16 }}>
              {justPaid && contract.advanceAmount > 0 ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <FiCheckCircle size={18} color="#16a34a" />
                    <span style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem' }}>Payment Successful</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#166534', margin: 0 }}>
                    Your advance payment has been verified. Continue signing your agreement below.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FiUnlock size={16} color="#16a34a" />
                  <span style={{ fontSize: '0.88rem', color: '#16a34a', fontWeight: 600 }}>
                    {contract.advanceAmount === 0 ? 'No advance required — ' : `Advance of ₹${contract.advanceAmount?.toLocaleString()} paid — `}
                    Signing is now unlocked
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Sign Contract Button ────────────────────────────────────── */}
          {canSign && (
            <button ref={signButtonRef} onClick={handleSign} disabled={signing}
              style={{ width: '100%', padding: '14px', background: signing ? '#94a3b8' : '#16a34a', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: signing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {signing ? 'Signing...' : '✍️  Sign Contract Digitally'}
            </button>
          )}

          {/* Already signed */}
          {contract.buyerSignedAt && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiCheckCircle size={18} color="#16a34a" />
              <div>
                <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '0.9rem' }}>Contract Signed</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Awaiting admin approval · {new Date(contract.buyerSignedAt).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-full" onClick={handlePrint}><FiDownload /> Download PDF</button>
            <button className="btn btn-ghost btn-full" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyContracts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    API.get('/purchase-contracts/my')
      .then(r => {
        const list = r.data.contracts || [];
        setContracts(list);
        // Deep-link support: PropertyDetail's sign wizard redirects here with
        // ?contract=<id> when signing fails because the advance is unpaid —
        // opens straight to that contract's payment gate instead of leaving
        // the buyer to hunt for it in the list.
        const targetId = searchParams.get('contract');
        if (targetId) {
          const match = list.find(c => c._id === targetId);
          if (match) setSelectedContract(match);
        }
      })
      .catch(() => toast.error('Failed to load contracts'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaymentDone = useCallback((updatedContract) => {
    setContracts(prev => prev.map(c => c._id === updatedContract._id ? { ...c, advancePaid: true, advancePaidAt: updatedContract.advancePaidAt } : c));
    setSelectedContract(prev => prev ? { ...prev, advancePaid: true } : prev);
  }, []);

  const handleSigned = useCallback((updatedContract) => {
    setContracts(prev => prev.map(c => c._id === updatedContract._id ? { ...c, buyerSignedAt: updatedContract.buyerSignedAt } : c));
    setSelectedContract(prev => prev ? { ...prev, buyerSignedAt: updatedContract.buyerSignedAt } : prev);
  }, []);

  const filtered = activeTab === 'all' ? contracts : contracts.filter(c => c.status === activeTab);

  const TABS = [
    { key: 'all', label: 'All Contracts' },
    { key: 'pending_signatures', label: 'Pending' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '40px 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>My Contracts</h1>
          <p style={{ color: 'var(--gray-500)' }}>Manage your property purchase agreements</p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Contracts', value: contracts.length, color: '#dbeafe', icon: <FiFileText size={22} /> },
            { label: 'Pending Approval', value: contracts.filter(c => c.status === 'pending_signatures').length, color: '#fef3c7', icon: <FiClock size={22} /> },
            { label: 'Active', value: contracts.filter(c => c.status === 'active').length, color: '#d1fae5', icon: <FiCheckCircle size={22} /> },
            { label: 'Total Value', value: formatPrice(contracts.reduce((s, c) => s + (c.purchasePrice || 0), 0)), color: '#f3e8ff', icon: <FiDollarSign size={22} /> },
          ].map((s, i) => (
            <div key={i} className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: s.color, borderRadius: 12, padding: 12, color: 'var(--primary)' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 4, borderRadius: 10, width: 'fit-content', boxShadow: 'var(--shadow-sm)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', background: activeTab === t.key ? 'var(--primary)' : 'transparent', color: activeTab === t.key ? 'white' : 'var(--gray-600)', transition: 'all 0.15s' }}>
              {t.label} {t.key !== 'all' && `(${contracts.filter(c => c.status === t.key).length})`}
            </button>
          ))}
        </div>

        {/* Contract List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16, boxShadow: 'var(--shadow)' }}>
            <FiFileText size={48} style={{ color: 'var(--gray-300)', marginBottom: 16 }} />
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No contracts yet</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Start by clicking "Purchase Now" on any property listing</p>
            <button className="btn btn-primary" onClick={() => navigate('/properties')}>Browse Properties</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(contract => {
              const cfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
              return (
                <div key={contract._id} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, minWidth: 220 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiHome size={22} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{contract.propertyTitle}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{contract.contractNumber}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>{contract.propertyAddress}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(contract.purchasePrice)}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Advance: {formatPrice(contract.advanceAmount)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ background: cfg.bg, color: cfg.color, padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StatusIcon status={contract.status} /> {cfg.label}
                      </span>
                      {contract.status === 'pending_signatures' && !contract.advancePaid && (
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <FiLock size={11} /> Advance Pending
                        </span>
                      )}
                      {contract.advancePaid && (
                        <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <FiUnlock size={11} /> Advance Paid
                        </span>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>{new Date(contract.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelectedContract(contract)}><FiEye size={14} /> View</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedContract && (
        <ContractDetailModal contract={selectedContract} onClose={() => setSelectedContract(null)} onPaymentDone={handlePaymentDone} onSigned={handleSigned} />
      )}
    </div>
  );
};

export default MyContracts;
