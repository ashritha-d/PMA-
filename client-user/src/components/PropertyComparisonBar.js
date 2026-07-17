import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiBarChart2 } from 'react-icons/fi';
import { useCompare } from '../context/CompareContext';

const API_BASE = process.env.REACT_APP_API_URL || '';
const getImgUrl = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100&q=80';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

const PropertyComparisonBar = () => {
  const { compareItems, removeCompare, clearCompare } = useCompare();
  const navigate = useNavigate();

  if (compareItems.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white',
      borderTop: '1px solid var(--gray-200)', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
      padding: '12px 20px', zIndex: 90, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
        {compareItems.map(p => (
          <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--gray-50)', borderRadius: 8, padding: '4px 8px 4px 4px' }}>
            <img src={getImgUrl(p.image)} alt="" style={{ width: 32, height: 28, objectFit: 'cover', borderRadius: 5 }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
            <button onClick={() => removeCompare(p._id)} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', display: 'flex' }}>
              <FiX size={13} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={clearCompare}>Clear</button>
        <button
          className="btn btn-primary"
          disabled={compareItems.length < 2}
          onClick={() => navigate(`/compare?ids=${compareItems.map(p => p._id).join(',')}`)}
        >
          <FiBarChart2 /> Compare ({compareItems.length})
        </button>
      </div>
    </div>
  );
};

export default PropertyComparisonBar;
