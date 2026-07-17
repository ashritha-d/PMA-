import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiSearch, FiUpload, FiX, FiImage } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '';

const TYPE_OPTIONS = [
  { value: 'plumbing',     label: '🔧 Plumbing' },
  { value: 'electrical',   label: '⚡ Electrical' },
  { value: 'ac',           label: '❄️ AC' },
  { value: 'cleaning',     label: '🧹 Cleaning' },
  { value: 'carpentry',    label: '🪚 Carpentry' },
  { value: 'painting',     label: '🖌️ Painting' },
  { value: 'pest_control', label: '🐛 Pest Control' },
  { value: 'maintenance',  label: '⚙️ Maintenance' },
  { value: 'other',        label: '📋 Other' },
];

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'assigned',    label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'closed',      label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',       label: 'Low' },
  { value: 'medium',    label: 'Medium' },
  { value: 'high',      label: 'High' },
  { value: 'emergency', label: 'Emergency' },
];

/* ---------- reusables ---------- */

const SECTION = ({ title, children }) => (
  <div className="card card-body" style={{ marginBottom: 20 }}>
    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>{title}</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, required, children, span2 }) => (
  <div style={span2 ? { gridColumn: '1 / -1' } : {}}>
    <label className="form-label">{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
    {children}
  </div>
);

/* Multi-image upload strip */
const ImageStrip = ({ label, inputId, existing, newFiles, onAdd, onRemoveExisting, onRemoveNew }) => (
  <div style={{ gridColumn: '1 / -1' }}>
    <label className="form-label">{label}</label>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* Existing uploaded images */}
      {existing.map((img, i) => (
        <div key={img.url} style={{ position: 'relative', width: 90, height: 80 }}>
          {/\.(jpg|jpeg|png|gif|webp)$/i.test(img.url)
            ? <img src={`${API_URL}${img.url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--gray-200)' }} />
            : <div style={{ width: '100%', height: '100%', background: '#f0f4ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiImage size={24} color="var(--primary)" /></div>
          }
          <button type="button" onClick={() => onRemoveExisting(i)} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <FiX size={10} />
          </button>
        </div>
      ))}
      {/* New files preview */}
      {newFiles.map((f, i) => (
        <div key={i} style={{ position: 'relative', width: 90, height: 80 }}>
          <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '2px solid #10b981' }} />
          <button type="button" onClick={() => onRemoveNew(i)} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <FiX size={10} />
          </button>
        </div>
      ))}
      {/* Upload button */}
      <label htmlFor={inputId} style={{ width: 90, height: 80, border: '2px dashed var(--gray-300)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-400)', background: 'var(--gray-50)' }}>
        <FiUpload size={16} />
        <span style={{ fontSize: '0.68rem', marginTop: 4 }}>Add</span>
        <input id={inputId} type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={e => onAdd(Array.from(e.target.files))} />
      </label>
    </div>
  </div>
);

/* ---------- main form ---------- */

const EMPTY = {
  propertyId: '', propertyCode: '',
  tenantId: '', tenantCode: '',
  requestType: 'maintenance',
  description: '',
  requestDate: new Date().toISOString().slice(0, 10),
  status: 'open',
  priority: 'medium',
  attendedBy: '',
  startDate: '',
  endDate: '',
  estimatedCost: '',
  actualCost: '',
  adminRemarks: '',
};

const ServTransForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState(EMPTY);

  const [propQuery, setPropQuery] = useState('');
  const [propResults, setPropResults] = useState([]);
  const [propLoading, setPropLoading] = useState(false);

  // Image state
  const [existingBefore, setExistingBefore] = useState([]);
  const [existingAfter,  setExistingAfter]  = useState([]);
  const [newBefore, setNewBefore] = useState([]);
  const [newAfter,  setNewAfter]  = useState([]);

  useEffect(() => {
    if (propQuery.length < 2) { setPropResults([]); return; }
    setPropLoading(true);
    const t = setTimeout(() => {
      API.get(`/properties?search=${encodeURIComponent(propQuery)}&limit=8`)
        .then(r => setPropResults(r.data.properties || []))
        .catch(() => {})
        .finally(() => setPropLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [propQuery]);

  useEffect(() => {
    if (!isEdit) return;
    API.get(`/servtrans/${id}`).then(({ data }) => {
      const r = data.request;
      setForm({
        propertyId: r.propertyId?._id || '',
        propertyCode: r.propertyCode || '',
        tenantId: r.tenantId?._id || '',
        tenantCode: r.tenantCode || '',
        requestType: r.requestType || 'maintenance',
        description: r.description || '',
        requestDate: r.requestDate ? r.requestDate.slice(0, 10) : '',
        status: r.status || 'open',
        priority: r.priority || 'medium',
        attendedBy: r.attendedBy || '',
        startDate: r.startDate ? r.startDate.slice(0, 10) : '',
        endDate: r.endDate ? r.endDate.slice(0, 10) : '',
        estimatedCost: r.estimatedCost ?? '',
        actualCost: r.actualCost ?? '',
        adminRemarks: r.adminRemarks || '',
      });
      if (r.propertyId) setPropQuery(r.propertyId.title || '');
      setExistingBefore(r.beforeImages || []);
      setExistingAfter(r.afterImages || []);
    }).catch(() => toast.error('Failed to load request')).finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestType || !form.description.trim()) {
      toast.error('Request type and description are required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const payload = { ...form, existingBeforeImages: existingBefore, existingAfterImages: existingAfter };
      fd.append('data', JSON.stringify(payload));
      newBefore.forEach(f => fd.append('beforeImages', f));
      newAfter.forEach(f => fd.append('afterImages', f));

      if (isEdit) {
        await API.put(`/servtrans/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Request updated');
      } else {
        await API.post('/servtrans', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Request created');
      }
      navigate('/servtrans');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save request');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/servtrans')} className="btn btn-ghost btn-icon"><FiArrowLeft /></button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Request' : 'New Service Request'}</h1>
            <p className="page-subtitle">{isEdit ? 'Update service request details' : 'Log a new maintenance or service request'}</p>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Request'}</button>
      </div>

      {/* Request details */}
      <SECTION title="Request Details">
        <Field label="Request Type" required>
          <select className="form-select" value={form.requestType} onChange={set('requestType')}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Request Date">
          <input className="form-input" type="date" value={form.requestDate} onChange={set('requestDate')} />
        </Field>
        <Field label="Status">
          <select className="form-select" value={form.status} onChange={set('status')}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className="form-select" value={form.priority} onChange={set('priority')}>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Description" required span2>
          <textarea className="form-input" style={{ resize: 'vertical', minHeight: 80 }} value={form.description} onChange={set('description')} placeholder="Describe the issue or work required..." />
        </Field>
      </SECTION>

      {/* Property & tenant */}
      <SECTION title="Property & Tenant">
        {/* Property search */}
        <div>
          <label className="form-label">Property</label>
          <div style={{ position: 'relative' }}>
            <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search property..."
              value={propQuery}
              onChange={e => { setPropQuery(e.target.value); }}
              onFocus={() => {}}
              onBlur={() => setTimeout(() => setPropResults([]), 180)}
            />
            {(propLoading || propResults.length > 0) && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 60, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {propLoading && <div style={{ padding: '10px 14px', color: 'var(--gray-400)', fontSize: '0.82rem' }}>Searching...</div>}
                {propResults.map(p => (
                  <div key={p._id} onMouseDown={() => { setForm(f => ({ ...f, propertyId: p._id, propertyCode: p.propertyCode })); setPropQuery(p.title); setPropResults([]); }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{p.propertyCode}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {form.propertyCode && <div style={{ marginTop: 5, fontSize: '0.75rem', color: 'var(--gray-500)' }}>Code: {form.propertyCode}</div>}
        </div>
        <Field label="Tenant Code">
          <input className="form-input" value={form.tenantCode} onChange={set('tenantCode')} placeholder="e.g. TNT12345678" />
        </Field>
      </SECTION>

      {/* Admin / technician section */}
      <SECTION title="Assignment & Costs">
        <Field label="Attended By (Technician)">
          <input className="form-input" value={form.attendedBy} onChange={set('attendedBy')} placeholder="e.g. Ravi Kumar" />
        </Field>
        <Field label="Start Date">
          <input className="form-input" type="date" value={form.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="End / Completion Date">
          <input className="form-input" type="date" value={form.endDate} onChange={set('endDate')} />
        </Field>
        <Field label="Estimated Cost (₹)">
          <input className="form-input" type="number" min="0" value={form.estimatedCost} onChange={set('estimatedCost')} placeholder="e.g. 2000" />
        </Field>
        <Field label="Actual Cost (₹)">
          <input className="form-input" type="number" min="0" value={form.actualCost} onChange={set('actualCost')} placeholder="Fill after completion" />
        </Field>
        <Field label="Admin Remarks" span2>
          <textarea className="form-input" style={{ resize: 'vertical', minHeight: 72 }} value={form.adminRemarks} onChange={set('adminRemarks')} placeholder="Internal notes, resolution summary..." />
        </Field>
      </SECTION>

      {/* Before & after images */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>
          Before & After Photos
        </h3>
        <div style={{ display: 'grid', gap: 20 }}>
          <ImageStrip
            label="Before Repair Photos"
            inputId="before-upload"
            existing={existingBefore}
            newFiles={newBefore}
            onAdd={files => setNewBefore(p => [...p, ...files])}
            onRemoveExisting={i => setExistingBefore(p => p.filter((_, idx) => idx !== i))}
            onRemoveNew={i => setNewBefore(p => p.filter((_, idx) => idx !== i))}
          />
          <ImageStrip
            label="After Repair Photos"
            inputId="after-upload"
            existing={existingAfter}
            newFiles={newAfter}
            onAdd={files => setNewAfter(p => [...p, ...files])}
            onRemoveExisting={i => setExistingAfter(p => p.filter((_, idx) => idx !== i))}
            onRemoveNew={i => setNewAfter(p => p.filter((_, idx) => idx !== i))}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/servtrans')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Request'}</button>
      </div>
    </form>
  );
};

export default ServTransForm;
