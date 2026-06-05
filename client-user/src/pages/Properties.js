import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiGrid, FiList } from 'react-icons/fi';
import PropertyCard from '../components/PropertyCard';
import API from '../api/axios';

const CITIES = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];

const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || '',
    listingType: searchParams.get('listingType') || '',
    city: searchParams.get('city') || '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    furnished: '',
  });

  const fetchProperties = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 12 });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const { data } = await API.get(`/properties?${params.toString()}`);
      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (err) {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchProperties(page); }, [page]);
  useEffect(() => { setPage(1); fetchProperties(1); }, [filters]);

  const handleFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters({ search: '', type: '', listingType: '', city: '', minPrice: '', maxPrice: '', bedrooms: '', furnished: '' });

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: '100vh', paddingTop: 32, paddingBottom: 80 }}>
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Property Listings</h1>
          <p style={{ color: 'var(--gray-500)' }}>Showing {total} properties</p>
        </div>

        {/* Search + Filter Toggle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ flex: 1, minWidth: 240 }} placeholder="Search properties..." value={filters.search} onChange={e => handleFilter('search', e.target.value)} />
          <button className="btn btn-outline" onClick={() => setShowFilters(!showFilters)}><FiFilter /> Filters</button>
          {Object.values(filters).some(Boolean) && <button className="btn btn-ghost" onClick={clearFilters}><FiX /> Clear</button>}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-row">
              <div className="filter-group">
                <label className="form-label">Listing Type</label>
                <select className="form-select" value={filters.listingType} onChange={e => handleFilter('listingType', e.target.value)}>
                  <option value="">All</option>
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label">Property Type</label>
                <select className="form-select" value={filters.type} onChange={e => handleFilter('type', e.target.value)}>
                  <option value="">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="commercial">Commercial</option>
                  <option value="office">Office</option>
                  <option value="plot">Plot</option>
                  <option value="pg">PG/Hostel</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label">City</label>
                <select className="form-select" value={filters.city} onChange={e => handleFilter('city', e.target.value)}>
                  <option value="">All Cities</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label">Bedrooms</label>
                <select className="form-select" value={filters.bedrooms} onChange={e => handleFilter('bedrooms', e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label">Furnished</label>
                <select className="form-select" value={filters.furnished} onChange={e => handleFilter('furnished', e.target.value)}>
                  <option value="">Any</option>
                  <option value="furnished">Furnished</option>
                  <option value="semi-furnished">Semi-Furnished</option>
                  <option value="unfurnished">Unfurnished</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="form-label">Min Price (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={filters.minPrice} onChange={e => handleFilter('minPrice', e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="form-label">Max Price (₹)</label>
                <input className="form-input" type="number" placeholder="Any" value={filters.maxPrice} onChange={e => handleFilter('maxPrice', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : properties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>🏠</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>No properties found</h3>
            <p style={{ color: 'var(--gray-500)' }}>Try adjusting your filters or search term</p>
            <button onClick={clearFilters} className="btn btn-primary" style={{ marginTop: 24 }}>Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="properties-grid">
              {properties.map(p => <PropertyCard key={p._id} property={p} />)}
            </div>
            {pages > 1 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(n => (
                  <button key={n} className={page === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>
                ))}
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Properties;
