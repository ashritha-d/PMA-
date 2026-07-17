import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMaximize, FiMapPin, FiHeart, FiPhone, FiMail, FiCalendar, FiStar, FiCheckCircle, FiFileText, FiShoppingCart, FiX, FiChevronRight, FiChevronLeft, FiDownload, FiEdit3 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast from 'react-hot-toast';
import PropertyLocationMap from '../components/PropertyLocationMap';

// ─── Signature Canvas ────────────────────────────────────────────────────────
const SignatureCanvas = ({ canvasRef }) => {
  const isDrawing = useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawing.current = true;
  }, [canvasRef]);

  const draw = useCallback((e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [canvasRef]);

  const stopDrawing = useCallback(() => { isDrawing.current = false; }, []);

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={140}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      style={{ border: '2px dashed #d1d5db', borderRadius: 8, cursor: 'crosshair', touchAction: 'none', width: '100%', background: '#fafafa' }}
    />
  );
};

// ─── Contract Print View ──────────────────────────────────────────────────────
const ContractDocument = ({ contract, property, buyer }) => {
  const fmt = (n) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${Number(n || 0).toLocaleString()}`;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div id="contract-print-area" style={{ fontFamily: 'serif', lineHeight: 1.7, color: '#111', fontSize: '0.9rem' }}>
      <div style={{ textAlign: 'center', borderBottom: '3px double #333', paddingBottom: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>PROPERTY PURCHASE AGREEMENT</h2>
        <div style={{ fontSize: '0.8rem', color: '#555' }}>Contract No: <strong>{contract.contractNumber || 'DRAFT'}</strong> &nbsp;|&nbsp; Date: <strong>{today}</strong></div>
      </div>

      <p style={{ marginBottom: 16 }}>
        This Property Purchase Agreement ("Agreement") is entered into on <strong>{today}</strong> between:
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#f0f7ff', padding: 16, borderRadius: 8, borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.85rem', color: '#2563eb' }}>BUYER</div>
          <div><strong>{contract.buyerName || `${buyer?.firstName} ${buyer?.lastName}`}</strong></div>
          <div style={{ fontSize: '0.82rem', color: '#444', marginTop: 4 }}>{contract.buyerEmail || buyer?.email}</div>
          {(contract.buyerPhone || buyer?.phone) && <div style={{ fontSize: '0.82rem', color: '#444' }}>{contract.buyerPhone || buyer?.phone}</div>}
        </div>
        <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.85rem', color: '#16a34a' }}>SELLER / OWNER</div>
          <div><strong>{contract.ownerName || property?.ownerInfo?.name || (property?.createdByUser ? `${property.createdByUser.firstName} ${property.createdByUser.lastName}` : 'PropManage Agent')}</strong></div>
          <div style={{ fontSize: '0.82rem', color: '#444', marginTop: 4 }}>{contract.ownerEmail || property?.ownerInfo?.email || property?.createdByUser?.email || ''}</div>
          {(contract.ownerPhone || property?.ownerInfo?.phone || property?.createdByUser?.phone) && <div style={{ fontSize: '0.82rem', color: '#444' }}>{contract.ownerPhone || property?.ownerInfo?.phone || property?.createdByUser?.phone}</div>}
        </div>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>PROPERTY DETAILS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.85rem' }}>
          <div><span style={{ color: '#777' }}>Property:</span> <strong>{contract.propertyTitle || property?.title}</strong></div>
          <div><span style={{ color: '#777' }}>Property ID:</span> <strong>{contract.propertyCode || property?.propertyCode}</strong></div>
          <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#777' }}>Address:</span> <strong>{contract.propertyAddress || [property?.address?.line1, property?.address?.city, property?.address?.state].filter(Boolean).join(', ')}</strong></div>
          {property?.type && <div><span style={{ color: '#777' }}>Type:</span> <strong style={{ textTransform: 'capitalize' }}>{property.type}</strong></div>}
          {property?.features?.builtupArea && <div><span style={{ color: '#777' }}>Area:</span> <strong>{property.features.builtupArea} sqft</strong></div>}
        </div>
      </div>

      <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>FINANCIAL TERMS</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <tbody>
            {[
              ['Agreed Purchase Price', fmt(contract.purchasePrice || property?.price)],
              ['Token / Advance Amount', fmt(contract.advanceAmount)],
              ['Balance Amount', fmt(contract.balanceAmount)],
              ['Property Handover Date', contract.handoverDate ? new Date(contract.handoverDate).toLocaleDateString('en-IN') : 'As mutually agreed'],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 4px', color: '#555' }}>{k}</td>
                <td style={{ padding: '8px 4px', fontWeight: 700, textAlign: 'right' }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contract.paymentSchedule?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>PAYMENT SCHEDULE</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e5e7eb' }}>
            <thead style={{ background: '#f3f4f6' }}>
              <tr>
                {['Due Date', 'Amount', 'Description', 'Status'].map(h => <th key={h} style={{ padding: 8, textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {contract.paymentSchedule.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8 }}>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: 8, fontWeight: 600 }}>{fmt(item.amount)}</td>
                  <td style={{ padding: 8 }}>{item.description || '—'}</td>
                  <td style={{ padding: 8, textTransform: 'capitalize' }}>{item.status || 'pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>TERMS & CONDITIONS</div>
        <ol style={{ paddingLeft: 20, fontSize: '0.82rem', color: '#444' }}>
          <li style={{ marginBottom: 6 }}>The Buyer agrees to purchase the above-described property from the Seller at the agreed purchase price stated herein.</li>
          <li style={{ marginBottom: 6 }}>The Advance/Token Amount specified shall be paid within 3 business days of signing this agreement.</li>
          <li style={{ marginBottom: 6 }}>The balance amount shall be payable as per the payment schedule outlined above, failing which this agreement may be terminated at the Seller's discretion.</li>
          <li style={{ marginBottom: 6 }}>The Seller shall ensure that the property is free from all encumbrances, liens, and disputes at the time of handover.</li>
          <li style={{ marginBottom: 6 }}>All property taxes, society charges, and utility dues up to the date of handover shall be settled by the Seller.</li>
          <li style={{ marginBottom: 6 }}>The property shall be handed over to the Buyer on or before the Handover Date specified, subject to full payment receipt.</li>
          <li style={{ marginBottom: 6 }}>Both parties agree to execute a registered Sale Deed within 30 days of this agreement.</li>
          <li style={{ marginBottom: 6 }}>This agreement is binding upon both parties and their respective heirs, executors, and assigns.</li>
        </ol>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>CANCELLATION & REFUND POLICY</div>
        <ol style={{ paddingLeft: 20, fontSize: '0.82rem', color: '#444' }}>
          <li style={{ marginBottom: 6 }}>If the Buyer cancels this agreement within 7 days of signing, 50% of the advance amount shall be refunded.</li>
          <li style={{ marginBottom: 6 }}>If the Buyer cancels after 7 days, the advance amount shall be forfeited entirely unless mutually agreed otherwise.</li>
          <li style={{ marginBottom: 6 }}>If the Seller cancels this agreement, the full advance amount plus an equal penalty shall be refunded to the Buyer.</li>
          <li style={{ marginBottom: 6 }}>Force majeure events shall be treated separately as mutually agreed upon by both parties.</li>
        </ol>
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, marginTop: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>DIGITAL SIGNATURES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[['Buyer', contract.buyerName], ['Seller/Owner', contract.ownerName]].map(([role, name]) => (
            <div key={role} style={{ textAlign: 'center' }}>
              <div style={{ border: '1px dashed #d1d5db', height: 60, borderRadius: 8, marginBottom: 8, background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#9ca3af' }}>Signature</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{name || role}</div>
              <div style={{ fontSize: '0.75rem', color: '#777' }}>{role}</div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>Date: ___________</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.75rem', color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        This is a digitally generated document. Contract ID: {contract.contractNumber || 'DRAFT'} | PropManage Property Services
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PropertyDetail = () => {
  const { id } = useParams();
  const { user, toggleFavorite, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [booking, setBooking] = useState({ visitDate: '', visitTime: '', message: '', bookingType: 'visit' });
  const [review, setReview] = useState({ rating: 5, title: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);

  // Purchase wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [contractForm, setContractForm] = useState({ advanceAmount: '', handoverDate: '', termsAccepted: false, paymentSchedule: [] });
  const [createdContract, setCreatedContract] = useState(null);
  const [showAdvanceRequiredModal, setShowAdvanceRequiredModal] = useState(false);
  const canvasRef = useRef(null);

  // True once the contract's advance is either fully paid or wasn't required
  // in the first place — the single source of truth for whether the
  // signature pad should be usable.
  const advanceSatisfied = !createdContract || createdContract.advanceAmount === 0 || createdContract.advancePaid;

  useEffect(() => {
    Promise.all([
      API.get(`/properties/${id}`),
      API.get(`/reviews/property/${id}`),
    ]).then(([p, r]) => {
      setProperty(p.data.property);
      setReviews(r.data.reviews || []);
    }).finally(() => setLoading(false));
  }, [id]);

  // React Router doesn't auto-scroll to a #hash on client-side navigation
  // (unlike a full page load) — needed so the "View on Map" card link
  // actually lands on the location section once it's rendered.
  useEffect(() => {
    if (!property || !window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [property]);

  const isFav = user?.favorites?.includes(id);
  const formatPrice = (p) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : p >= 100000 ? `₹${(p / 100000).toFixed(1)}L` : `₹${p?.toLocaleString()}`;

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('Please login to book'); navigate('/login'); return; }
    setSubmitting(true);
    try {
      await API.post('/bookings', { ...booking, property: id });
      toast.success('Booking request sent!');
      setShowBooking(false);
      setBooking({ visitDate: '', visitTime: '', message: '', bookingType: 'visit' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setSubmitting(false); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { toast.error('Please login to review'); return; }
    setSubmitting(true);
    try {
      const { data } = await API.post('/reviews', { ...review, property: id });
      setReviews(prev => [data.review, ...prev]);
      toast.success('Review submitted!');
      setShowReview(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed');
    } finally { setSubmitting(false); }
  };

  const handleInquiry = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      await API.post('/inquiries', { property: id, name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone, message: `I am interested in this property: ${property.title}`, type: 'property' });
      toast.success('Inquiry sent! We\'ll contact you soon.');
    } catch (err) {
      toast.error('Failed to send inquiry');
    }
  };

  const openPurchaseWizard = () => {
    if (!isAuthenticated) { toast.error('Please login to proceed'); navigate('/login'); return; }
    const defaultAdvance = Math.round((property.price || 0) * 0.1);
    setContractForm({ advanceAmount: defaultAdvance, handoverDate: '', termsAccepted: false, paymentSchedule: [] });
    setWizardStep(1);
    setCreatedContract(null);
    setShowPurchase(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCreateContract = async () => {
    setSubmitting(true);
    try {
      const { data } = await API.post('/purchase-contracts', {
        propertyId: id,
        advanceAmount: contractForm.advanceAmount,
        handoverDate: contractForm.handoverDate || undefined,
        paymentSchedule: contractForm.paymentSchedule,
      });
      setCreatedContract(data.contract);
      // Accept terms
      await API.put(`/purchase-contracts/${data.contract._id}/accept-terms`);
      setCreatedContract(prev => ({ ...prev, status: 'pending_signatures', buyerTermsAcceptedAt: new Date() }));
      setWizardStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create contract');
    } finally { setSubmitting(false); }
  };

  const handleSign = async () => {
    if (!canvasRef.current) return;
    const signatureData = canvasRef.current.toDataURL('image/png');
    // Check if canvas is blank
    const blank = document.createElement('canvas');
    blank.width = canvasRef.current.width;
    blank.height = canvasRef.current.height;
    if (signatureData === blank.toDataURL()) { toast.error('Please draw your signature'); return; }

    setSubmitting(true);
    try {
      await API.post(`/purchase-contracts/${createdContract._id}/sign`, { signatureData });
      toast.success('Contract signed successfully!');
      setWizardStep(5);
    } catch (err) {
      const message = err.response?.data?.message || 'Signing failed';
      // The signature pad is locked whenever advanceSatisfied is false, so
      // this specific error should be unreachable in normal use — it's a
      // fallback for the edge case where payment state went stale between
      // render and submit (e.g. another tab). Shown as a proper modal
      // rather than a bare toast, matching the locked-pad panel below.
      if (message.toLowerCase().includes('advance payment')) {
        setShowAdvanceRequiredModal(true);
      } else {
        toast.error(message);
      }
    } finally { setSubmitting(false); }
  };

  const goToPayAdvance = () => {
    setShowAdvanceRequiredModal(false);
    setShowPurchase(false);
    navigate(`/my-contracts?contract=${createdContract._id}`);
  };

  const handleDownloadPDF = () => {
    const printContent = document.getElementById('contract-print-area');
    if (!printContent) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Purchase Contract - ${createdContract?.contractNumber || 'Draft'}</title>
      <style>
        body { font-family: Georgia, serif; margin: 40px; color: #111; }
        * { box-sizing: border-box; }
        @media print { body { margin: 20px; } }
      </style></head><body>
      ${printContent.innerHTML}
      <script>window.onload = function(){ window.print(); }</script>
      </body></html>
    `);
    w.document.close();
  };

  const STEPS = ['Property', 'Payment Terms', 'Preview', 'Sign', 'Confirm'];

  const balance = (property?.price || 0) - Number(contractForm.advanceAmount || 0);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!property) return <div className="loading-screen"><h2>Property not found</h2></div>;

  const API_BASE = process.env.REACT_APP_API_URL || '';
  const resolveImg = (url) => url?.startsWith('http') ? url : `${API_BASE}${url}`;
  const images = property.images?.length > 0
    ? property.images.map(img => ({ ...img, url: resolveImg(img.url) }))
    : [{ url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80' }];

  return (
    <div style={{ background: 'var(--gray-50)', paddingBottom: 80 }}>
      <div className="container" style={{ paddingTop: 40 }}>
        {/* Breadcrumb */}
        <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 24 }}>
          <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate('/')}>Home</span> › <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate('/properties')}>Properties</span> › {property.title}
        </div>

        {/* Image Gallery */}
        <div className="property-gallery" style={{ marginBottom: 40 }}>
          <div className="property-gallery-main" style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}>
            <img src={images[activeImg]?.url} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {images.length > 1 && (
            <div className="property-gallery-side">
              {images.slice(1, 3).map((img, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative' }} onClick={() => setActiveImg(i + 1)}>
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === 1 && images.length > 3 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem', fontWeight: 700 }}>+{images.length - 3} more</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 40, overflowX: 'auto', paddingBottom: 8 }}>
            {images.map((img, i) => (
              <img key={i} src={img.url} alt="" onClick={() => setActiveImg(i)} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: activeImg === i ? '3px solid var(--primary)' : '3px solid transparent', flexShrink: 0 }} />
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40, alignItems: 'start' }}>
          {/* Left: Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span className={`badge ${property.listingType === 'rent' ? 'badge-primary' : 'badge-success'}`}>{property.listingType === 'rent' ? 'For Rent' : 'For Sale'}</span>
                  <span className="badge badge-gray">{property.type?.charAt(0).toUpperCase() + property.type?.slice(1)}</span>
                  {property.status === 'available' ? <span className="badge badge-success">Available</span> : <span className="badge badge-danger">Not Available</span>}
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 8 }}>{property.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)' }}>
                  <FiMapPin /> {property.address?.line1 && `${property.address.line1}, `}{property.address?.city}, {property.address?.state}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(property.price)}</div>
                {property.listingType === 'rent' && <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>/{property.priceUnit || 'month'}</div>}
                <button onClick={() => toggleFavorite(id)} style={{ marginTop: 8, background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: isFav ? '#ef4444' : 'var(--gray-400)' }}>
                  <FiHeart fill={isFav ? '#ef4444' : 'none'} />
                </button>
              </div>
            </div>

            {/* Key Features */}
            <div style={{ display: 'flex', gap: 24, padding: '24px', background: 'white', borderRadius: 12, marginBottom: 32, flexWrap: 'wrap' }}>
              {property.features?.bedrooms > 0 && <div style={{ textAlign: 'center' }}><span style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 4px' }}>🛏</span><strong>{property.features.bedrooms}</strong><div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Bedrooms</div></div>}
              {property.features?.bathrooms > 0 && <div style={{ textAlign: 'center' }}><span style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 4px' }}>🚿</span><strong>{property.features.bathrooms}</strong><div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Bathrooms</div></div>}
              {property.features?.builtupArea > 0 && <div style={{ textAlign: 'center' }}><FiMaximize style={{ fontSize: '1.5rem', color: 'var(--primary)', display: 'block', margin: '0 auto 4px' }} /><strong>{property.features.builtupArea}</strong><div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Built-up sqft</div></div>}
              {property.features?.carParkings > 0 && <div style={{ textAlign: 'center' }}><span style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 4px' }}>🚗</span><strong>{property.features.carParkings}</strong><div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Parking</div></div>}
              {property.features?.facing && <div style={{ textAlign: 'center' }}><span style={{ fontSize: '1.5rem', display: 'block', margin: '0 auto 4px' }}>🧭</span><strong>{property.features.facing}</strong><div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Facing</div></div>}
            </div>

            {/* Description */}
            <div style={{ background: 'white', borderRadius: 12, padding: 28, marginBottom: 28 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Property Description</h3>
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.8 }}>{property.description}</p>
            </div>

            {/* Amenities */}
            {property.amenities?.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: 28, marginBottom: 28 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Amenities</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {property.amenities.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-600)' }}><FiCheckCircle color="var(--accent)" />{a}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <PropertyLocationMap property={property} />

            {/* Reviews */}
            <div style={{ background: 'white', borderRadius: 12, padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700 }}>Reviews ({property.reviewCount || 0})</h3>
                {isAuthenticated && <button className="btn btn-outline btn-sm" onClick={() => setShowReview(true)}>Write Review</button>}
              </div>
              {property.rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--dark)' }}>{property.rating}</div>
                  <div>
                    <div className="stars">{[1,2,3,4,5].map(s => <FiStar key={s} fill={s <= property.rating ? '#f59e0b' : 'none'} color="#f59e0b" />)}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Based on {property.reviewCount} reviews</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {reviews.map(r => (
                  <div key={r._id} style={{ borderBottom: '1px solid var(--gray-100)', paddingBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{r.user?.firstName?.[0]}</div>
                        <div><strong>{r.user?.firstName} {r.user?.lastName}</strong><div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{new Date(r.createdAt).toLocaleDateString()}</div></div>
                      </div>
                      <div className="stars">{[1,2,3,4,5].map(s => <FiStar key={s} size={14} fill={s <= r.rating ? '#f59e0b' : 'none'} color="#f59e0b" />)}</div>
                    </div>
                    {r.title && <strong style={{ display: 'block', marginBottom: 4 }}>{r.title}</strong>}
                    <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>{r.comment}</p>
                  </div>
                ))}
                {reviews.length === 0 && <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 24 }}>No reviews yet. Be the first to review!</p>}
              </div>
            </div>
          </div>

          {/* Right: Contact Card */}
          <div style={{ position: 'sticky', top: 90 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Contact Agent</h3>
              {property.ownerInfo && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, padding: '16px', background: 'var(--gray-50)', borderRadius: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700 }}>{property.ownerInfo.name?.[0] || 'A'}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{property.ownerInfo.name || 'PropManage Agent'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Property Agent</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button className="btn btn-primary btn-full" onClick={() => setShowBooking(true)}><FiCalendar /> Schedule Visit</button>
                <button className="btn btn-outline btn-full" onClick={handleInquiry}><FiMail /> Send Inquiry</button>
                {property.ownerInfo?.phone && (
                  <a href={`tel:${property.ownerInfo.phone}`} className="btn btn-ghost btn-full"><FiPhone /> {property.ownerInfo.phone}</a>
                )}
                <a href={`https://wa.me/919999999999?text=Hi, I'm interested in ${property.title}`} target="_blank" rel="noopener noreferrer" className="btn btn-full" style={{ background: '#25d366', color: 'white' }}><FaWhatsapp /> WhatsApp</a>
                <button
                  className="btn btn-full"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontWeight: 700, fontSize: '1rem', gap: 8 }}
                  onClick={openPurchaseWizard}
                >
                  <FiShoppingCart /> Purchase Now
                </button>
              </div>
            </div>

            {/* Property Details Sidebar */}
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Property Details</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Property ID', property.propertyCode],
                  ['Type', property.type],
                  ['Listing', property.listingType === 'rent' ? 'For Rent' : 'For Sale'],
                  ['Furnished', property.features?.furnished],
                  ['Land Area', property.features?.landArea ? `${property.features.landArea} sqft` : null],
                  ['Year Built', property.features?.yearOfConstruction],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--gray-100)', paddingBottom: 8, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--gray-500)' }}>{k}</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Booking Modal ─────────────────────────────────────────────────── */}
      {showBooking && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" id="booking-modal-title">Schedule a Visit</h3>
              <button className="modal-close" onClick={() => setShowBooking(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleBooking}>
                <div className="form-group">
                  <label className="form-label">Visit Date</label>
                  <input type="date" className="form-input" required min={new Date().toISOString().split('T')[0]} value={booking.visitDate} onChange={e => setBooking({ ...booking, visitDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Time</label>
                  <select className="form-select" value={booking.visitTime} onChange={e => setBooking({ ...booking, visitTime: e.target.value })}>
                    <option value="">Select time</option>
                    {['9:00 AM','10:00 AM','11:00 AM','12:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Message (Optional)</label>
                  <textarea className="form-textarea" placeholder="Any specific requirements or questions?" value={booking.message} onChange={e => setBooking({ ...booking, message: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>{submitting ? 'Submitting...' : 'Confirm Booking'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Review Modal ──────────────────────────────────────────────────── */}
      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" id="review-modal-title">Write a Review</h3>
              <button className="modal-close" onClick={() => setShowReview(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleReview}>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <div className="stars" style={{ fontSize: '2rem', cursor: 'pointer' }}>
                    {[1,2,3,4,5].map(s => <FiStar key={s} fill={s <= review.rating ? '#f59e0b' : 'none'} color="#f59e0b" onClick={() => setReview({ ...review, rating: s })} />)}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-input" placeholder="Review title" value={review.title} onChange={e => setReview({ ...review, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Review *</label>
                  <textarea className="form-textarea" required placeholder="Share your experience..." value={review.comment} onChange={e => setReview({ ...review, comment: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Review'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── Purchase Now Wizard ───────────────────────────────────────────── */}
      {showPurchase && (
        <div className="modal-overlay" onClick={() => { if (wizardStep < 5) setShowPurchase(false); }} style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '40px 20px' }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="purchase-wizard-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '100%', maxHeight: 'none' }}>
            {/* Wizard Header */}
            <div style={{ padding: '24px 28px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h3 id="purchase-wizard-title" style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Property Purchase Agreement Wizard</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 2 }}>{property.title}</div>
                </div>
                {wizardStep < 5 && <button className="modal-close" onClick={() => setShowPurchase(false)} aria-label="Close"><FiX aria-hidden="true" /></button>}
              </div>
              {/* Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
                {STEPS.map((label, i) => {
                  const step = i + 1;
                  const done = step < wizardStep;
                  const active = step === wizardStep;
                  return (
                    <React.Fragment key={label}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', background: done ? '#16a34a' : active ? 'var(--primary)' : '#e5e7eb', color: done || active ? 'white' : 'var(--gray-500)', marginBottom: 6, transition: 'all 0.2s' }}>
                          {done ? <FiCheckCircle size={16} /> : step}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: active ? 'var(--primary)' : 'var(--gray-400)', fontWeight: active ? 700 : 400, textAlign: 'center' }}>{label}</div>
                      </div>
                      {i < STEPS.length - 1 && <div style={{ height: 2, flex: 2, background: done ? '#16a34a' : '#e5e7eb', margin: '0 4px', marginBottom: 22, transition: 'background 0.2s' }} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div style={{ padding: '0 28px 28px' }}>

              {/* STEP 1: Property & Parties */}
              {wizardStep === 1 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div style={{ background: '#f0f7ff', padding: 16, borderRadius: 10, borderLeft: '4px solid #2563eb' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Buyer (You)</div>
                      <div style={{ fontWeight: 700 }}>{user?.firstName} {user?.lastName}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 4 }}>{user?.email}</div>
                      {user?.phone && <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{user?.phone}</div>}
                    </div>
                    <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 10, borderLeft: '4px solid #16a34a' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Seller / Owner</div>
                      <div style={{ fontWeight: 700 }}>
                        {property.ownerInfo?.name ||
                          (property.createdByUser ? `${property.createdByUser.firstName} ${property.createdByUser.lastName}` : 'PropManage Agent')}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 4 }}>
                        {property.ownerInfo?.email || property.createdByUser?.email || '—'}
                      </div>
                      {(property.ownerInfo?.phone || property.createdByUser?.phone) && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                          {property.ownerInfo?.phone || property.createdByUser?.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Property Being Purchased</div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{property.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 4 }}><FiMapPin size={12} style={{ marginRight: 4 }} />{[property.address?.line1, property.address?.city, property.address?.state].filter(Boolean).join(', ')}</div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      {property.features?.bedrooms > 0 && <span style={{ fontSize: '0.8rem' }}>🛏 {property.features.bedrooms} BHK</span>}
                      {property.features?.builtupArea > 0 && <span style={{ fontSize: '0.8rem' }}>📐 {property.features.builtupArea} sqft</span>}
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>💰 {formatPrice(property.price)}</span>
                    </div>
                  </div>

                  <button className="btn btn-primary btn-full" onClick={() => setWizardStep(2)}>
                    Continue to Payment Terms <FiChevronRight />
                  </button>
                </div>
              )}

              {/* STEP 2: Payment Terms */}
              {wizardStep === 2 && (
                <div>
                  <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Total Purchase Price</span>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>{formatPrice(property.price)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Token/Advance (editable)</span>
                      <span style={{ fontWeight: 600 }}>{formatPrice(contractForm.advanceAmount || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--gray-100)', paddingTop: 8, marginTop: 8 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Balance Amount</span>
                      <span style={{ fontWeight: 800, color: balance >= 0 ? '#16a34a' : '#ef4444' }}>{formatPrice(Math.max(0, balance))}</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Token / Advance Amount (₹) *</label>
                    <input type="number" className="form-input" min={0} max={property.price} value={contractForm.advanceAmount} onChange={e => setContractForm(p => ({ ...p, advanceAmount: e.target.value }))} />
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>Typically 10-20% of total price</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Property Handover Date</label>
                    <input type="date" className="form-input" min={new Date().toISOString().split('T')[0]} value={contractForm.handoverDate} onChange={e => setContractForm(p => ({ ...p, handoverDate: e.target.value }))} />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline btn-full" onClick={() => setWizardStep(1)}><FiChevronLeft /> Back</button>
                    <button className="btn btn-primary btn-full" onClick={() => setWizardStep(3)} disabled={!contractForm.advanceAmount || contractForm.advanceAmount > property.price}>
                      Preview Contract <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Contract Preview */}
              {wizardStep === 3 && (
                <div>
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, padding: 20, maxHeight: 420, overflowY: 'auto', marginBottom: 20, background: 'white' }}>
                    <ContractDocument
                      contract={{ ...contractForm, purchasePrice: property.price, balanceAmount: balance, buyerName: `${user?.firstName} ${user?.lastName}`, buyerEmail: user?.email, ownerName: property.ownerInfo?.name, ownerEmail: property.ownerInfo?.email }}
                      property={property}
                      buyer={user}
                    />
                  </div>

                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 20, padding: 14, background: '#f0fdf4', borderRadius: 8, border: `2px solid ${contractForm.termsAccepted ? '#16a34a' : '#d1d5db'}` }}>
                    <input type="checkbox" checked={contractForm.termsAccepted} onChange={e => setContractForm(p => ({ ...p, termsAccepted: e.target.checked }))} style={{ marginTop: 3, accentColor: '#16a34a', width: 16, height: 16, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                      I have read and agree to all the <strong>Terms & Conditions</strong>, <strong>Cancellation Policy</strong>, and <strong>Payment Schedule</strong> stated in this contract. I understand this constitutes a legally binding agreement.
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline btn-full" onClick={() => setWizardStep(2)}><FiChevronLeft /> Back</button>
                    <button
                      className="btn btn-full"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontWeight: 700 }}
                      disabled={!contractForm.termsAccepted || submitting}
                      onClick={handleCreateContract}
                    >
                      {submitting ? 'Creating Contract...' : (<><FiFileText /> Accept & Continue to Sign</>)}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Digital Signature */}
              {wizardStep === 4 && (
                <div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <FiCheckCircle color="#16a34a" />
                      <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>Contract Created: {createdContract?.contractNumber}</span>
                    </div>
                  </div>

                  {/* Payment-status indicator — only meaningful when an advance is required */}
                  {createdContract?.advanceAmount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: advanceSatisfied ? '#f0fdf4' : '#fffbeb', border: `1px solid ${advanceSatisfied ? '#bbf7d0' : '#fde68a'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: advanceSatisfied ? '#15803d' : '#92400e' }}>Advance Payment</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: advanceSatisfied ? '#15803d' : '#92400e' }}>
                        {advanceSatisfied ? `✔ ₹${createdContract.advanceAmount.toLocaleString()} Paid` : '● Pending'}
                      </span>
                    </div>
                  )}

                  {!advanceSatisfied ? (
                    <div style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: 24, textAlign: 'center', marginBottom: 20 }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔒</div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Digital Signature Disabled</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16 }}>
                        Complete the advance payment of <strong>₹{createdContract?.advanceAmount?.toLocaleString()}</strong> before you can sign this contract.
                      </p>
                      <button type="button" className="btn btn-primary" onClick={goToPayAdvance}>💳 Pay Advance Now</button>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', marginBottom: 16 }}>
                        Please sign below using your mouse or finger to digitally sign the contract.
                      </p>

                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label className="form-label" style={{ margin: 0 }}>Your Digital Signature *</label>
                          <button type="button" onClick={clearSignature} style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}><FiEdit3 size={12} /> Clear</button>
                        </div>
                        <SignatureCanvas canvasRef={canvasRef} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 6 }}>Draw your signature in the box above</div>
                      </div>

                      <div style={{ background: '#fffbeb', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: '0.8rem', color: '#92400e' }}>
                        <strong>Legal Notice:</strong> By clicking "Sign Contract", you acknowledge that this digital signature is legally equivalent to a handwritten signature and you are entering into a binding purchase agreement.
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline btn-full" onClick={() => setWizardStep(3)}><FiChevronLeft /> Back</button>
                    {advanceSatisfied && (
                      <button
                        className="btn btn-full"
                        style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontWeight: 700 }}
                        disabled={submitting}
                        onClick={handleSign}
                      >
                        {submitting ? 'Signing...' : <><FiEdit3 /> Sign Contract</>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: Confirmation */}
              {wizardStep === 5 && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <FiCheckCircle size={40} color="#16a34a" />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8, color: '#15803d' }}>Contract Signed Successfully!</h3>
                  <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
                    Your purchase contract has been signed and submitted for review. The admin will verify and approve the contract.
                  </p>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 24, textAlign: 'left' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                      <div><span style={{ color: 'var(--gray-500)' }}>Contract ID</span><br /><strong>{createdContract?.contractNumber}</strong></div>
                      <div><span style={{ color: 'var(--gray-500)' }}>Status</span><br /><span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.78rem' }}>Pending Approval</span></div>
                      <div><span style={{ color: 'var(--gray-500)' }}>Property</span><br /><strong>{property.title}</strong></div>
                      <div><span style={{ color: 'var(--gray-500)' }}>Purchase Price</span><br /><strong>{formatPrice(property.price)}</strong></div>
                      <div><span style={{ color: 'var(--gray-500)' }}>Advance Paid</span><br /><strong>{formatPrice(createdContract?.advanceAmount || 0)}</strong></div>
                      <div><span style={{ color: 'var(--gray-500)' }}>Remaining Balance</span><br /><strong>{formatPrice(createdContract?.balanceAmount || 0)}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={handleDownloadPDF}>
                      <FiDownload /> Download Agreement
                    </button>
                    <button className="btn btn-primary" onClick={() => { setShowPurchase(false); navigate('/my-contracts'); }}>
                      View My Contracts
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowPurchase(false)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advance Payment Required — fallback modal for the edge case where
          payment state went stale between render and submit; the locked
          panel above is the primary prevention. */}
      {showAdvanceRequiredModal && (
        <div className="modal-overlay" onClick={() => setShowAdvanceRequiredModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="advance-required-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔒</div>
              <h3 id="advance-required-title" style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: 10 }}>Advance Payment Required</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: 20 }}>
                This contract requires the advance payment before it can be digitally signed.
              </p>
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', fontWeight: 600 }}>Advance Amount</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(createdContract?.advanceAmount || 0)}</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setShowAdvanceRequiredModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" onClick={goToPayAdvance}>Pay Advance</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden contract document for PDF printing */}
      {createdContract && (
        <div style={{ display: 'none' }}>
          <ContractDocument contract={createdContract} property={property} buyer={user} />
        </div>
      )}
    </div>
  );
};

export default PropertyDetail;
