import React, { useRef } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';

const LIBRARIES = ['places'];
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

const parseAddressComponents = (components) => {
  const get = (type) => components.find(c => c.types.includes(type))?.long_name || '';
  const streetNumber = get('street_number');
  const route = get('route');
  return {
    line1: [streetNumber, route].filter(Boolean).join(' '),
    city: get('locality') || get('administrative_area_level_2'),
    state: get('administrative_area_level_1'),
    country: get('country'),
    zipCode: get('postal_code'),
  };
};

// address: {line1,city,state,country,zipCode,...}
// coordinates: [lng, lat]
// onSelect({address, coordinates, placeId}) fires on an Autocomplete pick.
// onCoordinatesChange([lng,lat]) fires on marker drag (pin-only adjustment,
// does not touch the text address fields).
const LocationPicker = ({ address, coordinates, onSelect, onCoordinatesChange }) => {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: API_KEY || '', libraries: LIBRARIES });
  const autocompleteRef = useRef(null);
  const hasCoords = Array.isArray(coordinates) && (coordinates[0] !== 0 || coordinates[1] !== 0);
  const center = hasCoords ? { lat: coordinates[1], lng: coordinates[0] } : INDIA_CENTER;

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const parsed = parseAddressComponents(place.address_components || []);
    onSelect({
      address: { ...parsed, line1: parsed.line1 || place.name || place.formatted_address || '' },
      coordinates: [lng, lat],
      placeId: place.place_id || '',
    });
  };

  const handleMarkerDragEnd = (e) => {
    onCoordinatesChange([e.latLng.lng(), e.latLng.lat()]);
  };

  if (!API_KEY) {
    return (
      <div style={{ padding: 16, background: 'var(--gray-50)', border: '1px dashed var(--gray-300)', borderRadius: 8, color: 'var(--gray-500)', fontSize: '0.85rem', textAlign: 'center' }}>
        Map preview unavailable — add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to <code>client-admin/.env</code> to enable location search.
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b', fontSize: '0.85rem' }}>
        Failed to load Google Maps. Check the API key and that the Maps JavaScript &amp; Places APIs are enabled.
      </div>
    );
  }

  if (!isLoaded) {
    return <div style={{ padding: 16, color: 'var(--gray-400)', fontSize: '0.85rem' }}>Loading map…</div>;
  }

  return (
    <div>
      <Autocomplete onLoad={ref => (autocompleteRef.current = ref)} onPlaceChanged={handlePlaceChanged}>
        <input className="form-input" placeholder="Search address, landmark, city, or pincode…" style={{ marginBottom: 12 }} />
      </Autocomplete>
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
        <GoogleMap mapContainerStyle={{ width: '100%', height: 280 }} center={center} zoom={hasCoords ? 15 : 5}>
          {hasCoords && (
            <Marker position={{ lat: coordinates[1], lng: coordinates[0] }} draggable onDragEnd={handleMarkerDragEnd} />
          )}
        </GoogleMap>
      </div>
      {hasCoords && (
        <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 6 }}>
          Drag the marker to fine-tune the exact pin — this only adjusts the map position, not the address fields above.
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
