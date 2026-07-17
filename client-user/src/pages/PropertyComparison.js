import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import API from '../api/axios';

const API_BASE = process.env.REACT_APP_API_URL || '';
const getImgUrl = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};
const formatPrice = (p) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : p >= 100000 ? `₹${(p / 100000).toFixed(1)}L` : `₹${p?.toLocaleString()}`;

const ROWS = [
  { label: 'Price', get: p => formatPrice(p.price) + (p.listingType === 'rent' ? `/${p.priceUnit}` : '') },
  { label: 'Type', get: p => p.type },
  { label: 'Listing', get: p => p.listingType === 'rent' ? 'For Rent' : 'For Sale' },
  { label: 'City', get: p => p.address?.city || '—' },
  { label: 'Bedrooms', get: p => p.features?.bedrooms ?? '—' },
  { label: 'Bathrooms', get: p => p.features?.bathrooms ?? '—' },
  { label: 'Carpet Area', get: p => p.features?.carpetArea ? `${p.features.carpetArea} sqft` : '—' },
  { label: 'Furnished', get: p => p.features?.furnished || '—' },
  { label: 'Car Parkings', get: p => p.features?.carParkings ?? '—' },
  { label: 'Amenities', get: p => p.amenities?.length ? p.amenities.join(', ') : '—' },
  { label: 'Status', get: p => p.status },
  { label: 'Rating', get: p => p.rating ? `${p.rating.toFixed(1)} (${p.reviewCount || 0} reviews)` : 'No reviews yet' },
];

const PropertyComparison = () => {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ids = searchParams.get('ids');
    if (!ids) { setError('No properties selected for comparison'); setLoading(false); return; }
    API.get(`/properties/compare?ids=${ids}`)
      .then(({ data }) => setProperties(data.properties || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load comparison'))
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: '100vh', paddingTop: 32, paddingBottom: 80 }}>
      <div className="container">
        <Link to="/properties" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}><FiArrowLeft /> Back to Properties</Link>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 24 }}>Compare Properties</h1>

        {error && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-500)' }}>{error}</div>}

        {!error && properties.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-md, 0 2px 8px rgba(0,0,0,0.06))' }}>
              <thead>
                <tr>
                  <th style={{ padding: 16, textAlign: 'left', width: 160 }}></th>
                  {properties.map(p => (
                    <th key={p._id} style={{ padding: 16, minWidth: 220 }}>
                      <img src={getImgUrl(p.images?.[0]?.url)} alt={p.title} style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
                      <Link to={`/properties/${p._id}`} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)', display: 'block' }}>{p.title}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => (
                  <tr key={row.label} style={{ background: i % 2 === 0 ? 'var(--gray-50)' : 'white' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-500)' }}>{row.label}</td>
                    {properties.map(p => (
                      <td key={p._id} style={{ padding: '12px 16px', fontSize: '0.85rem', textAlign: 'center' }}>{row.get(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyComparison;
