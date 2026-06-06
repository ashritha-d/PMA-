import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiUpload, FiX } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '';

const SECTION = ({ title, children }) => (
  <div className="card card-body" style={{ marginBottom: 20 }}>
    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>
      {title}
    </h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, required, children }) => (
  <div>
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
      <div style={{
        border: '2px dashed var(--gray-300)', borderRadius: 8, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        background: hasFile ? '#f0fdf4' : 'var(--gray-50)',
        transition: 'border-color 0.2s',
        cursor: 'pointer',
      }}
        onClick={() => !hasFile && document.getElementById(`file-${fieldName}`).click()}
      >
        <input
          id={`file-${fieldName}`}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={e => onChange(e.target.files[0])}
        />
        {hasFile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {existing?.url && !file ? (
              <a href={`${API_URL}${existing.url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {existing.filename || 'View document'}
              </a>
            ) : (
              <span style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file?.name}
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiUpload size={14} /> Click to upload
          </span>
        )}
        {hasFile && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClear(); }}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
          >
            <FiX size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const OwnerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [form, setForm] = useState({
    salutation: 'Mr.',
    firstName: '',
    lastName: '',
    nationality: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    mobile: '',
    email: '',
    passportNumber: '',
    emiratesId: '',
    dateOfBirth: '',
    visaExpiryDate: '',
    passportExpiryDate: '',
  });

  const [existingDocs, setExistingDocs] = useState({ eidImage: null, passportCopy: null, residenceVisa: null });
  const [files, setFiles] = useState({ eidImage: null, passportCopy: null, residenceVisa: null });

  useEffect(() => {
    if (!isEdit) return;
    API.get(`/owners/${id}`).then(({ data }) => {
      const o = data.owner;
      setForm({
        salutation: o.salutation || 'Mr.',
        firstName: o.firstName || '',
        lastName: o.lastName || '',
        nationality: o.nationality || '',
        address1: o.address1 || '',
        address2: o.address2 || '',
        city: o.city || '',
        state: o.state || '',
        country: o.country || '',
        zipCode: o.zipCode || '',
        mobile: o.mobile || '',
        email: o.email || '',
        passportNumber: o.passportNumber || '',
        emiratesId: o.emiratesId || '',
        dateOfBirth: o.dateOfBirth ? o.dateOfBirth.slice(0, 10) : '',
        visaExpiryDate: o.visaExpiryDate ? o.visaExpiryDate.slice(0, 10) : '',
        passportExpiryDate: o.passportExpiryDate ? o.passportExpiryDate.slice(0, 10) : '',
      });
      setExistingDocs({
        eidImage: o.eidImage || null,
        passportCopy: o.passportCopy || null,
        residenceVisa: o.residenceVisa || null,
      });
    }).catch(() => toast.error('Failed to load owner')).finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

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
      if (files.eidImage) fd.append('eidImage', files.eidImage);
      if (files.passportCopy) fd.append('passportCopy', files.passportCopy);
      if (files.residenceVisa) fd.append('residenceVisa', files.residenceVisa);

      if (isEdit) {
        await API.put(`/owners/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Owner updated');
      } else {
        await API.post('/owners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Owner created');
      }
      navigate('/owners');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save owner');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/owners')} className="btn btn-ghost btn-icon">
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Owner' : 'Add Owner'}</h1>
            <p className="page-subtitle">{isEdit ? 'Update owner information and documents' : 'Register a new property owner'}</p>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <FiSave /> {saving ? 'Saving...' : 'Save Owner'}
        </button>
      </div>

      <SECTION title="Personal Information">
        <Field label="Salutation">
          <select className="form-select" value={form.salutation} onChange={set('salutation')}>
            {['Mr.', 'Mrs.', 'Miss', 'Msrs.'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="First Name" required>
          <input className="form-input" value={form.firstName} onChange={set('firstName')} placeholder="e.g. Rajesh" />
        </Field>
        <Field label="Last Name" required>
          <input className="form-input" value={form.lastName} onChange={set('lastName')} placeholder="e.g. Kumar" />
        </Field>
        <Field label="Nationality">
          <input className="form-input" value={form.nationality} onChange={set('nationality')} placeholder="e.g. Indian" />
        </Field>
        <Field label="Date of Birth">
          <input className="form-input" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        </Field>
      </SECTION>

      <SECTION title="Contact Information">
        <Field label="Mobile Number">
          <input className="form-input" value={form.mobile} onChange={set('mobile')} placeholder="+971 50 000 0000" />
        </Field>
        <Field label="Email Address">
          <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="owner@example.com" />
        </Field>
      </SECTION>

      <SECTION title="Address">
        <Field label="Address Line 1">
          <input className="form-input" value={form.address1} onChange={set('address1')} placeholder="House / Apartment number, Street" />
        </Field>
        <Field label="Address Line 2">
          <input className="form-input" value={form.address2} onChange={set('address2')} placeholder="Area, Landmark" />
        </Field>
        <Field label="City">
          <input className="form-input" value={form.city} onChange={set('city')} placeholder="e.g. Dubai" />
        </Field>
        <Field label="State / Emirate">
          <input className="form-input" value={form.state} onChange={set('state')} placeholder="e.g. Dubai" />
        </Field>
        <Field label="Country">
          <input className="form-input" value={form.country} onChange={set('country')} placeholder="e.g. UAE" />
        </Field>
        <Field label="Zip / PO Box">
          <input className="form-input" value={form.zipCode} onChange={set('zipCode')} placeholder="e.g. 00000" />
        </Field>
      </SECTION>

      <SECTION title="Document Numbers">
        <Field label="Passport Number">
          <input className="form-input" value={form.passportNumber} onChange={set('passportNumber')} placeholder="e.g. A1234567" />
        </Field>
        <Field label="Emirates ID">
          <input className="form-input" value={form.emiratesId} onChange={set('emiratesId')} placeholder="e.g. 784-0000-0000000-0" />
        </Field>
        <Field label="Passport Expiry Date">
          <input className="form-input" type="date" value={form.passportExpiryDate} onChange={set('passportExpiryDate')} />
        </Field>
        <Field label="Visa Expiry Date">
          <input className="form-input" type="date" value={form.visaExpiryDate} onChange={set('visaExpiryDate')} />
        </Field>
      </SECTION>

      <div className="card card-body" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>
          Document Uploads
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <DocUpload
            label="Emirates ID Image"
            fieldName="eidImage"
            existing={existingDocs.eidImage}
            file={files.eidImage}
            onChange={f => setFiles(prev => ({ ...prev, eidImage: f }))}
            onClear={() => { setFiles(prev => ({ ...prev, eidImage: null })); setExistingDocs(prev => ({ ...prev, eidImage: null })); }}
          />
          <DocUpload
            label="Passport Copy"
            fieldName="passportCopy"
            existing={existingDocs.passportCopy}
            file={files.passportCopy}
            onChange={f => setFiles(prev => ({ ...prev, passportCopy: f }))}
            onClear={() => { setFiles(prev => ({ ...prev, passportCopy: null })); setExistingDocs(prev => ({ ...prev, passportCopy: null })); }}
          />
          <DocUpload
            label="Residence Visa"
            fieldName="residenceVisa"
            existing={existingDocs.residenceVisa}
            file={files.residenceVisa}
            onChange={f => setFiles(prev => ({ ...prev, residenceVisa: f }))}
            onClear={() => { setFiles(prev => ({ ...prev, residenceVisa: null })); setExistingDocs(prev => ({ ...prev, residenceVisa: null })); }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/owners')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <FiSave /> {saving ? 'Saving...' : 'Save Owner'}
        </button>
      </div>
    </form>
  );
};

export default OwnerForm;
