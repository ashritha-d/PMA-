import React from 'react';
import { Link } from 'react-router-dom';
import { FiMaximize, FiMapPin, FiHeart, FiBarChart2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCompare } from '../context/CompareContext';

const API_BASE = process.env.REACT_APP_API_URL || '';
const getImgUrl = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

const PropertyCard = ({ property }) => {
  const { user, toggleFavorite } = useAuth();
  const { isComparing, toggleCompare } = useCompare();
  const isFav = user?.favorites?.includes(property._id);
  const comparing = isComparing(property._id);
  const img = getImgUrl(property.images?.[0]?.url);

  const formatPrice = (p) => p >= 10000000 ? `₹${(p / 10000000).toFixed(1)}Cr` : p >= 100000 ? `₹${(p / 100000).toFixed(1)}L` : `₹${p?.toLocaleString()}`;

  return (
    <div className="property-card">
      <div className="property-card-img">
        <img src={img} alt={property.title} loading="lazy" />
        <div className="property-card-badge">
          <span className={`badge ${property.listingType === 'rent' ? 'badge-primary' : 'badge-success'}`}>
            {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
          </span>
          {property.isFeatured && <span className="badge badge-warning">Featured</span>}
        </div>
        <button className="property-card-fav" onClick={() => toggleFavorite(property._id)} style={{ color: isFav ? '#ef4444' : '#9ca3af' }}>
          <FiHeart fill={isFav ? '#ef4444' : 'none'} />
        </button>
        <button
          className="property-card-fav"
          style={{ right: 54, color: comparing ? 'var(--primary)' : '#9ca3af', background: comparing ? 'var(--primary-light)' : undefined }}
          title={comparing ? 'Remove from comparison' : 'Add to comparison'}
          onClick={() => toggleCompare(property)}
        >
          <FiBarChart2 />
        </button>
      </div>
      <div className="property-card-body">
        <div className="property-card-price">
          {formatPrice(property.price)}
          {property.listingType === 'rent' && <span>/{property.priceUnit || 'month'}</span>}
        </div>
        <div className="property-card-title" title={property.title}>{property.title}</div>
        <div className="property-card-location" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiMapPin size={12} />
            {property.address?.city}, {property.address?.state}
          </span>
          <Link to={`/properties/${property._id}#location`} style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            📍 View on Map
          </Link>
        </div>
        <div className="property-card-features">
          {property.features?.bedrooms > 0 && (
            <div className="property-card-feature"><span>🛏</span> {property.features.bedrooms} Beds</div>
          )}
          {property.features?.bathrooms > 0 && (
            <div className="property-card-feature"><span>🚿</span> {property.features.bathrooms} Baths</div>
          )}
          {property.features?.builtupArea > 0 && (
            <div className="property-card-feature"><FiMaximize size={14} /> {property.features.builtupArea} sqft</div>
          )}
        </div>
        <Link to={`/properties/${property._id}`} className="btn btn-primary btn-full" style={{ marginTop: 16 }}>View Details</Link>
      </div>
    </div>
  );
};

export default PropertyCard;
