import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiSearch } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

/* ---------- reusables ---------- */

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

const Field = ({ label, required, children, span2 }) => (
  <div style={span2 ? { gridColumn: '1 / -1' } : {}}>
    <label className="form-label">{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
    {children}
  </div>
);

/* Reusable live-search dropdown */
const SearchDropdown = ({ label, placeholder, value, onSearch, results, onSelect, onClear, loading: isLoading, sublabel }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 32 }}
          placeholder={placeholder}
          value={value}
          onChange={e => { onSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
        {open && (isLoading || results.length > 0) && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 60, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
            {isLoading && <div style={{ padding: '10px 14px', color: 'var(--gray-400)', fontSize: '0.82rem' }}>Searching...</div>}
            {results.map(r => (
              <div key={r._id} onMouseDown={() => { onSelect(r); setOpen(false); }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600 }}>{r._label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{r._sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {sublabel && <div style={{ marginTop: 5, fontSize: '0.75rem', color: 'var(--gray-500)' }}>{sublabel}</div>}
    </div>
  );
};

/* ---------- main ---------- */

const EMPTY = {
  propertyId: '', propertyCode: '',
  ownerId: '', ownerCode: '',
  tenantId: '', tenantCode: '', tenantName: '',
  contractStartDate: '', contractEndDate: '',
  moveInDate: '', moveOutDate: '',
  firstMoveInDate: '', renewalDate: '',
  noticePeriod: 30,
  isNewTenant: true,
  rentAmount: '',
  rentDescription: '',
  rentPaymentMode: 'online',
  rentPaymentType: 'monthly',
  depositAmount: '',
  depositPaymentMode: 'online',
  status: 'active',
  notes: '',
};

const useSearch = (endpoint, mapFn, delay = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      API.get(`${endpoint}?search=${encodeURIComponent(query)}&limit=8`)
        .then(r => setResults((r.data[Object.keys(r.data).find(k => Array.isArray(r.data[k]))] || []).map(mapFn)))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, delay);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return { query, setQuery, results, setResults, loading };
};

const ContractForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState(EMPTY);

  // Live search states
  const propSearch = useSearch('/properties', p => ({ _id: p._id, _label: p.title, _sub: `${p.propertyCode} · ${p.address?.city}`, propertyCode: p.propertyCode }));
  const ownerSearch = useSearch('/owners', o => ({ _id: o._id, _label: `${o.salutation} ${o.firstName} ${o.lastName}`, _sub: o.ownerCode, ownerCode: o.ownerCode }));
  const tenantSearch = useSearch('/tenants', t => ({ _id: t._id, _label: `${t.salutation} ${t.firstName} ${t.lastName}`, _sub: `${t.tenantCode} · ${t.propertyCode || ''}`, tenantCode: t.tenantCode, tenantName: `${t.firstName} ${t.lastName}` }));

  useEffect(() => {
    if (!isEdit) return;
    API.get(`/contracts/${id}`).then(({ data }) => {
      const c = data.contract;
      setForm({
        propertyId: c.propertyId?._id || c.propertyId || '',
        propertyCode: c.propertyCode || '',
        ownerId: c.ownerId?._id || c.ownerId || '',
        ownerCode: c.ownerCode || '',
        tenantId: c.tenantId?._id || c.tenantId || '',
        tenantCode: c.tenantCode || '',
        tenantName: c.tenantName || '',
        contractStartDate: c.contractStartDate ? c.contractStartDate.slice(0, 10) : '',
        contractEndDate: c.contractEndDate ? c.contractEndDate.slice(0, 10) : '',
        moveInDate: c.moveInDate ? c.moveInDate.slice(0, 10) : '',
        moveOutDate: c.moveOutDate ? c.moveOutDate.slice(0, 10) : '',
        firstMoveInDate: c.firstMoveInDate ? c.firstMoveInDate.slice(0, 10) : '',
        renewalDate: c.renewalDate ? c.renewalDate.slice(0, 10) : '',
        noticePeriod: c.noticePeriod ?? 30,
        isNewTenant: c.isNewTenant ?? true,
        rentAmount: c.rentAmount || '',
        rentDescription: c.rentDescription || '',
        rentPaymentMode: c.rentPaymentMode || 'online',
        rentPaymentType: c.rentPaymentType || 'monthly',
        depositAmount: c.depositAmount || '',
        depositPaymentMode: c.depositPaymentMode || 'online',
        status: c.status || 'active',
        notes: c.notes || '',
      });
      if (c.propertyId) propSearch.setQuery(c.propertyId.title || '');
      if (c.ownerId) ownerSearch.setQuery(`${c.ownerId.salutation} ${c.ownerId.firstName} ${c.ownerId.lastName}`);
      if (c.tenantId) tenantSearch.setQuery(`${c.tenantId.firstName} ${c.tenantId.lastName}`);
    }).catch(() => toast.error('Failed to load contract')).finally(() => setLoading(false));
  }, [id, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setBool = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value === 'true' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contractStartDate || !form.contractEndDate || !form.rentAmount) {
      toast.error('Start date, end date and rent amount are required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await API.put(`/contracts/${id}`, form);
        toast.success('Contract updated');
      } else {
        await API.post('/contracts', form);
        toast.success('Contract created');
      }
      navigate('/contracts');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/contracts')} className="btn btn-ghost btn-icon"><FiArrowLeft /></button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Contract' : 'New Contract'}</h1>
            <p className="page-subtitle">{isEdit ? 'Update contract details' : 'Create a new lease contract'}</p>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Contract'}</button>
      </div>

      {/* Linked entities */}
      <SECTION title="Linked Property, Owner & Tenant">
        <SearchDropdown
          label="Property"
          placeholder="Search property by name or code..."
          value={propSearch.query}
          onSearch={propSearch.setQuery}
          results={propSearch.results}
          loading={propSearch.loading}
          onSelect={r => { setForm(f => ({ ...f, propertyId: r._id, propertyCode: r.propertyCode })); propSearch.setQuery(r._label); propSearch.setResults([]); }}
          onClear={() => { setForm(f => ({ ...f, propertyId: '', propertyCode: '' })); propSearch.setQuery(''); }}
          sublabel={form.propertyCode && `Code: ${form.propertyCode}`}
        />
        <SearchDropdown
          label="Owner"
          placeholder="Search owner by name or code..."
          value={ownerSearch.query}
          onSearch={ownerSearch.setQuery}
          results={ownerSearch.results}
          loading={ownerSearch.loading}
          onSelect={r => { setForm(f => ({ ...f, ownerId: r._id, ownerCode: r.ownerCode })); ownerSearch.setQuery(r._label); ownerSearch.setResults([]); }}
          onClear={() => { setForm(f => ({ ...f, ownerId: '', ownerCode: '' })); ownerSearch.setQuery(''); }}
          sublabel={form.ownerCode && `Code: ${form.ownerCode}`}
        />
        <SearchDropdown
          label="Tenant"
          placeholder="Search tenant by name or code..."
          value={tenantSearch.query}
          onSearch={tenantSearch.setQuery}
          results={tenantSearch.results}
          loading={tenantSearch.loading}
          onSelect={r => { setForm(f => ({ ...f, tenantId: r._id, tenantCode: r.tenantCode, tenantName: r.tenantName })); tenantSearch.setQuery(r._label); tenantSearch.setResults([]); }}
          onClear={() => { setForm(f => ({ ...f, tenantId: '', tenantCode: '', tenantName: '' })); tenantSearch.setQuery(''); }}
          sublabel={form.tenantCode && `Code: ${form.tenantCode}`}
        />
      </SECTION>

      {/* Contract dates */}
      <SECTION title="Contract Dates">
        <Field label="Contract Start Date" required>
          <input className="form-input" type="date" value={form.contractStartDate} onChange={set('contractStartDate')} />
        </Field>
        <Field label="Contract End Date" required>
          <input className="form-input" type="date" value={form.contractEndDate} onChange={set('contractEndDate')} />
        </Field>
        <Field label="Move-In Date">
          <input className="form-input" type="date" value={form.moveInDate} onChange={set('moveInDate')} />
        </Field>
        <Field label="Move-Out Date">
          <input className="form-input" type="date" value={form.moveOutDate} onChange={set('moveOutDate')} />
        </Field>
        <Field label="First Move-In Date">
          <input className="form-input" type="date" value={form.firstMoveInDate} onChange={set('firstMoveInDate')} />
        </Field>
        <Field label="Renewal Date">
          <input className="form-input" type="date" value={form.renewalDate} onChange={set('renewalDate')} />
        </Field>
        <Field label="Notice Period (days)">
          <input className="form-input" type="number" min="0" value={form.noticePeriod} onChange={set('noticePeriod')} />
        </Field>
        <Field label="Tenant Type">
          <select className="form-select" value={String(form.isNewTenant)} onChange={setBool('isNewTenant')}>
            <option value="true">New Tenant</option>
            <option value="false">Existing / Renewal</option>
          </select>
        </Field>
      </SECTION>

      {/* Rent & deposit */}
      <SECTION title="Rent & Deposit">
        <Field label="Rent Amount (₹)" required>
          <input className="form-input" type="number" min="0" value={form.rentAmount} onChange={set('rentAmount')} placeholder="e.g. 25000" />
        </Field>
        <Field label="Rent Payment Type">
          <select className="form-select" value={form.rentPaymentType} onChange={set('rentPaymentType')}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="half-yearly">Half-Yearly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Rent Payment Mode">
          <select className="form-select" value={form.rentPaymentMode} onChange={set('rentPaymentMode')}>
            {['cash', 'cheque', 'online', 'card'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Rent Description">
          <input className="form-input" value={form.rentDescription} onChange={set('rentDescription')} placeholder="e.g. Monthly rent inclusive of maintenance" />
        </Field>
        <Field label="Deposit Amount (₹)">
          <input className="form-input" type="number" min="0" value={form.depositAmount} onChange={set('depositAmount')} placeholder="e.g. 50000" />
        </Field>
        <Field label="Deposit Payment Mode">
          <select className="form-select" value={form.depositPaymentMode} onChange={set('depositPaymentMode')}>
            {['cash', 'cheque', 'online', 'card'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Contract Status">
          <select className="form-select" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
            <option value="renewed">Renewed</option>
          </select>
        </Field>
        <Field label="Notes" span2>
          <textarea className="form-input" style={{ resize: 'vertical', minHeight: 72 }} value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." />
        </Field>
      </SECTION>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/contracts')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Contract'}</button>
      </div>
    </form>
  );
};

export default ContractForm;
