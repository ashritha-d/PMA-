import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiX, FiArrowLeft, FiCheckCircle, FiCircle } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';
import AIDescriptionAssist from '../components/AIDescriptionAssist';
import DuplicateWarningBanner from '../components/DuplicateWarningBanner';

const AMENITIES = ['Swimming Pool', 'Gym', 'Security', 'Parking', 'Lift', 'Power Backup', 'Garden', 'Club House', 'WiFi', 'Air Conditioning', 'Modular Kitchen', 'Intercom', 'CCTV', 'Fire Safety'];

// Pure client-side completeness check — no server round-trip needed since
// it only ever looks at data already in the form (works identically for an
// unsaved draft and a saved property being edited).
const buildChecklist = (form, imageCount) => [
  { label: 'Title', done: form.title.trim().length >= 8 },
  { label: 'Description (50+ characters)', done: form.description.trim().length >= 50 },
  { label: 'At least one photo', done: imageCount > 0 },
  { label: 'Price set', done: Number(form.price) > 0 },
  { label: 'City', done: !!form.address.city.trim() },
  { label: 'Amenities selected', done: form.amenities.length > 0 },
  { label: 'Owner/agent contact', done: !!(form.ownerInfo.name && form.ownerInfo.phone) },
];

const PropertyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const fileRef = useRef();

  const [form, setForm] = useState({
    title: '', description: '', type: 'apartment', listingType: 'rent', price: '', priceUnit: 'month',
    address: { line1: '', line2: '', city: '', state: '', country: 'India', zipCode: '', landmark: '' },
    features: { bedrooms: '', bathrooms: '', washrooms: '', balconies: '', carParkings: '', servantRooms: '', landArea: '', carpetArea: '', builtupArea: '', facing: '', furnished: 'unfurnished', yearOfConstruction: '' },
    ownerInfo: { name: '', phone: '', email: '' },
    amenities: [],
    status: 'available',
    isFeatured: false,
    municipalityNumber: '', electricityBillNumber: '', waterBillNumber: '',
    propertyValue: '', expectedRent: '',
  });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/categories').then(r => setCategories(r.data.categories || [])).catch(() => {});
    if (isEdit) {
      API.get(`/properties/${id}`).then(r => {
        const p = r.data.property;
        setForm({
          title: p.title || '', description: p.description || '', type: p.type || 'apartment', listingType: p.listingType || 'rent', price: p.price || '', priceUnit: p.priceUnit || 'month',
          address: p.address || { line1: '', line2: '', city: '', state: '', country: 'India', zipCode: '', landmark: '' },
          features: { ...{ bedrooms: '', bathrooms: '', washrooms: '', balconies: '', carParkings: '', servantRooms: '', landArea: '', carpetArea: '', builtupArea: '', facing: '', furnished: 'unfurnished', yearOfConstruction: '' }, ...p.features },
          ownerInfo: p.ownerInfo || { name: '', phone: '', email: '' },
          amenities: p.amenities || [],
          status: p.status || 'available', isFeatured: p.isFeatured || false,
          municipalityNumber: p.municipalityNumber || '', electricityBillNumber: p.electricityBillNumber || '', waterBillNumber: p.waterBillNumber || '',
          propertyValue: p.propertyValue || '', expectedRent: p.expectedRent || '',
          category: p.category?._id || '',
        });
        setExistingImages(p.images || []);
      }).catch(() => toast.error('Failed to load property'));
    }
  }, [id, isEdit]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(f => ({ file: f, url: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...previews]);
  };

  const removeNewImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const removeExistingImage = (i) => setExistingImages(prev => prev.filter((_, idx) => idx !== i));

  const toggleAmenity = (a) => setForm(prev => ({ ...prev, amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      const data = { ...form, existingImages };
      fd.append('data', JSON.stringify(data));
      images.forEach(img => fd.append('images', img.file));

      if (isEdit) {
        await API.put(`/properties/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Property updated!');
      } else {
        await API.post('/properties', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Property created!');
      }
      navigate('/properties');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save property');
    } finally { setSaving(false); }
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setNested = (key, subKey, val) => setForm(prev => ({ ...prev, [key]: { ...prev[key], [subKey]: val } }));

  return (
    <div>
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/properties')} className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}><FiArrowLeft /> Back</button>
          <h1 className="page-title">{isEdit ? 'Edit Property' : 'Add New Property'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Basic Info */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Basic Information</h3>
              <DuplicateWarningBanner
                title={form.title}
                city={form.address.city}
                type={form.type}
                price={form.price}
                excludeId={isEdit ? id : undefined}
              />
              <div className="form-group">
                <label className="form-label">Property Title *</label>
                <input className="form-input" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Luxurious 3BHK Apartment in Banjara Hills" />
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" required rows={5} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the property..." />
                <AIDescriptionAssist
                  formData={{ title: form.title, type: form.type, listingType: form.listingType, city: form.address.city, state: form.address.state, features: form.features, amenities: form.amenities }}
                  onApply={(text) => set('description', text)}
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Property Type *</label>
                  <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                    {['apartment','villa','commercial','office','plot','pg'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category || ''} onChange={e => set('category', e.target.value)}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Listing Type *</label>
                  <select className="form-select" value={form.listingType} onChange={e => set('listingType', e.target.value)}>
                    <option value="rent">For Rent</option>
                    <option value="sale">For Sale</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input className="form-input" type="number" required value={form.price} onChange={e => set('price', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price Unit</label>
                  <select className="form-select" value={form.priceUnit} onChange={e => set('priceUnit', e.target.value)}>
                    <option value="month">Per Month</option>
                    <option value="year">Per Year</option>
                    <option value="total">Total</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                    {['available','rented','sold','maintenance'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Location & Address</h3>
              <div className="form-group">
                <label className="form-label">Address Line 1</label>
                <input className="form-input" value={form.address.line1} onChange={e => setNested('address', 'line1', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Address Line 2</label>
                <input className="form-input" value={form.address.line2} onChange={e => setNested('address', 'line2', e.target.value)} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="form-input" required value={form.address.city} onChange={e => setNested('address', 'city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.address.state} onChange={e => setNested('address', 'state', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" value={form.address.country} onChange={e => setNested('address', 'country', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ZIP Code</label>
                  <input className="form-input" value={form.address.zipCode} onChange={e => setNested('address', 'zipCode', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Landmark</label>
                  <input className="form-input" value={form.address.landmark} onChange={e => setNested('address', 'landmark', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Property Features</h3>
              <div className="form-grid-3">
                {[
                  ['Bedrooms', 'bedrooms'], ['Bathrooms', 'bathrooms'], ['Washrooms', 'washrooms'],
                  ['Balconies', 'balconies'], ['Car Parkings', 'carParkings'], ['Servant Rooms', 'servantRooms'],
                  ['Land Area (sqft)', 'landArea'], ['Carpet Area (sqft)', 'carpetArea'], ['Builtup Area (sqft)', 'builtupArea'],
                  ['Year of Construction', 'yearOfConstruction'],
                ].map(([label, key]) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input className="form-input" type="number" value={form.features[key]} onChange={e => setNested('features', key, e.target.value)} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Facing</label>
                  <select className="form-select" value={form.features.facing} onChange={e => setNested('features', 'facing', e.target.value)}>
                    <option value="">Select</option>
                    {['East','West','North','South','North-East','North-West','South-East','South-West'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Furnished</label>
                  <select className="form-select" value={form.features.furnished} onChange={e => setNested('features', 'furnished', e.target.value)}>
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi-furnished">Semi-Furnished</option>
                    <option value="furnished">Fully Furnished</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Amenities</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {AMENITIES.map(a => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid', borderColor: form.amenities.includes(a) ? 'var(--primary)' : 'var(--gray-200)', background: form.amenities.includes(a) ? 'var(--primary-light)' : 'white', color: form.amenities.includes(a) ? 'var(--primary)' : 'var(--gray-600)', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s' }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Property Images</h3>
              <div className="upload-zone" onClick={() => fileRef.current.click()}>
                <FiUpload size={24} style={{ color: 'var(--gray-400)', margin: '0 auto 8px' }} />
                <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Click to upload images</p>
                <p style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>PNG, JPG up to 10MB each</p>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageChange} />
              </div>
              {(existingImages.length > 0 || images.length > 0) && (
                <div className="image-preview-grid">
                  {existingImages.map((img, i) => (
                    <div key={`ex-${i}`} className="image-preview">
                      <img src={img.url} alt="" />
                      <button className="image-preview-remove" type="button" onClick={() => removeExistingImage(i)}><FiX /></button>
                    </div>
                  ))}
                  {images.map((img, i) => (
                    <div key={`new-${i}`} className="image-preview">
                      <img src={img.url} alt="" />
                      <button className="image-preview-remove" type="button" onClick={() => removeNewImage(i)}><FiX /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Completeness checklist */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Listing Completeness</h3>
              {buildChecklist(form, existingImages.length + images.length).map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: '0.82rem', color: item.done ? 'var(--gray-700)' : 'var(--gray-400)' }}>
                  {item.done ? <FiCheckCircle size={14} color="#10b981" /> : <FiCircle size={14} color="var(--gray-300)" />}
                  {item.label}
                </div>
              ))}
            </div>

            {/* Publish */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Publish</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Featured Property</span>
                <label className="toggle">
                  <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={saving}>
                {saving ? 'Saving...' : (isEdit ? 'Update Property' : 'Publish Property')}
              </button>
              <button type="button" onClick={() => navigate('/properties')} className="btn btn-ghost btn-full" style={{ marginTop: 8 }}>Cancel</button>
            </div>

            {/* Owner Info */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Owner / Agent Info</h3>
              {[['Name', 'name', 'text'], ['Phone', 'phone', 'tel'], ['Email', 'email', 'email']].map(([label, key, type]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" type={type} value={form.ownerInfo[key] || ''} onChange={e => setNested('ownerInfo', key, e.target.value)} />
                </div>
              ))}
            </div>

            {/* Financial */}
            <div className="card card-body">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Financial Details</h3>
              {[['Property Value (₹)', 'propertyValue'], ['Expected Rent (₹)', 'expectedRent'], ['Municipality #', 'municipalityNumber'], ['Electricity Bill #', 'electricityBillNumber'], ['Water Bill #', 'waterBillNumber']].map(([label, key]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={form[key] || ''} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PropertyForm;
