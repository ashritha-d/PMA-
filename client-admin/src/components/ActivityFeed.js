import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiKey, FiClipboard, FiDollarSign, FiTool, FiActivity } from 'react-icons/fi';
import API from '../api/axios';

const MODULE_ICON = {
  Property: <FiHome />,
  Tenant: <FiKey />,
  Contract: <FiClipboard />,
  Payment: <FiDollarSign />,
  ServTrans: <FiTool />,
};

const timeAgo = (d) => {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

const ActivityFeed = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    API.get('/activity-logs/recent?limit=8').then(r => setLogs(r.data.logs || [])).catch(() => {});
  }, []);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <h3>Recent Activity</h3>
        <Link to="/activity-log" className="btn btn-ghost btn-sm">View All</Link>
      </div>
      <div style={{ padding: '4px 20px 16px' }}>
        {logs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No activity yet</div>}
        {logs.map(l => (
          <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
              {MODULE_ICON[l.module] || <FiActivity />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.description}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{l.admin?.name || 'System'} · {timeAgo(l.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
