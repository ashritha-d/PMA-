import React, { useState, useEffect, useCallback } from 'react';
import { FiHome, FiKey, FiClipboard, FiDollarSign, FiTool, FiActivity } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const MODULE_ICON = {
  Property: <FiHome />,
  Tenant: <FiKey />,
  Contract: <FiClipboard />,
  Payment: <FiDollarSign />,
  ServTrans: <FiTool />,
};

const MODULES = ['Property', 'Tenant', 'Contract', 'Payment', 'ServTrans'];

const fmt = (d) => d ? new Date(d).toLocaleString('en-GB') : '—';

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (moduleFilter) params.set('module', moduleFilter);
      const { data } = await API.get(`/activity-logs?${params}`);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-subtitle">{total} action{total !== 1 ? 's' : ''} recorded</p>
        </div>
      </div>

      <div className="card card-body" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={{ width: 'auto' }} value={moduleFilter} onChange={e => { setModuleFilter(e.target.value); setPage(1); }}>
            <option value="">All Modules</option>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th>By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l._id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
                        {MODULE_ICON[l.module] || <FiActivity />} {l.module}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{l.action}</td>
                    <td style={{ fontSize: '0.82rem' }}>{l.description}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--gray-500)' }}>{l.referenceLabel || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{l.admin?.name || 'System'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{fmt(l.createdAt)}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="icon"><FiActivity size={32} /></div>
                        <h4>No activity recorded</h4>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination" style={{ padding: '16px 24px' }}>
          <div className="pagination-info">Showing {logs.length} of {total}</div>
          <div className="pagination-btns">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} className={page === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
