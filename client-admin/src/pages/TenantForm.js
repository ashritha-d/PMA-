import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiUpload, FiX, FiSearch } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '';

/* ---------- small reusables ---------- */

const SECTION = ({ title, children }) => (
  <div className="card card-body" style={{ marginBottom: 20 }}>
    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>
      {title}
    </h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, required, children, fullWidth }) => (
  <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
    <label className="form-label">
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
  </div>
);

const DocUpload = ({ label, fieldName, existing, file, onChange, onClear }) => {
  const hasFile = file || existing?.url;
  return (
    <div>
      <label className="form-label">{label}</label>
      <div
        style={{ border: '2px dashed var(--gray-300)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: hasFile ? '#f0fdf4' : 'var(--gray-50)', cursor: hasFile ? 'default' : 'pointer' }}
        onClick={() => !hasFile && document.getElementById(`tfile-${fieldName}`).click()}
      >
        <input id={`tfile-${fieldName}`} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => onChange(e.target.files[0])} />
        {hasFile ? (
          existing?.url && !file
            ? <a href={`${API_URL}${existing.url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{existing.filename || 'View'}</a>
            : <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</span>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 6 }}><FiUpload size={13} /> Click to upload</span>
        )}
        {hasFile && (
          <button type="button" onClick={e => { e.stopPropagation(); onClear(); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
            <FiX size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

/* ---------- main form ---------- */

const DOC_FIELDS = ['passportCopy', 'eidCopy', 'residenceVisa', 'bankStatement', 'depositCheque', 'securityCheque', 'ejariRegistration'];

const DOC_LABELS = {
  passportCopy: 'Passport Copy',
  eidCopy: 'Emirates ID Copy',
  residenceVisa: 'Residence Visa',
  bankStatement: 'Bank Statement',
  depositCheque: 'Deposit Cheque',
  securityCheque: 'Security Cheque',
  ejariRegistration: 'Ejari / Municipal Registration',
};

const EMPTY_FILES = DOC_FIELDS.reduce((a, k) => ({ ...a, [k]: null }), {});
const EMPTY_DOCS  = DOC_FIELDS.reduce((a, k) => ({ ...a, [k]: null }), {});

const TenantForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [form, setForm] = useState({
    salutation: 'Mr.',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    emiratesId: '',
    passportExpiryDate: '',
    eidExpiryDate: '',
    employer: '',
    mobile: '',
    email: '',
    propertyCode: '',
    propertyId: '',
    leaseStartDate: '',
    leaseEndDate: '',
    moveInDate: '',
    moveOutDate: '',
    rentAmount: '',
    depositAmount: '',
    numberOfPayments: 12,
    paymentMode: 'online',
    status: 'active',
  });

  const [existingDocs, setExistingDocs] = useState(EMPTY_DOCS);
  const [files, setFiles] = useState(EMPTY_FILES);

  // Property search
  const [propSearch, setPropSearch] = useState('');
  const [propResults, setPropResults] = useState([]);
  const [propLoading, setPropLoading] = useState(false);
  const [showPropDrop, setShowPropDrop] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    API.get(`/tenants/${id}`).then(({ data }) => {
      const t = data.tenant;
      setForm({
        salutation: t.salutation || 'Mr.',
        firstName: t.firstName || '',
        lastName: t.lastName || '',
        dateOfBirth: t.dateOfBirth ? t.dateOfBirth.slice(0, 10) : '',
        nationality: t.nationality || '',
        passportNumber: t.passportNumber || '',
        emiratesId: t.emiratesId || '',
        passportExpiryDate: t.passportExpiryDate ? t.passportExpiryDate.slice(0, 10) : '',
        eidExpiryDate: t.eidExpiryDate ? t.eidExpiryDate.slice(0, 10) : '',
        employer: t.employer || '',
        mobile: t.mobile || '',
        email: t.email || '',
        propertyCode: t.propertyCode || '',
        propertyId: t.propertyId?._id || t.propertyId || '',
        leaseStartDate: t.leaseStartDate ? t.leaseStartDate.slice(0, 10) : '',
        leaseEndDate: t.leaseEndDate ? t.leaseEndDate.slice(0, 10) : '',
        moveInDate: t.moveInDate ? t.moveInDate.slice(0, 10) : '',
        moveOutDate: t.moveOutDate ? t.moveOutDate.slice(0, 10) : '',
        rentAmount: t.rentAmount || '',
        depositAmount: t.depositAmount || '',
        numberOfPayments: t.numberOfPayments || 12,
        paymentMode: t.paymentMode || 'online',
        status: t.status || 'active',
      });
      if (t.propertyId) setPropSearch(t.propertyId.title || '');
      const docs = {};
      DOC_FIELDS.forEach(k => { docs[k] = t[k] || null; });
      setExistingDocs(docs);
    }).catch(() => toast.error('Failed to load tenant')).finally(() => setLoading(false));
  }, [id, isEdit]);

  // Property search
  useEffect(() => {
    if (propSearch.length < 2) { setPropResults([]); return; }
    setPropLoading(true);
    const timer = setTimeout(() => {
      API.get(`/properties?search=${encodeURIComponent(propSearch)}&limit=8`)
        .then(r => setPropResults(r.data.properties || []))
        .catch(() => {})
        .finally(() => setPropLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [propSearch]);

  const selectProperty = (p) => {
    setForm(f => ({ ...f, propertyId: p._id, propertyCode: p.propertyCode }));
    setPropSearch(p.title);
    setPropResults([]);
    setShowPropDrop(false);
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setFile = (field) => (file) => setFiles(prev => ({ ...prev, [field]: file }));
  const clearDoc = (field) => () => {
    setFiles(prev => ({ ...prev, [field]: null }));
    setExistingDocs(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('data', JSON.stringify(form));
      DOC_FIELDS.forEach(field => { if (files[field]) fd.append(field, files[field]); });

      if (isEdit) {
        await API.put(`/tenants/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Tenant updated');
      } else {
        await API.post('/tenants', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Tenant created');
      }
      navigate('/tenants');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/tenants')} className="btn btn-ghost btn-icon"><FiArrowLeft /></button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Tenant' : 'Add Tenant'}</h1>
            <p className="page-subtitle">{isEdit ? 'Update tenant information and documents' : 'Register a new tenant'}</p>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Tenant'}</button>
      </div>

      {/* Personal */}
      <SECTION title="Personal Information">
        <Field label="Salutation">
          <select className="form-select" value={form.salutation} onChange={set('salutation')}>
            {['Mr.', 'Mrs.', 'Miss', 'Msrs.'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="First Name" required>
          <input className="form-input" value={form.firstName} onChange={set('firstName')} placeholder="e.g. Priya" />
        </Field>
        <Field label="Last Name" required>
          <input className="form-input" value={form.lastName} onChange={set('lastName')} placeholder="e.g. Sharma" />
        </Field>
        <Field label="Date of Birth">
          <input className="form-input" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        </Field>
        <Field label="Nationality">
          <input className="form-input" value={form.nationality} onChange={set('nationality')} placeholder="e.g. Indian" />
        </Field>
        <Field label="Employer / Company">
          <input className="form-input" value={form.employer} onChange={set('employer')} placeholder="e.g. Acme Corp" />
        </Field>
      </SECTION>

      {/* Contact */}
      <SECTION title="Contact Information">
        <Field label="Mobile Number">
          <input className="form-input" value={form.mobile} onChange={set('mobile')} placeholder="+91 98765 43210" />
        </Field>
        <Field label="Email Address">
          <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="tenant@example.com" />
        </Field>
      </SECTION>

      {/* Documents numbers */}
      <SECTION title="Identity Documents">
        <Field label="Passport Number">
          <input className="form-input" value={form.passportNumber} onChange={set('passportNumber')} placeholder="e.g. A1234567" />
        </Field>
        <Field label="Passport Expiry Date">
          <input className="form-input" type="date" value={form.passportExpiryDate} onChange={set('passportExpiryDate')} />
        </Field>
        <Field label="Emirates ID">
          <input className="form-input" value={form.emiratesId} onChange={set('emiratesId')} placeholder="e.g. 784-0000-0000000-0" />
        </Field>
        <Field label="EID Expiry Date">
          <input className="form-input" type="date" value={form.eidExpiryDate} onChange={set('eidExpiryDate')} />
        </Field>
      </SECTION>

      {/* Property & Lease */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>
          Property & Lease Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {/* Property selector */}
          <div style={{ gridColumn: '1 / -1', maxWidth: 480 }}>
            <label className="form-label">Property</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <FiSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 32 }}
                  placeholder="Search property by name or code..."
                  value={propSearch}
                  onChange={e => { setPropSearch(e.target.value); setShowPropDrop(true); }}
                  onFocus={() => setShowPropDrop(true)}
                  onBlur={() => setTimeout(() => setShowPropDrop(false), 180)}
                />
              </div>
              {showPropDrop && (propLoading || propResults.length > 0) && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 50, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                  {propLoading && <div style={{ padding: '12px 16px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>Searching...</div>}
                  {propResults.map(p => (
                    <div key={p._id} onMouseDown={() => selectProperty(p)} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{p.propertyCode} · {p.address?.city}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {form.propertyCode && (
              <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                Selected: <strong style={{ fontFamily: 'monospace' }}>{form.propertyCode}</strong>
              </div>
            )}
          </div>

          <Field label="Lease Start Date">
            <input className="form-input" type="date" value={form.leaseStartDate} onChange={set('leaseStartDate')} />
          </Field>
          <Field label="Lease End Date">
            <input className="form-input" type="date" value={form.leaseEndDate} onChange={set('leaseEndDate')} />
          </Field>
          <Field label="Move-In Date">
            <input className="form-input" type="date" value={form.moveInDate} onChange={set('moveInDate')} />
          </Field>
          <Field label="Move-Out Date">
            <input className="form-input" type="date" value={form.moveOutDate} onChange={set('moveOutDate')} />
          </Field>
          <Field label="Rent Amount (₹)">
            <input className="form-input" type="number" min="0" value={form.rentAmount} onChange={set('rentAmount')} placeholder="e.g. 25000" />
          </Field>
          <Field label="Deposit Amount (₹)">
            <input className="form-input" type="number" min="0" value={form.depositAmount} onChange={set('depositAmount')} placeholder="e.g. 50000" />
          </Field>
          <Field label="No. of Payments / Year">
            <select className="form-select" value={form.numberOfPayments} onChange={set('numberOfPayments')}>
              <option value={1}>1 — Yearly</option>
              <option value={2}>2 — Half-Yearly</option>
              <option value={4}>4 — Quarterly</option>
              <option value={12}>12 — Monthly</option>
            </select>
          </Field>
          <Field label="Payment Mode">
            <select className="form-select" value={form.paymentMode} onChange={set('paymentMode')}>
              {['cash', 'cheque', 'online', 'card'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="form-select" value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="former">Former</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Document uploads */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>
          Document Uploads
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {DOC_FIELDS.map(field => (
            <DocUpload
              key={field}
              label={DOC_LABELS[field]}
              fieldName={field}
              existing={existingDocs[field]}
              file={files[field]}
              onChange={setFile(field)}
              onClear={clearDoc(field)}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/tenants')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Tenant'}</button>
      </div>
    </form>
  );
};

export default TenantForm;
