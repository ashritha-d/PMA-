import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';
import API from '../api/axios';

// Debounced duplicate-listing check — fires ~600ms after title/city/type/price
// settle, same debounce pattern used elsewhere in this app (e.g. the property
// search in ServTransForm.js).
const DuplicateWarningBanner = ({ title, city, type, price, excludeId }) => {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!title || !city || !type || title.trim().length < 4) { setMatches([]); return; }
    const t = setTimeout(() => {
      const params = new URLSearchParams({ title, city, type });
      if (price) params.set('price', price);
      if (excludeId) params.set('excludeId', excludeId);
      API.get(`/ai/duplicate-check?${params}`)
        .then(({ data }) => setMatches(data.matches || []))
        .catch(() => setMatches([]));
    }, 600);
    return () => clearTimeout(t);
  }, [title, city, type, price, excludeId]);

  if (matches.length === 0) return null;

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10 }}>
      <FiAlertTriangle style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: 6 }}>
          Possible duplicate listing{matches.length > 1 ? 's' : ''} found
        </div>
        {matches.map(m => (
          <div key={m.propertyId} style={{ fontSize: '0.8rem', color: '#78350f', marginBottom: 2 }}>
            <Link to={`/properties/edit/${m.propertyId}`} target="_blank" style={{ color: '#92400e', fontWeight: 600 }}>{m.title}</Link>
            {' '}({m.propertyCode}) — {m.similarity}% title match
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuplicateWarningBanner;
