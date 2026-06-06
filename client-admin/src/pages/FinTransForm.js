import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiSearch, FiUpload, FiX } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || '';

const TX_TYPES = [
  { value: 'rent', label: 'Rent' },
  { value: 'rent_deposit', label: 'Rent Deposit' },
  { value: 'refund', label: 'Refund' },
  { value: 'electricity_bill', label: 'Electricity Bill' },
  { value: 'water_bill', label: 'Water Bill' },
  { value: 'municipality', label: 'Municipality Charges' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

// Default nature by transaction type
const DEFAULT_NATURE = {
  rent: 'receipt', rent_deposit: 'receipt', refund: 'payment',
  electricity_bill: 'payment', water_bill: 'payment', municipality: 'payment',
  maintenance: 'payment', repair: 'payment', miscellaneous: 'receipt',
};

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

const PropSearch = ({ value, onSearch, results, onSelect, loading: isLoading, sublabel }) => {
  const [open, setOpen] = useState(false);
  return (
    <Field label="Property">
      <div style={{ position: 'relative' }}>
        <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
        <input
          className="form-input"
          style={{ paddingLeft: 32 }}
          placeholder="Search property..."
          value={value}
          onChange={e => { onSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
        />
        {open && (isLoading || results.length > 0) && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 60, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
            {isLoading && <div style={{ padding: '10px 14px', color: 'var(--gray-400)', fontSize: '0.82rem' }}>Searching...</div>}
            {results.map(p => (
              <div key={p._id} onMouseDown={() => { onSelect(p); setOpen(false); }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{p.propertyCode} · {p.address?.city}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {sublabel && <div style={{ marginTop: 5, fontSize: '0.75rem', color: 'var(--gray-500)' }}>{sublabel}</div>}
    </Field>
  );
};

const EMPTY = {
  propertyId: '', propertyCode: '',
  ownerId: '', ownerCode: '',
  tenantId: '', tenantCode: '',
  contractId: '', contractNumber: '',
  transactionType: 'rent',
  transactionNature: 'receipt',
  paymentMode: 'online',
  transactionDate: new Date().toISOString().slice(0, 10),
  amount: '',
  referenceNumber: '',
  description: '',
  chequeDate: '',
  bankName: '',
  bankCity: '',
  ifscCode: '',
  chequeStatus: 'pending',
};

const FinTransForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [form, setForm] = useState(EMPTY);
  const [chequeFile, setChequeFile] = useState(null);
  const [existingCheque, setExistingCheque] = useState(null);

  // Property search
  const [propQuery, setPropQuery] = useState('');
  const [propResults, setPropResults] = useState([]);
  const [propLoading, setPropLoading] = useState(false);

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
    API.get(`/fintrans/${id}`).then(({ data }) => {
      const t = data.transaction;
      setForm({
        propertyId: t.propertyId?._id || '',
        propertyCode: t.propertyCode || '',
        ownerId: t.ownerId?._id || '',
        ownerCode: t.ownerCode || '',
        tenantId: t.tenantId?._id || '',
        tenantCode: t.tenantCode || '',
        contractId: t.contractId?._id || '',
        contractNumber: t.contractNumber || '',
        transactionType: t.transactionType || 'rent',
        transactionNature: t.transactionNature || 'receipt',
        paymentMode: t.paymentMode || 'online',
        transactionDate: t.transactionDate ? t.transactionDate.slice(0, 10) : '',
        amount: t.amount || '',
        referenceNumber: t.referenceNumber || '',
        description: t.description || '',
        chequeDate: t.chequeDate ? t.chequeDate.slice(0, 10) : '',
        bankName: t.bankName || '',
        bankCity: t.bankCity || '',
        ifscCode: t.ifscCode || '',
        chequeStatus: t.chequeStatus || 'pending',
      });
      if (t.propertyId) setPropQuery(t.propertyId.title || '');
      if (t.chequeImage) setExistingCheque(t.chequeImage);
    }).catch(() => toast.error('Failed to load transaction')).finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (field) => (e) => {
    const val = e.target.value;
    setForm(f => {
      const next = { ...f, [field]: val };
      // Auto-set nature when type changes
      if (field === 'transactionType') next.transactionNature = DEFAULT_NATURE[val] || 'receipt';
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transactionType || !form.amount || !form.transactionDate || !form.paymentMode) {
      toast.error('Type, amount, date and payment mode are required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('data', JSON.stringify(form));
      if (chequeFile) fd.append('chequeImage', chequeFile);

      if (isEdit) {
        await API.put(`/fintrans/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Transaction updated');
      } else {
        await API.post('/fintrans', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Transaction recorded');
      }
      navigate('/fintrans');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const isChequMode = form.paymentMode === 'cheque';
  const hasCheque = chequeFile || existingCheque?.url;

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/fintrans')} className="btn btn-ghost btn-icon"><FiArrowLeft /></button>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Transaction' : 'Add Transaction'}</h1>
            <p className="page-subtitle">{isEdit ? 'Update financial transaction details' : 'Record a new financial transaction'}</p>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Transaction'}</button>
      </div>

      {/* Transaction details */}
      <SECTION title="Transaction Details">
        <Field label="Transaction Type" required>
          <select className="form-select" value={form.transactionType} onChange={set('transactionType')}>
            {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Nature" required>
          <select className="form-select" value={form.transactionNature} onChange={set('transactionNature')}>
            <option value="receipt">Receipt (Money In)</option>
            <option value="payment">Payment (Money Out)</option>
          </select>
        </Field>
        <Field label="Amount (₹)" required>
          <input className="form-input" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="e.g. 25000" />
        </Field>
        <Field label="Transaction Date" required>
          <input className="form-input" type="date" value={form.transactionDate} onChange={set('transactionDate')} />
        </Field>
        <Field label="Payment Mode" required>
          <select className="form-select" value={form.paymentMode} onChange={set('paymentMode')}>
            {['cash', 'cheque', 'online', 'card'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Reference Number">
          <input className="form-input" value={form.referenceNumber} onChange={set('referenceNumber')} placeholder="UTR / Cheque # / Receipt #" />
        </Field>
        <Field label="Description" span2>
          <input className="form-input" value={form.description} onChange={set('description')} placeholder="e.g. Monthly rent for June 2026" />
        </Field>
      </SECTION>

      {/* Property & linked entities */}
      <SECTION title="Linked Property & Parties">
        <PropSearch
          value={propQuery}
          onSearch={setPropQuery}
          results={propResults}
          loading={propLoading}
          onSelect={p => { setForm(f => ({ ...f, propertyId: p._id, propertyCode: p.propertyCode })); setPropQuery(p.title); setPropResults([]); }}
          sublabel={form.propertyCode && `Code: ${form.propertyCode}`}
        />
        <Field label="Owner Code">
          <input className="form-input" value={form.ownerCode} onChange={set('ownerCode')} placeholder="e.g. OWN12345678" />
        </Field>
        <Field label="Tenant Code">
          <input className="form-input" value={form.tenantCode} onChange={set('tenantCode')} placeholder="e.g. TNT12345678" />
        </Field>
        <Field label="Contract Number">
          <input className="form-input" value={form.contractNumber} onChange={set('contractNumber')} placeholder="e.g. CON12345678" />
        </Field>
      </SECTION>

      {/* Cheque details — shown only when mode = cheque */}
      {isChequMode && (
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-700)' }}>
            Cheque Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            <Field label="Cheque Date">
              <input className="form-input" type="date" value={form.chequeDate} onChange={set('chequeDate')} />
            </Field>
            <Field label="Bank Name">
              <input className="form-input" value={form.bankName} onChange={set('bankName')} placeholder="e.g. HDFC Bank" />
            </Field>
            <Field label="Bank City">
              <input className="form-input" value={form.bankCity} onChange={set('bankCity')} placeholder="e.g. Mumbai" />
            </Field>
            <Field label="IFSC Code">
              <input className="form-input" value={form.ifscCode} onChange={set('ifscCode')} placeholder="e.g. HDFC0001234" style={{ fontFamily: 'monospace' }} />
            </Field>
            <Field label="Cheque Status">
              <select className="form-select" value={form.chequeStatus} onChange={set('chequeStatus')}>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
              </select>
            </Field>
            {/* Cheque image upload */}
            <div>
              <label className="form-label">Cheque Image</label>
              <div
                style={{ border: '2px dashed var(--gray-300)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: hasCheque ? '#f0fdf4' : 'var(--gray-50)', cursor: hasCheque ? 'default' : 'pointer' }}
                onClick={() => !hasCheque && document.getElementById('cheque-img-input').click()}
              >
                <input id="cheque-img-input" type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setChequeFile(e.target.files[0])} />
                {hasCheque ? (
                  existingCheque?.url && !chequeFile
                    ? <a href={`${API_URL}${existingCheque.url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>{existingCheque.filename || 'View cheque'}</a>
                    : <span style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chequeFile?.name}</span>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 6 }}><FiUpload size={13} /> Click to upload</span>
                )}
                {hasCheque && (
                  <button type="button" onClick={e => { e.stopPropagation(); setChequeFile(null); setExistingCheque(null); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
                    <FiX size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/fintrans')}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Transaction'}</button>
      </div>
    </form>
  );
};

export default FinTransForm;
