import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiFileText, FiCalendar, FiPhone, FiMail, FiBriefcase, FiHome, FiDollarSign } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '';

const STATUS_STYLES = {
  active:  { bg: '#d1fae5', color: '#065f46' },
  former:  { bg: '#f3f4f6', color: '#374151' },
  pending: { bg: '#fef3c7', color: '#92400e' },
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: '0.875rem', color: 'var(--gray-800)', fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

const expiryBadge = (dateStr) => {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span style={{ marginLeft: 6, background: '#fee2e2', color: '#991b1b', padding: '1px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>Expired</span>;
  if (days <= 60) return <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700 }}>{days}d left</span>;
  return null;
};

const DocCard = ({ label, doc }) => {
  if (!doc?.url) return (
    <div style={{ border: '1px dashed var(--gray-300)', borderRadius: 8, padding: '14px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.78rem' }}>
      <FiFileText size={18} style={{ marginBottom: 4 }} />
      <div>{label}</div>
      <div style={{ fontSize: '0.7rem', marginTop: 2 }}>Not uploaded</div>
    </div>
  );
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.url);
  return (
    <a href={`${API_URL}${doc.url}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}>
        {isImage
          ? <img src={`${API_URL}${doc.url}`} alt={label} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: 100, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiFileText size={28} color="var(--primary)" /></div>
        }
        <div style={{ padding: '7px 12px', background: 'white' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--gray-700)' }}>{label}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--primary)', marginTop: 1 }}>View</div>
        </div>
      </div>
    </a>
  );
};

const DOC_FIELDS = [
  ['passportCopy', 'Passport Copy'],
  ['eidCopy', 'Emirates ID Copy'],
  ['residenceVisa', 'Residence Visa'],
  ['bankStatement', 'Bank Statement'],
  ['depositCheque', 'Deposit Cheque'],
  ['securityCheque', 'Security Cheque'],
  ['ejariRegistration', 'Ejari / Municipal Reg.'],
];

const TenantProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/tenants/${id}`)
      .then(({ data }) => setTenant(data.tenant))
      .catch(() => toast.error('Failed to load tenant profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!tenant) return <div className="page-header"><p>Tenant not found.</p></div>;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
  const s = STATUS_STYLES[tenant.status] || STATUS_STYLES.pending;

  const leaseProgress = () => {
    if (!tenant.leaseStartDate || !tenant.leaseEndDate) return null;
    const total = new Date(tenant.leaseEndDate) - new Date(tenant.leaseStartDate);
    const elapsed = new Date() - new Date(tenant.leaseStartDate);
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
    const daysLeft = Math.ceil((new Date(tenant.leaseEndDate) - new Date()) / (1000 * 60 * 60 * 24));
    return { pct, daysLeft };
  };
  const progress = leaseProgress();

  const totalRent = tenant.rentAmount ? tenant.rentAmount * tenant.numberOfPayments : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/tenants')} className="btn btn-ghost btn-icon"><FiArrowLeft /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
              {tenant.firstName?.[0]?.toUpperCase()}{tenant.lastName?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 2 }}>
                {tenant.salutation} {tenant.firstName} {tenant.lastName}
                <span style={{ marginLeft: 10, background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
                  {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                </span>
              </h1>
              <p className="page-subtitle" style={{ fontFamily: 'monospace' }}>{tenant.tenantCode}</p>
            </div>
          </div>
        </div>
        <Link to={`/tenants/edit/${id}`} className="btn btn-primary"><FiEdit2 /> Edit Tenant</Link>
      </div>

      {/* Lease summary bar */}
      {progress && (
        <div className="card card-body" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--gray-500)' }}>Lease Progress</span>
              <span style={{ fontWeight: 700, color: progress.daysLeft < 0 ? '#ef4444' : progress.daysLeft <= 30 ? '#f59e0b' : 'var(--primary)' }}>
                {progress.daysLeft < 0 ? 'Expired' : `${progress.daysLeft} days left`}
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress.pct}%`, background: progress.daysLeft < 0 ? '#ef4444' : progress.daysLeft <= 30 ? '#f59e0b' : 'var(--primary)', borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--gray-400)' }}>
              <span>{fmt(tenant.leaseStartDate)}</span>
              <span>{fmt(tenant.leaseEndDate)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>₹{(tenant.rentAmount || 0).toLocaleString()}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Monthly Rent</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>₹{(tenant.depositAmount || 0).toLocaleString()}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Deposit</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gray-700)' }}>₹{totalRent.toLocaleString()}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Total ({tenant.numberOfPayments} pmts)</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Personal & Identity */}
        <div className="card card-body">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, color: 'var(--gray-600)' }}>Personal & Identity</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InfoRow label="Nationality" value={tenant.nationality} />
            <InfoRow label="Date of Birth" value={fmt(tenant.dateOfBirth)} />
            <InfoRow label="Passport No." value={tenant.passportNumber} />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Passport Expiry</span>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-800)', fontWeight: 500 }}>{fmt(tenant.passportExpiryDate)}{expiryBadge(tenant.passportExpiryDate)}</div>
            </div>
            <InfoRow label="Emirates ID" value={tenant.emiratesId} />
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>EID Expiry</span>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-800)', fontWeight: 500 }}>{fmt(tenant.eidExpiryDate)}{expiryBadge(tenant.eidExpiryDate)}</div>
            </div>
          </div>
        </div>

        {/* Contact & Lease */}
        <div className="card card-body">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, color: 'var(--gray-600)' }}>Contact & Lease</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tenant.mobile && <div style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'center' }}><FiPhone size={13} color="var(--primary)" />{tenant.mobile}</div>}
            {tenant.email && <div style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'center' }}><FiMail size={13} color="var(--primary)" />{tenant.email}</div>}
            {tenant.employer && <div style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'center' }}><FiBriefcase size={13} color="var(--primary)" />{tenant.employer}</div>}
            {tenant.propertyId && (
              <div style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'center' }}>
                <FiHome size={13} color="var(--primary)" />
                <Link to={`/properties/edit/${tenant.propertyId._id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  {tenant.propertyId.title}
                </Link>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, fontSize: '0.875rem', alignItems: 'center' }}>
              <FiDollarSign size={13} color="var(--primary)" />
              <span>Payment: <strong>{tenant.paymentMode}</strong> · {tenant.numberOfPayments}x/year</span>
            </div>
            <div style={{ marginTop: 4 }}>
              <InfoRow label="Move-In / Move-Out" value={`${fmt(tenant.moveInDate)} → ${fmt(tenant.moveOutDate)}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiFileText size={15} /> Documents
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {DOC_FIELDS.map(([field, label]) => (
            <DocCard key={field} label={label} doc={tenant[field]} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--gray-400)' }}>
        <FiCalendar size={12} />
        Created: {fmt(tenant.createdAt)}
        {tenant.createdBy?.name && <> by <strong>{tenant.createdBy.name}</strong></>}
      </div>
    </div>
  );
};

export default TenantProfile;
