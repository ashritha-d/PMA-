import React from 'react';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { FiNavigation, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const MAP_OPTIONS = {
  zoomControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  streetViewControl: true,
};

const PropertyLocationMap = ({ property }) => {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: API_KEY || '' });
  const coords = property?.location?.coordinates;
  const hasCoords = Array.isArray(coords) && (coords[0] !== 0 || coords[1] !== 0);
  const [lng, lat] = hasCoords ? coords : [0, 0];
  const fullAddress = [property?.address?.line1, property?.address?.city, property?.address?.state, property?.address?.zipCode, property?.address?.country].filter(Boolean).join(', ');

  // Prefer coordinates when available; fall back to an address text search
  // so the button still works for older properties saved before this
  // feature existed (no lat/lng on record). null when there's truly nothing
  // to point at, which disables the button rather than opening a blank/bad
  // Maps query.
  const viewOnMapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : fullAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
      : null;

  const viewOnMaps = () => {
    if (viewOnMapsUrl) window.open(viewOnMapsUrl, '_blank', 'noopener,noreferrer');
  };

  const getDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${property.placeId ? `&destination_place_id=${property.placeId}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      toast.success('Address copied');
    } catch {
      toast.error('Could not copy address');
    }
  };

  return (
    <div id="location" style={{ background: 'white', borderRadius: 12, padding: 28, marginBottom: 28, scrollMarginTop: 90 }}>
      <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Location</h3>

      {!API_KEY ? (
        <div style={{ padding: 24, background: 'var(--gray-50)', border: '1px dashed var(--gray-300)', borderRadius: 8, color: 'var(--gray-500)', fontSize: '0.85rem', textAlign: 'center' }}>
          Map preview unavailable.
        </div>
      ) : loadError ? (
        <div style={{ padding: 24, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.85rem', textAlign: 'center' }}>
          Failed to load the map.
        </div>
      ) : !hasCoords ? (
        <div style={{ padding: 24, background: 'var(--gray-50)', borderRadius: 8, color: 'var(--gray-400)', fontSize: '0.85rem', textAlign: 'center' }}>
          Exact location not available for this property yet.
        </div>
      ) : !isLoaded ? (
        <div style={{ padding: 24, color: 'var(--gray-400)', fontSize: '0.85rem', textAlign: 'center' }}>Loading map…</div>
      ) : (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gray-200)', marginBottom: 16 }}>
          <GoogleMap mapContainerStyle={{ width: '100%', height: 320 }} center={{ lat, lng }} zoom={15} options={MAP_OPTIONS}>
            <Marker position={{ lat, lng }} />
          </GoogleMap>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: hasCoords ? 16 : 0 }}>
        <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.8 }}>
          {property?.address?.line1 && <div>{property.address.line1}</div>}
          {property?.address?.city && <div>{property.address.city}{property?.address?.state ? `, ${property.address.state}` : ''}</div>}
          {property?.address?.zipCode && <div>{property.address.zipCode}</div>}
          {property?.address?.country && <div>{property.address.country}</div>}
        </div>

        <div>
          <button
            className="btn btn-primary btn-sm"
            onClick={viewOnMaps}
            disabled={!viewOnMapsUrl}
            aria-label={viewOnMapsUrl ? "View this property's location on Google Maps" : 'Property location not available'}
            title={viewOnMapsUrl ? "Open this property's location in Google Maps" : 'Location not available'}
            style={!viewOnMapsUrl ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            📍 View on Google Maps
          </button>
          {!viewOnMapsUrl && <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4, textAlign: 'right' }}>Location not available</div>}
        </div>
      </div>

      {hasCoords && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={getDirections}><FiNavigation /> Get Directions</button>
          <button className="btn btn-ghost btn-sm" onClick={copyAddress}><FiCopy /> Copy Address</button>
        </div>
      )}
    </div>
  );
};

export default PropertyLocationMap;
