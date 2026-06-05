import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import API from '../api/axios';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/auth/favorites').then(r => setFavorites(r.data.favorites || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '40px 0' }}>
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Saved Properties</h1>
          <p style={{ color: 'var(--gray-500)' }}>Properties you've marked as favorites</p>
        </div>
        {loading ? <div className="loading-screen"><div className="spinner" /></div> : favorites.length === 0 ? (
          <div className="card card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>❤️</div>
            <h3>No saved properties</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Click the heart icon on any property to save it</p>
            <Link to="/properties" className="btn btn-primary">Browse Properties</Link>
          </div>
        ) : (
          <div className="properties-grid">
            {favorites.map(p => <PropertyCard key={p._id} property={p} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
