import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiHome, FiFileText, FiCalendar, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '';

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: '0.875rem', color: 'var(--gray-800)', fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

const expiryBadge = (dateStr) => {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span style={{ marginLeft: 8, background: '#fee2e2', color: '#991b1b', padding: '1px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>Expired</span>;
  if (days <= 60) return <span style={{ marginLeft: 8, background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>{days}d left</span>;
  return null;
};

const DocCard = ({ label, doc }) => {
  if (!doc?.url) return (
    <div style={{ border: '1px dashed var(--gray-300)', borderRadius: 8, padding: '16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
      <FiFileText size={20} style={{ marginBottom: 6 }} />
      <div>{label}</div>
      <div style={{ fontSize: '0.72rem', marginTop: 2 }}>Not uploaded</div>
    </div>
  );
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url);
  return (
    <a href={`${API_URL}${doc.url}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' }}>
        {isImage ? (
          <img src={`${API_URL}${doc.url}`} alt={label} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ height: 120, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiFileText size={32} color="var(--primary)" />
          </div>
        )}
        <div style={{ padding: '8px 12px', background: 'white' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)' }}>{label}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: 2 }}>Click to view</div>
        </div>
      </div>
    </a>
  );
};

const statusColor = { available: '#10b981', rented: '#1a56db', sold: '#f59e0b', maintenance: '#ef4444' };

const OwnerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get(`/owners/${id}`),
      API.get(`/owners/${id}/properties`),
    ]).then(([ownerRes, propsRes]) => {
      setOwner(ownerRes.data.owner);
      setProperties(propsRes.data.properties || []);
    }).catch(() => {
      toast.error('Failed to load owner profile');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!owner) return <div className="page-header"><p>Owner not found.</p></div>;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/owners')} className="btn btn-ghost btn-icon">
            <FiArrowLeft />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '1.2rem',
            }}>
              {owner.firstName?.[0]?.toUpperCase()}{owner.lastName?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>
                {owner.salutation} {owner.firstName} {owner.lastName}
                <span style={{
                  marginLeft: 10, background: owner.isActive ? '#d1fae5' : '#fee2e2',
                  color: owner.isActive ? '#065f46' : '#991b1b',
                  padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700,
                }}>
                  {owner.isActive ? 'Active' : 'Inactive'}
                </span>
              </h1>
              <p className="page-subtitle" style={{ fontFamily: 'monospace' }}>{owner.ownerCode}</p>
            </div>
          </div>
        </div>
        <Link to={`/owners/edit/${id}`} className="btn btn-primary">
          <FiEdit2 /> Edit Owner
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Personal Info */}
        <div className="card card-body">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Personal Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InfoRow label="Nationality" value={owner.nationality} />
            <InfoRow label="Date of Birth" value={fmt(owner.dateOfBirth)} />
            <InfoRow label="Passport Number" value={owner.passportNumber} />
            <InfoRow label="Emirates ID" value={owner.emiratesId} />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Passport Expiry</span>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-800)', fontWeight: 500 }}>
                {fmt(owner.passportExpiryDate)}{expiryBadge(owner.passportExpiryDate)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Visa Expiry</span>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-800)', fontWeight: 500 }}>
                {fmt(owner.visaExpiryDate)}{expiryBadge(owner.visaExpiryDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="card card-body">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, color: 'var(--gray-600)' }}>
            Contact & Address
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {owner.mobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                <FiPhone size={14} color="var(--primary)" />
                <span>{owner.mobile}</span>
              </div>
            )}
            {owner.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
                <FiMail size={14} color="var(--primary)" />
                <span>{owner.email}</span>
              </div>
            )}
            {(owner.address1 || owner.city) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.875rem' }}>
                <FiMapPin size={14} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  {owner.address1 && <div>{owner.address1}</div>}
                  {owner.address2 && <div>{owner.address2}</div>}
                  <div>{[owner.city, owner.state, owner.country, owner.zipCode].filter(Boolean).join(', ')}</div>
                </div>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <InfoRow label="Added on" value={fmt(owner.createdAt)} />
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiFileText size={16} /> Documents
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <DocCard label="Emirates ID" doc={owner.eidImage} />
          <DocCard label="Passport Copy" doc={owner.passportCopy} />
          <DocCard label="Residence Visa" doc={owner.residenceVisa} />
        </div>
      </div>

      {/* Linked Properties */}
      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiHome size={16} /> Properties ({properties.length})
          </h3>
          <Link to="/properties" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>View all properties</Link>
        </div>
        {properties.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="icon"><FiHome size={28} /></div>
            <h4>No properties linked</h4>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
              Properties linked to owner code <strong>{owner.ownerCode}</strong> will appear here.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.images?.[0] && (
                          <img src={p.images[0].url} alt="" style={{ width: 40, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{p.propertyCode}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-primary">{p.type}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{p.address?.city}</td>
                    <td>
                      <span style={{ background: (statusColor[p.status] || '#6b7280') + '22', color: statusColor[p.status] || '#6b7280', padding: '3px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {p.price ? `₹${p.price.toLocaleString()}` : '—'}
                    </td>
                    <td>
                      <Link to={`/properties/edit/${p._id}`} className="btn btn-icon btn-outline" title="Edit property">
                        <FiEdit2 />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--gray-400)' }}>
        <FiCalendar size={12} />
        Created: {fmt(owner.createdAt)}
        {owner.createdBy?.name && <> by <strong>{owner.createdBy.name}</strong></>}
      </div>
    </div>
  );
};

export default OwnerProfile;
