import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiTrendingUp, FiTrendingDown, FiDollarSign, FiFilter, FiChevronDown, FiChevronUp, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const TX_TYPE_LABELS = {
  rent_deposit: 'Rent Deposit',
  rent: 'Rent',
  refund: 'Refund',
  electricity_bill: 'Electricity Bill',
  water_bill: 'Water Bill',
  municipality: 'Municipality',
  maintenance: 'Maintenance',
  repair: 'Repair',
  miscellaneous: 'Miscellaneous',
};

const TX_TYPE_COLORS = {
  rent: '#3b82f6',
  rent_deposit: '#8b5cf6',
  refund: '#f59e0b',
  electricity_bill: '#f97316',
  water_bill: '#06b6d4',
  municipality: '#6366f1',
  maintenance: '#ec4899',
  repair: '#ef4444',
  miscellaneous: '#6b7280',
};

const CHEQUE_STATUS = {
  cleared: { icon: <FiCheckCircle size={12} />, color: '#10b981', label: 'Cleared' },
  bounced: { icon: <FiXCircle size={12} />, color: '#ef4444', label: 'Bounced' },
  pending: { icon: <FiClock size={12} />, color: '#f59e0b', label: 'Pending' },
};

const fmtMoney = (n) => n != null ? `₹${Number(n).toLocaleString()}` : '₹0';
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';

const StatCard = ({ label, value, sub, color, icon }) => (
  <div className="card card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '20', color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

const FinTrans = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalReceipts: 0, totalPayments: 0, netBalance: 0, count: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ transactionType: '', transactionNature: '', paymentMode: '', chequeStatus: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [updatingCheque, setUpdatingCheque] = useState(null);
  const navigate = useNavigate();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const [txRes, sumRes] = await Promise.all([
        API.get(`/fintrans?${params}`),
        API.get(`/fintrans/summary?${new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))}`),
      ]);
      setTransactions(txRes.data.transactions || []);
      setTotal(txRes.data.total || 0);
      setPages(txRes.data.pages || 1);
      setSummary(sumRes.data);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async () => {
    try {
      await API.delete(`/fintrans/${deleteId}`);
      toast.success('Transaction deleted');
      setDeleteId(null);
      fetchAll();
    } catch { toast.error('Failed to delete'); }
  };

  const updateChequeStatus = async (id, status) => {
    setUpdatingCheque(id);
    try {
      await API.patch(`/fintrans/${id}/cheque-status`, { chequeStatus: status });
      setTransactions(prev => prev.map(t => t._id === id ? { ...t, chequeStatus: status } : t));
      toast.success(`Cheque marked as ${status}`);
    } catch { toast.error('Failed to update cheque status'); }
    finally { setUpdatingCheque(null); }
  };

  const setFilter = (k) => (e) => { setFilters(f => ({ ...f, [k]: e.target.value })); setPage(1); };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Transactions</h1>
          <p className="page-subtitle">{total} transaction{total !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/fintrans/new" className="btn btn-primary"><FiPlus /> Add Transaction</Link>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard label="Total Receipts" value={fmtMoney(summary.totalReceipts)} sub="Money received" color="#10b981" icon={<FiTrendingUp size={20} />} />
        <StatCard label="Total Payments" value={fmtMoney(summary.totalPayments)} sub="Money paid out" color="#ef4444" icon={<FiTrendingDown size={20} />} />
        <StatCard
          label="Net Balance"
          value={fmtMoney(Math.abs(summary.netBalance))}
          sub={summary.netBalance >= 0 ? 'Net surplus' : 'Net deficit'}
          color={summary.netBalance >= 0 ? '#3b82f6' : '#f59e0b'}
          icon={<FiDollarSign size={20} />}
        />
      </div>

      {/* Search + filters */}
      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
            <FiSearch size={14} />
            <input
              placeholder="Search by ref#, property code, tenant, bank..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            className={`btn ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
            onClick={() => setShowFilters(p => !p)}
          >
            <FiFilter size={13} /> Filters
            {activeFilterCount > 0 && <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 10, padding: '0 6px', fontSize: '0.7rem' }}>{activeFilterCount}</span>}
            {showFilters ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
          </button>
        </div>
        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--gray-200)' }}>
            <div>
              <label className="form-label">Type</label>
              <select className="form-select" value={filters.transactionType} onChange={setFilter('transactionType')}>
                <option value="">All Types</option>
                {Object.entries(TX_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Nature</label>
              <select className="form-select" value={filters.transactionNature} onChange={setFilter('transactionNature')}>
                <option value="">Receipt & Payment</option>
                <option value="receipt">Receipt (In)</option>
                <option value="payment">Payment (Out)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Payment Mode</label>
              <select className="form-select" value={filters.paymentMode} onChange={setFilter('paymentMode')}>
                <option value="">All Modes</option>
                {['cash', 'cheque', 'online', 'card'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Cheque Status</label>
              <select className="form-select" value={filters.chequeStatus} onChange={setFilter('chequeStatus')}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
            <div>
              <label className="form-label">Date From</label>
              <input className="form-input" type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')} />
            </div>
            <div>
              <label className="form-label">Date To</label>
              <input className="form-input" type="date" value={filters.dateTo} onChange={setFilter('dateTo')} />
            </div>
            {activeFilterCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => { setFilters({ transactionType: '', transactionNature: '', paymentMode: '', chequeStatus: '', dateFrom: '', dateTo: '' }); setPage(1); }}>
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ref #</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Nature</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Cheque</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const typeColor = TX_TYPE_COLORS[t.transactionType] || '#6b7280';
                  const cheque = CHEQUE_STATUS[t.chequeStatus];
                  return (
                    <tr key={t._id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{t.finTransRef}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t.propertyId?.title || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontFamily: 'monospace' }}>{t.propertyCode}</div>
                      </td>
                      <td>
                        <span style={{ background: typeColor + '18', color: typeColor, padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700 }}>
                          {TX_TYPE_LABELS[t.transactionType] || t.transactionType}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: t.transactionNature === 'receipt' ? '#d1fae5' : '#fee2e2',
                          color: t.transactionNature === 'receipt' ? '#065f46' : '#991b1b',
                          padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
                        }}>
                          {t.transactionNature === 'receipt' ? <FiTrendingUp size={10} /> : <FiTrendingDown size={10} />}
                          {t.transactionNature === 'receipt' ? 'Receipt' : 'Payment'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, fontSize: '0.9rem', color: t.transactionNature === 'receipt' ? '#10b981' : '#ef4444' }}>
                        {t.transactionNature === 'receipt' ? '+' : '−'}{fmtMoney(t.amount)}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{fmt(t.transactionDate)}</td>
                      <td>
                        <span style={{ background: 'var(--gray-100)', color: 'var(--gray-600)', padding: '2px 8px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600 }}>
                          {t.paymentMode.charAt(0).toUpperCase() + t.paymentMode.slice(1)}
                        </span>
                      </td>
                      <td>
                        {t.paymentMode === 'cheque' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: cheque?.color, fontSize: '0.72rem', fontWeight: 700 }}>
                              {cheque?.icon} {cheque?.label}
                            </span>
                            {t.chequeStatus === 'pending' && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  disabled={updatingCheque === t._id}
                                  onClick={() => updateChequeStatus(t._id, 'cleared')}
                                  title="Mark cleared"
                                  style={{ background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                                >✓</button>
                                <button
                                  disabled={updatingCheque === t._id}
                                  onClick={() => updateChequeStatus(t._id, 'bounced')}
                                  title="Mark bounced"
                                  style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700 }}
                                >✗</button>
                              </div>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--gray-300)', fontSize: '0.78rem' }}>—</span>}
                      </td>
                      <td>
                        <div className="td-actions">
                          <button onClick={() => navigate(`/fintrans/edit/${t._id}`)} className="btn btn-icon btn-outline" title="Edit"><FiEdit2 /></button>
                          <button onClick={() => setDeleteId(t._id)} className="btn btn-icon btn-danger" title="Delete"><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <div className="icon"><FiDollarSign size={32} /></div>
                        <h4>No transactions found</h4>
                        <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Record your first financial transaction to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {transactions.length} of {total}</div>
          <div className="pagination-btns">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {deleteId && (
        <div className="confirm-overlay" onClick={() => setDeleteId(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Delete Transaction?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24, fontSize: '0.9rem' }}>This permanently removes the transaction record.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinTrans;
