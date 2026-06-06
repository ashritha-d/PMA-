import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiCalendar, FiHome, FiUser, FiUserCheck, FiDollarSign, FiRefreshCw, FiSlash, FiAlertTriangle } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  active:     { bg: '#d1fae5', color: '#065f46' },
  expired:    { bg: '#fee2e2', color: '#991b1b' },
  terminated: { bg: '#f3f4f6', color: '#374151' },
  renewed:    { bg: '#e0f2fe', color: '#075985' },
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: '0.875rem', color: 'var(--gray-800)', fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

const Card = ({ title, icon, children }) => (
  <div className="card card-body">
    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon} {title}
    </h3>
    {children}
  </div>
);

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRenew, setShowRenew] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewRent, setRenewRent] = useState('');
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().slice(0, 10));
  const [acting, setActing] = useState(false);

  useEffect(() => {
    API.get(`/contracts/${id}`)
      .then(({ data }) => setContract(data.contract))
      .catch(() => toast.error('Failed to load contract'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRenew = async () => {
    if (!renewEndDate) { toast.error('New end date is required'); return; }
    setActing(true);
    try {
      const { data } = await API.post(`/contracts/${id}/renew`, { newEndDate: renewEndDate, rentAmount: renewRent || undefined });
      toast.success(`Contract renewed — new contract ${data.contract.contractNumber}`);
      navigate(`/contracts/${data.contract._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Renewal failed');
    } finally { setActing(false); setShowRenew(false); }
  };

  const handleTerminate = async () => {
    setActing(true);
    try {
      await API.patch(`/contracts/${id}/terminate`, { terminationDate: terminateDate });
      toast.success('Contract terminated');
      setContract(c => ({ ...c, status: 'terminated', contractTerminationDate: terminateDate }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Termination failed');
    } finally { setActing(false); setShowTerminate(false); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!contract) return <div className="page-header"><p>Contract not found.</p></div>;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
  const fmtMoney = (n) => n != null ? `₹${Number(n).toLocaleString()}` : '—';
  const s = STATUS_STYLES[contract.status] || STATUS_STYLES.expired;

  const days = contract.contractEndDate
    ? Math.ceil((new Date(contract.contractEndDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const periodDays = contract.contractStartDate && contract.contractEndDate
    ? Math.ceil((new Date(contract.contractEndDate) - new Date(contract.contractStartDate)) / (1000 * 60 * 60 * 24))
    : null;

  const progressPct = periodDays && contract.contractStartDate
    ? Math.min(100, Math.max(0, Math.round(((new Date() - new Date(contract.contractStartDate)) / (1000 * 60 * 60 * 24)) / periodDays * 100)))
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/contracts')} className="btn btn-ghost btn-icon"><FiArrowLeft /></button>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {contract.contractNumber}
              <span style={{ background: s.bg, color: s.color, padding: '2px 12px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700 }}>
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </span>
            </h1>
            <p className="page-subtitle">
              {contract.tenantName} · {contract.propertyCode}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {contract.status === 'active' && (
            <>
              <button className="btn btn-ghost" style={{ color: '#f59e0b', borderColor: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowRenew(true)}>
                <FiRefreshCw size={14} /> Renew
              </button>
              <button className="btn btn-ghost" style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowTerminate(true)}>
                <FiSlash size={14} /> Terminate
              </button>
            </>
          )}
          <Link to={`/contracts/edit/${id}`} className="btn btn-primary"><FiEdit2 /> Edit</Link>
        </div>
      </div>

      {/* Lease progress bar */}
      {contract.status === 'active' && periodDays && (
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--gray-500)' }}>Contract Progress — {periodDays} days total</span>
            <span style={{ fontWeight: 700, color: days != null && days < 0 ? '#ef4444' : days != null && days <= 30 ? '#f59e0b' : 'var(--primary)' }}>
              {days != null ? (days < 0 ? 'Expired' : days === 0 ? 'Ends today' : `${days} days remaining`) : ''}
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--gray-100)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: days != null && days <= 30 ? '#f59e0b' : 'var(--primary)', borderRadius: 5, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.7rem', color: 'var(--gray-400)' }}>
            <span>{fmt(contract.contractStartDate)}</span>
            <span>{fmt(contract.contractEndDate)}</span>
          </div>
          {days != null && days <= 30 && days > 0 && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', borderRadius: 8, fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiAlertTriangle size={13} /> This contract expires in <strong>{days} days</strong>. Consider renewing now.
            </div>
          )}
        </div>
      )}

      {/* Financial summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Rent', value: fmtMoney(contract.rentAmount), sub: contract.rentPaymentType, color: 'var(--primary)' },
          { label: 'Deposit', value: fmtMoney(contract.depositAmount), sub: contract.depositPaymentMode, color: '#10b981' },
          { label: 'Total Rent', value: fmtMoney(contract.rentAmount * (contract.rentPaymentType === 'monthly' ? 12 : contract.rentPaymentType === 'quarterly' ? 4 : contract.rentPaymentType === 'half-yearly' ? 2 : 1)), sub: 'per year', color: 'var(--gray-700)' },
          { label: 'Notice Period', value: `${contract.noticePeriod || 30} days`, sub: contract.isNewTenant ? 'New tenant' : 'Renewal', color: '#7c3aed' },
        ].map(item => (
          <div key={item.label} className="card card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)', marginTop: 2 }}>{item.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Linked entities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 20 }}>
        <Card title="Property" icon={<FiHome size={14} />}>
          {contract.propertyId ? (
            <div>
              <div style={{ fontWeight: 600 }}>{contract.propertyId.title}</div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--gray-400)', marginTop: 2 }}>{contract.propertyCode}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 6 }}>{contract.propertyId.address?.city}, {contract.propertyId.address?.country}</div>
              <Link to={`/properties/edit/${contract.propertyId._id}`} style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>View property →</Link>
            </div>
          ) : <div style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>No property linked</div>}
        </Card>

        <Card title="Owner" icon={<FiUserCheck size={14} />}>
          {contract.ownerId ? (
            <div>
              <div style={{ fontWeight: 600 }}>{contract.ownerId.salutation} {contract.ownerId.firstName} {contract.ownerId.lastName}</div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--gray-400)', marginTop: 2 }}>{contract.ownerCode}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 6 }}>{contract.ownerId.email}</div>
              <Link to={`/owners/${contract.ownerId._id}`} style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>View owner →</Link>
            </div>
          ) : <div style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>No owner linked</div>}
        </Card>

        <Card title="Tenant" icon={<FiUser size={14} />}>
          {contract.tenantId ? (
            <div>
              <div style={{ fontWeight: 600 }}>{contract.tenantId.salutation} {contract.tenantId.firstName} {contract.tenantId.lastName}</div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--gray-400)', marginTop: 2 }}>{contract.tenantCode}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 6 }}>{contract.tenantId.email}</div>
              <Link to={`/tenants/${contract.tenantId._id}`} style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: 8, display: 'inline-block' }}>View tenant →</Link>
            </div>
          ) : <div style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>No tenant linked</div>}
        </Card>
      </div>

      {/* Contract dates & payment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="Key Dates" icon={<FiCalendar size={14} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InfoRow label="Start Date" value={fmt(contract.contractStartDate)} />
            <InfoRow label="End Date" value={fmt(contract.contractEndDate)} />
            <InfoRow label="Move-In" value={fmt(contract.moveInDate)} />
            <InfoRow label="Move-Out" value={fmt(contract.moveOutDate)} />
            <InfoRow label="First Move-In" value={fmt(contract.firstMoveInDate)} />
            <InfoRow label="Renewal Date" value={fmt(contract.renewalDate)} />
            {contract.contractTerminationDate && <InfoRow label="Terminated On" value={fmt(contract.contractTerminationDate)} />}
          </div>
        </Card>

        <Card title="Payment Details" icon={<FiDollarSign size={14} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InfoRow label="Rent Payment" value={`${contract.rentPaymentType} · ${contract.rentPaymentMode}`} />
            <InfoRow label="Deposit Payment" value={contract.depositPaymentMode} />
            <InfoRow label="Rent Description" value={contract.rentDescription} />
          </div>
        </Card>
      </div>

      {/* Renewal lineage */}
      {contract.renewedFrom && (
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 12, color: 'var(--gray-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiRefreshCw size={14} /> Renewed From
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem' }}>
            <span style={{ fontFamily: 'monospace', background: 'var(--gray-100)', padding: '3px 8px', borderRadius: 4 }}>{contract.renewedFrom.contractNumber}</span>
            <span style={{ color: 'var(--gray-500)' }}>{fmt(contract.renewedFrom.contractStartDate)} → {fmt(contract.renewedFrom.contractEndDate)}</span>
            <Link to={`/contracts/${contract.renewedFrom._id}`} style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>View original →</Link>
          </div>
        </div>
      )}

      {contract.notes && (
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, color: 'var(--gray-600)' }}>Notes</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>{contract.notes}</p>
        </div>
      )}

      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FiCalendar size={12} /> Created: {fmt(contract.createdAt)}
        {contract.createdBy?.name && <> by <strong>{contract.createdBy.name}</strong></>}
      </div>

      {/* Renew modal */}
      {showRenew && (
        <div className="confirm-overlay" onClick={() => setShowRenew(false)}>
          <div className="confirm-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔄</div>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Renew Contract</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 20 }}>
              This will mark the current contract as <strong>Renewed</strong> and create a new active contract starting from <strong>{fmt(contract.contractEndDate)}</strong>.
            </p>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">New End Date *</label>
              <input className="form-input" type="date" value={renewEndDate} onChange={e => setRenewEndDate(e.target.value)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">New Rent Amount (leave blank to keep ₹{contract.rentAmount?.toLocaleString()})</label>
              <input className="form-input" type="number" min="0" value={renewRent} onChange={e => setRenewRent(e.target.value)} placeholder={`Current: ₹${contract.rentAmount?.toLocaleString()}`} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setShowRenew(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={acting} onClick={handleRenew}><FiRefreshCw size={13} /> {acting ? 'Renewing...' : 'Renew Contract'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate modal */}
      {showTerminate && (
        <div className="confirm-overlay" onClick={() => setShowTerminate(false)}>
          <div className="confirm-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Terminate Contract</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 20 }}>
              The contract will be marked <strong>Terminated</strong> and the property will be freed up.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Termination Date</label>
              <input className="form-input" type="date" value={terminateDate} onChange={e => setTerminateDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setShowTerminate(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={acting} onClick={handleTerminate}><FiSlash size={13} /> {acting ? 'Terminating...' : 'Terminate'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDetail;
