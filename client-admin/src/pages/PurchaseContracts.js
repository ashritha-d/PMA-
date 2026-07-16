import React, { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiEye, FiCheck, FiSearch, FiDownload, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiFilter, FiRefreshCw } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  draft:              { label: 'Draft',            color: '#6b7280', bg: '#f3f4f6' },
  pending_signatures: { label: 'Pending Approval', color: '#92400e', bg: '#fef3c7' },
  active:             { label: 'Active',            color: '#065f46', bg: '#d1fae5' },
  completed:          { label: 'Completed',         color: '#1e40af', bg: '#dbeafe' },
  cancelled:          { label: 'Cancelled',         color: '#991b1b', bg: '#fee2e2' },
};

const formatPrice = (p) => p >= 10000000 ? `₹${(p / 10000000).toFixed(2)}Cr` : p >= 100000 ? `₹${(p / 100000).toFixed(2)}L` : `₹${Number(p || 0).toLocaleString()}`;

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const icons = { draft: <FiClock size={12} />, pending_signatures: <FiAlertCircle size={12} />, active: <FiCheckCircle size={12} />, completed: <FiCheckCircle size={12} />, cancelled: <FiXCircle size={12} /> };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icons[status]} {cfg.label}
    </span>
  );
};

const ContractDetailModal = ({ contract, onClose, onStatusChange }) => {
  const [newStatus, setNewStatus] = useState(contract.status);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [auditLog, setAuditLog] = useState([]);

  useEffect(() => {
    API.get(`/purchase-contracts/${contract._id}/audit`)
      .then(r => setAuditLog(r.data.auditLog || []))
      .catch(() => {});
  }, [contract._id]);

  const handleStatusUpdate = async () => {
    if (newStatus === contract.status) { toast.error('Select a different status'); return; }
    setSaving(true);
    try {
      await API.put(`/purchase-contracts/${contract._id}/status`, { status: newStatus, notes });
      toast.success('Status updated');
      onStatusChange(contract._id, newStatus);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Contract ${contract.contractNumber}</title>
      <style>body{font-family:Georgia,serif;margin:40px;color:#111;line-height:1.7}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #eee}th{background:#f3f4f6;text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.box{padding:14px;border:1px solid #e5e7eb;border-radius:8px}</style>
      </head><body>
      <div style="text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:24px">
        <h2 style="margin:0">PROPERTY PURCHASE AGREEMENT</h2>
        <p style="font-size:0.85rem;color:#555">Contract No: <strong>${contract.contractNumber}</strong> | Status: <strong>${STATUS_CONFIG[contract.status]?.label}</strong></p>
      </div>
      <div class="grid" style="margin-bottom:20px">
        <div class="box"><strong style="color:#2563eb">BUYER</strong><br><strong>${contract.buyerName}</strong><br><small>${contract.buyerEmail}</small></div>
        <div class="box"><strong style="color:#16a34a">SELLER / OWNER</strong><br><strong>${contract.ownerName || '—'}</strong><br><small>${contract.ownerEmail || '—'}</small></div>
      </div>
      <div style="margin-bottom:20px">
        <strong>PROPERTY: </strong>${contract.propertyTitle}<br>
        <small style="color:#777">${contract.propertyAddress || ''}</small>
      </div>
      <table style="margin-bottom:20px"><thead><tr><th>Item</th><th>Value</th></tr></thead><tbody>
        <tr><td>Purchase Price</td><td><strong>${formatPrice(contract.purchasePrice)}</strong></td></tr>
        <tr><td>Advance Amount</td><td>${formatPrice(contract.advanceAmount)}</td></tr>
        <tr><td>Balance Amount</td><td>${formatPrice(contract.balanceAmount)}</td></tr>
        <tr><td>Handover Date</td><td>${contract.handoverDate ? new Date(contract.handoverDate).toLocaleDateString('en-IN') : 'TBD'}</td></tr>
        <tr><td>Created</td><td>${new Date(contract.createdAt).toLocaleDateString('en-IN')}</td></tr>
        <tr><td>Buyer Signed</td><td>${contract.buyerSignedAt ? new Date(contract.buyerSignedAt).toLocaleDateString('en-IN') : 'Pending'}</td></tr>
        <tr><td>Admin Approved</td><td>${contract.ownerSignedAt ? new Date(contract.ownerSignedAt).toLocaleDateString('en-IN') : 'Pending'}</td></tr>
      </tbody></table>
      <div style="text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px">
        PropManage Admin Panel | Contract ID: ${contract.contractNumber}
      </div>
      <script>window.onload=function(){window.print()}</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 20px' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="contract-modal-title" style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', borderBottom: '1px solid var(--gray-100)', paddingBottom: 20, marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 id="contract-modal-title" style={{ fontWeight: 800, margin: 0, fontSize: '1.1rem' }}>Contract: {contract.contractNumber}</h3>
              <div style={{ marginTop: 6 }}><StatusBadge status={contract.status} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrint} aria-label="Download contract as PDF" style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiDownload size={14} aria-hidden="true" /> PDF
              </button>
              <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 8px' }}>✕</button>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Parties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#f0f7ff', padding: 14, borderRadius: 10, borderLeft: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: 6 }}>Buyer</div>
              <div style={{ fontWeight: 700 }}>{contract.buyerName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{contract.buyerEmail}</div>
              {contract.buyerPhone && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{contract.buyerPhone}</div>}
            </div>
            <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 10, borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: 6 }}>Seller / Owner</div>
              <div style={{ fontWeight: 700 }}>{contract.ownerName || '—'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{contract.ownerEmail || '—'}</div>
            </div>
          </div>

          {/* Property & Financials */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{contract.propertyTitle}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{contract.propertyAddress}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Purchase Price', value: formatPrice(contract.purchasePrice), color: '#2563eb' },
              { label: 'Advance', value: formatPrice(contract.advanceAmount), color: '#16a34a' },
              { label: 'Balance', value: formatPrice(contract.balanceAmount), color: '#d97706' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, color, fontSize: '1rem' }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Signature Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: '0.82rem' }}>
            <div style={{ padding: 10, background: contract.buyerSignedAt ? '#f0fdf4' : '#fef9c3', borderRadius: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              {contract.buyerSignedAt ? <FiCheckCircle color="#16a34a" /> : <FiClock color="#92400e" />}
              <span><strong>Buyer:</strong> {contract.buyerSignedAt ? `Signed ${new Date(contract.buyerSignedAt).toLocaleDateString('en-IN')}` : 'Not signed yet'}</span>
            </div>
            <div style={{ padding: 10, background: contract.ownerSignedAt ? '#f0fdf4' : '#fef9c3', borderRadius: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              {contract.ownerSignedAt ? <FiCheckCircle color="#16a34a" /> : <FiClock color="#92400e" />}
              <span><strong>Owner:</strong> {contract.ownerSignedAt ? `Approved ${new Date(contract.ownerSignedAt).toLocaleDateString('en-IN')}` : 'Pending admin approval'}</span>
            </div>
          </div>

          {/* Status Update */}
          <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>Update Contract Status</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setNewStatus(key)} style={{ padding: '8px 14px', borderRadius: 8, border: `2px solid ${newStatus === key ? cfg.color : '#e5e7eb'}`, background: newStatus === key ? cfg.bg : 'white', color: newStatus === key ? cfg.color : 'var(--gray-600)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {cfg.label}
                </button>
              ))}
            </div>
            <input className="form-input" placeholder="Admin notes (optional)..." value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 10 }} />
            <button onClick={handleStatusUpdate} disabled={saving || newStatus === contract.status} className="btn btn-primary btn-sm">
              {saving ? 'Saving...' : <><FiCheck /> Update Status</>}
            </button>
          </div>

          {/* Audit Log */}
          {auditLog.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: '0.9rem' }}>Audit Trail</div>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...auditLog].reverse().map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.8rem', padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{log.action?.replace(/_/g, ' ')}</span>
                      {log.performedByName && <span style={{ color: 'var(--gray-500)' }}> — {log.performedByName} ({log.performedByRole})</span>}
                      {log.notes && <div style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>{log.notes}</div>}
                      <div style={{ color: 'var(--gray-400)', fontSize: '0.72rem', marginTop: 2 }}>{new Date(log.timestamp).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PurchaseContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      const { data } = await API.get(`/purchase-contracts/admin/all?${params}`);
      setContracts(data.contracts || []);
      setTotalPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const handleStatusChange = (id, newStatus) => {
    setContracts(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
  };

  const filtered = search
    ? contracts.filter(c =>
        c.contractNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.propertyTitle?.toLowerCase().includes(search.toLowerCase()) ||
        c.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
        c.buyerEmail?.toLowerCase().includes(search.toLowerCase())
      )
    : contracts;

  const stats = {
    total,
    pending: contracts.filter(c => c.status === 'pending_signatures').length,
    active: contracts.filter(c => c.status === 'active').length,
    totalValue: contracts.reduce((s, c) => s + (c.purchasePrice || 0), 0),
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Contracts', value: stats.total, color: '#dbeafe', icon: <FiFileText size={20} /> },
          { label: 'Pending Approval', value: stats.pending, color: '#fef3c7', icon: <FiAlertCircle size={20} /> },
          { label: 'Active', value: stats.active, color: '#d1fae5', icon: <FiCheckCircle size={20} /> },
          { label: 'Total Value', value: formatPrice(stats.totalValue), color: '#f3e8ff', icon: <FiFileText size={20} /> },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: s.color, borderRadius: 10, padding: 10 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', boxShadow: 'var(--shadow)', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input className="form-input" placeholder="Search by contract #, property, buyer..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <FiFilter size={15} color="var(--gray-500)" />
            <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ minWidth: 180 }}>
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={fetchContracts} title="Refresh"><FiRefreshCw size={14} /></button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
            <FiFileText size={40} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600 }}>No contracts found</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
              <tr>
                {['Contract #', 'Property', 'Buyer', 'Purchase Price', 'Advance', 'Handover', 'Signatures', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--gray-100)', background: i % 2 === 0 ? 'white' : 'var(--gray-50)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)' }}>{c.contractNumber}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.propertyTitle}</div>
                    {c.propertyCode && <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{c.propertyCode}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.buyerName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{c.buyerEmail}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>{formatPrice(c.purchasePrice)}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>{formatPrice(c.advanceAmount)}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{c.handoverDate ? new Date(c.handoverDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, fontSize: '0.72rem' }}>
                      <span style={{ background: c.buyerSignedAt ? '#d1fae5' : '#fef3c7', color: c.buyerSignedAt ? '#065f46' : '#92400e', padding: '2px 6px', borderRadius: 4 }}>B:{c.buyerSignedAt ? '✓' : '—'}</span>
                      <span style={{ background: c.ownerSignedAt ? '#d1fae5' : '#fef3c7', color: c.ownerSignedAt ? '#065f46' : '#92400e', padding: '2px 6px', borderRadius: 4 }}>O:{c.ownerSignedAt ? '✓' : '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={c.status} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => setSelected(c)} style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiEye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--gray-500)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {selected && (
        <ContractDetailModal
          contract={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default PurchaseContracts;
