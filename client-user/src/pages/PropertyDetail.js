import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiMaximize, FiMapPin, FiHeart, FiPhone, FiMail, FiCalendar, FiStar, FiCheckCircle } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast from 'react-hot-toast';

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
  const [booking, setBooking] = useState({ visitDate: '', visitTime: '', message: '', bookingType: 'visit' });
  const [review, setReview] = useState({ rating: 5, title: '', comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get(`/properties/${id}`),
      API.get(`/reviews/property/${id}`),
    ]).then(([p, r]) => {
      setProperty(p.data.property);
      setReviews(r.data.reviews || []);
    }).finally(() => setLoading(false));
  }, [id]);

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

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!property) return <div className="loading-screen"><h2>Property not found</h2></div>;

  const images = property.images?.length > 0 ? property.images : [{ url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80' }];

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

      {/* Booking Modal */}
      {showBooking && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule a Visit</h3>
              <button className="modal-close" onClick={() => setShowBooking(false)}>✕</button>
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

      {/* Review Modal */}
      {showReview && (
        <div className="modal-overlay" onClick={() => setShowReview(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Write a Review</h3>
              <button className="modal-close" onClick={() => setShowReview(false)}>✕</button>
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
    </div>
  );
};

export default PropertyDetail;
