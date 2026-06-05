import React from 'react';
import { Link } from 'react-router-dom';
import { FiMaximize, FiMapPin, FiHeart } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const PropertyCard = ({ property }) => {
  const { user, toggleFavorite } = useAuth();
  const isFav = user?.favorites?.includes(property._id);
  const img = property.images?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80';

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
      </div>
      <div className="property-card-body">
        <div className="property-card-price">
          {formatPrice(property.price)}
          {property.listingType === 'rent' && <span>/{property.priceUnit || 'month'}</span>}
        </div>
        <div className="property-card-title" title={property.title}>{property.title}</div>
        <div className="property-card-location">
          <FiMapPin size={12} />
          {property.address?.city}, {property.address?.state}
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
