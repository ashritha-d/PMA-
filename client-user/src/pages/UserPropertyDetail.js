import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiMapPin, FiHome, FiFileText,
  FiChevronLeft, FiChevronRight, FiExternalLink,
} from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';
import PropertyForm from '../components/PropertyForm';

const API_BASE = process.env.REACT_APP_API_URL || '';

const statusConfig = {
  Available: { color: '#10b981', bg: '#d1fae5' },
  Occupied: { color: '#3b82f6', bg: '#dbeafe' },
  'Under Maintenance': { color: '#f59e0b', bg: '#fef3c7' },
};

const InfoRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem', flexShrink: 0, marginRight: 16 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>{value}</span>
    </div>
  );
};

const InfoCard = ({ title, children }) => (
  <div className="card card-body" style={{ marginBottom: 20 }}>
    <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem', color: 'var(--gray-700)' }}>{title}</h3>
    {children}
  </div>
);

const UserPropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    API.get(`/user-properties/${id}`)
      .then(r => { setProperty(r.data.property); setLoading(false); })
      .catch(() => { toast.error('Property not found'); navigate('/profile'); });
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${property.propertyName}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/user-properties/${property._id}`);
      toast.success('Property deleted');
      navigate('/profile');
    } catch { toast.error('Failed to delete'); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const r = await API.put(`/user-properties/${property._id}/status`, { status: newStatus });
      setProperty(r.data.property);
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const imgUrl = (url) => url?.startsWith('http') ? url : `${API_BASE}${url}`;

  if (loading) return <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;
  if (!property) return null;

  const images = property.images || [];
  const sc = statusConfig[property.status] || statusConfig.Available;

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '32px 0' }}>
      <div className="container" style={{ maxWidth: 1100 }}>

        {/* Breadcrumb + Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/profile" onClick={() => window.history.length > 1 ? null : null} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', textDecoration: 'none', fontSize: '0.9rem' }}>
              <FiArrowLeft size={16} /> Back to Profile
            </Link>
            <span style={{ color: 'var(--gray-300)' }}>/</span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{property.propertyName}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowEdit(true)} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiEdit2 size={15} /> Edit
            </button>
            <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'inherit' }}>
              <FiTrash2 size={15} /> Delete
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* Left Column */}
          <div>
            {/* Image Gallery */}
            <div className="card" style={{ marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: 380, background: 'var(--gray-100)' }}>
                {images.length > 0 ? (
                  <>
                    <img
                      src={imgUrl(images[activeImg]?.url)}
                      alt={property.propertyName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <FiChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => setActiveImg(i => (i + 1) % images.length)}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <FiChevronRight size={18} />
                        </button>
                        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                          {images.map((_, i) => (
                            <div key={i} onClick={() => setActiveImg(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: i === activeImg ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }} />
                          ))}
                        </div>
                      </>
                    )}
                    <span style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 20 }}>
                      {activeImg + 1} / {images.length}
                    </span>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--gray-300)' }}>
                    <FiHome size={60} />
                    <p style={{ marginTop: 12 }}>No images uploaded</p>
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={imgUrl(img.url)}
                      alt=""
                      onClick={() => setActiveImg(i)}
                      style={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', flexShrink: 0, border: i === activeImg ? '2px solid var(--primary)' : '2px solid transparent', opacity: i === activeImg ? 1 : 0.65 }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <InfoCard title="About This Property">
                <p style={{ color: 'var(--gray-600)', lineHeight: 1.7, fontSize: '0.9rem' }}>{property.description}</p>
              </InfoCard>
            )}

            {/* Documents */}
            {property.documents?.length > 0 && (
              <InfoCard title="Documents">
                {property.documents.map((doc, i) => (
                  <a
                    key={i}
                    href={imgUrl(doc.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 8, textDecoration: 'none', color: 'inherit' }}
                  >
                    <FiFileText size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>{doc.docType}</div>
                    </div>
                    <FiExternalLink size={16} style={{ color: 'var(--gray-400)' }} />
                  </a>
                ))}
              </InfoCard>
            )}

            {/* Future-ready placeholders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Tenant Information', emoji: '👤', note: 'Coming soon' },
                { label: 'Maintenance Records', emoji: '🔧', note: 'Coming soon' },
                { label: 'Lease Agreements', emoji: '📄', note: 'Coming soon' },
                { label: 'Rent Collection', emoji: '💰', note: 'Coming soon' },
              ].map(item => (
                <div key={item.label} className="card card-body" style={{ opacity: 0.6 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>{item.emoji}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Details Sidebar */}
          <div>
            {/* Title & Status */}
            <div className="card card-body" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.25rem', flex: 1, marginRight: 12 }}>{property.propertyName}</h2>
                <span style={{ background: sc.bg, color: sc.color, padding: '5px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  {property.status}
                </span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: 6, color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: 16 }}>
                <FiMapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{[property.address, property.city, property.state, property.country].filter(Boolean).join(', ')}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{property.propertyType}</span>
                <span style={{ background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem' }}>{property.furnishing}</span>
                {property.parking && <span style={{ background: '#d1fae5', color: '#10b981', padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem' }}>🚗 Parking</span>}
              </div>
            </div>

            {/* Quick Status Actions */}
            <div className="card card-body" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>Change Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Available', 'Occupied', 'Under Maintenance'].filter(s => s !== property.status).map(s => {
                  const c = statusConfig[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${c.color}33`, background: c.bg, color: c.color, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    >
                      Mark as {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financial Details */}
            {(property.rentAmount || property.securityDeposit || property.maintenanceCharges || property.salePrice) && (
              <InfoCard title="Financial Details">
                <InfoRow label="Rent" value={property.rentAmount ? `₹${property.rentAmount.toLocaleString()}/mo` : null} />
                <InfoRow label="Security Deposit" value={property.securityDeposit ? `₹${property.securityDeposit.toLocaleString()}` : null} />
                <InfoRow label="Maintenance" value={property.maintenanceCharges ? `₹${property.maintenanceCharges.toLocaleString()}/mo` : null} />
                <InfoRow label="Sale Price" value={property.salePrice ? `₹${property.salePrice.toLocaleString()}` : null} />
              </InfoCard>
            )}

            {/* Property Details */}
            <InfoCard title="Property Details">
              <InfoRow label="Type" value={property.propertyType} />
              <InfoRow label="Total Area" value={property.totalArea ? `${property.totalArea} sq.ft` : null} />
              <InfoRow label="Bedrooms" value={property.bedrooms} />
              <InfoRow label="Bathrooms" value={property.bathrooms} />
              <InfoRow label="Floors" value={property.floors} />
              <InfoRow label="Furnishing" value={property.furnishing} />
              <InfoRow label="Parking" value={property.parking ? 'Yes' : 'No'} />
              <InfoRow label="Pincode" value={property.pincode} />
              <InfoRow label="Listed On" value={new Date(property.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <InfoRow label="Last Updated" value={new Date(property.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            </InfoCard>

            {/* Google Maps */}
            {property.googleMapsLocation && (
              <a
                href={property.googleMapsLocation}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#dbeafe', color: '#3b82f6', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}
              >
                <FiMapPin size={18} /> View on Google Maps <FiExternalLink size={14} style={{ marginLeft: 'auto' }} />
              </a>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <PropertyForm
          property={property}
          onSuccess={() => {
            setShowEdit(false);
            API.get(`/user-properties/${id}`).then(r => setProperty(r.data.property));
            toast.success('Property updated!');
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
};

export default UserPropertyDetail;
