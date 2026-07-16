import React, { useState, useRef } from 'react';
import { FiX, FiUpload, FiTrash2, FiImage, FiFileText, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || '';

const PROPERTY_TYPES = ['Apartment', 'Villa', 'House', 'Commercial', 'Land', 'Office', 'Shop', 'Other'];
const FURNISHING_OPTIONS = ['Furnished', 'Semi-Furnished', 'Unfurnished'];
const STATUS_OPTIONS = ['Available', 'Occupied', 'Under Maintenance'];
const LISTING_TYPES = [{ value: 'rent', label: 'For Rent' }, { value: 'sale', label: 'For Sale' }];

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 24, border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'var(--gray-50)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'inherit' }}
      >
        {title}
        {open ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
      </button>
      {open && <div style={{ padding: '20px' }}>{children}</div>}
    </div>
  );
};

const Grid2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>{children}</div>
);

const FormField = ({ label, required, children }) => (
  <div className="form-group" style={{ marginBottom: 0 }}>
    <label className="form-label">{label}{required && <span style={{ color: '#ef4444' }}>*</span>}</label>
    {children}
  </div>
);

const PropertyForm = ({ property, onSuccess, onClose }) => {
  const isEdit = !!property;

  const [form, setForm] = useState({
    propertyName: property?.propertyName || '',
    propertyType: property?.propertyType || 'Apartment',
    listingType: property?.listingType || 'rent',
    description: property?.description || '',
    status: property?.status || 'Available',
    country: property?.country || 'India',
    state: property?.state || '',
    city: property?.city || '',
    address: property?.address || '',
    pincode: property?.pincode || '',
    googleMapsLocation: property?.googleMapsLocation || '',
    totalArea: property?.totalArea || '',
    bedrooms: property?.bedrooms ?? 0,
    bathrooms: property?.bathrooms ?? 0,
    floors: property?.floors ?? 1,
    furnishing: property?.furnishing || 'Unfurnished',
    parking: property?.parking || false,
    rentAmount: property?.rentAmount || '',
    securityDeposit: property?.securityDeposit || '',
    maintenanceCharges: property?.maintenanceCharges || '',
    salePrice: property?.salePrice || '',
  });

  const [existingImages, setExistingImages] = useState(property?.images || []);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [coverImage, setCoverImage] = useState(property?.coverImage || '');

  const [existingDocs, setExistingDocs] = useState(property?.documents || []);
  const [newDocFiles, setNewDocFiles] = useState([]);
  const [newDocNames, setNewDocNames] = useState([]);
  const [newDocTypes, setNewDocTypes] = useState([]);

  const [saving, setSaving] = useState(false);
  const [deletingImgIdx, setDeletingImgIdx] = useState(null);
  const [deletingDocIdx, setDeletingDocIdx] = useState(null);

  const imgInputRef = useRef();
  const docInputRef = useRef();

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleImagesSelect = (e) => {
    const files = Array.from(e.target.files);
    const previews = files.map(f => URL.createObjectURL(f));
    setNewImageFiles(prev => [...prev, ...files]);
    setNewImagePreviews(prev => [...prev, ...previews]);
    e.target.value = '';
  };

  const removeNewImage = (idx) => {
    URL.revokeObjectURL(newImagePreviews[idx]);
    setNewImageFiles(prev => prev.filter((_, i) => i !== idx));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = async (idx) => {
    if (!property?._id) {
      setExistingImages(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setDeletingImgIdx(idx);
    try {
      const r = await API.delete(`/user-properties/${property._id}/image/${idx}`);
      setExistingImages(r.data.property.images || []);
      setCoverImage(r.data.property.coverImage || '');
      toast.success('Image removed');
    } catch { toast.error('Failed to remove image'); }
    finally { setDeletingImgIdx(null); }
  };

  const handleDocsSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewDocFiles(prev => [...prev, ...files]);
    setNewDocNames(prev => [...prev, ...files.map(f => f.name.replace(/\.[^/.]+$/, ''))]);
    setNewDocTypes(prev => [...prev, ...files.map(() => 'other')]);
    e.target.value = '';
  };

  const removeNewDoc = (idx) => {
    setNewDocFiles(prev => prev.filter((_, i) => i !== idx));
    setNewDocNames(prev => prev.filter((_, i) => i !== idx));
    setNewDocTypes(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingDoc = async (idx) => {
    if (!property?._id) {
      setExistingDocs(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setDeletingDocIdx(idx);
    try {
      const r = await API.delete(`/user-properties/${property._id}/document/${idx}`);
      setExistingDocs(r.data.property.documents || []);
      toast.success('Document removed');
    } catch { toast.error('Failed to remove document'); }
    finally { setDeletingDocIdx(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.propertyName.trim()) { toast.error('Property name is required'); return; }

    setSaving(true);
    try {
      const fd = new FormData();

      // Append all text fields
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });

      if (coverImage) fd.append('coverImage', coverImage);

      // Append new images
      newImageFiles.forEach(f => fd.append('images', f));

      // Append new documents
      newDocFiles.forEach(f => fd.append('documents', f));
      newDocNames.forEach(n => fd.append('documentNames', n));
      newDocTypes.forEach(t => fd.append('documentTypes', t));

      if (isEdit) {
        await API.put(`/user-properties/${property._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Property updated!');
      } else {
        await API.post('/user-properties', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Property added!');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const imgUrl = (url) => url?.startsWith('http') ? url : `${API_BASE}${url}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="property-form-title" style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 780, marginTop: 20, marginBottom: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 id="property-form-title" style={{ fontWeight: 800, fontSize: '1.3rem' }}>{isEdit ? 'Edit Property' : 'Add New Property'}</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: 2 }}>Fill in the details to {isEdit ? 'update' : 'list'} your property</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'var(--gray-100)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-600)' }}>
            <FiX size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '28px' }}>

          {/* Basic Details */}
          <Section title="Basic Details">
            <div style={{ marginBottom: 16 }}>
              <FormField label="Property Name" required>
                <input className="form-input" value={form.propertyName} onChange={e => set('propertyName', e.target.value)} placeholder="e.g. Sunrise Apartment 2BHK" required />
              </FormField>
            </div>
            <Grid2>
              <FormField label="Property Type" required>
                <select className="form-input" value={form.propertyType} onChange={e => set('propertyType', e.target.value)}>
                  {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
              <FormField label="Listing Type" required>
                <select className="form-input" value={form.listingType} onChange={e => set('listingType', e.target.value)}>
                  {LISTING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </FormField>
            </Grid2>
            <div style={{ marginTop: 16 }}>
              <FormField label="Description">
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe your property..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </FormField>
            </div>
            <div style={{ marginTop: 16 }}>
              <FormField label="Status">
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
            </div>
          </Section>

          {/* Location */}
          <Section title="Location">
            <Grid2>
              <FormField label="Country">
                <input className="form-input" value={form.country} onChange={e => set('country', e.target.value)} placeholder="India" />
              </FormField>
              <FormField label="State">
                <input className="form-input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Maharashtra" />
              </FormField>
              <FormField label="City">
                <input className="form-input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Mumbai" />
              </FormField>
              <FormField label="Pincode">
                <input className="form-input" value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="400001" maxLength={10} />
              </FormField>
            </Grid2>
            <div style={{ marginTop: 16 }}>
              <FormField label="Full Address">
                <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, Area, Landmark" />
              </FormField>
            </div>
            <div style={{ marginTop: 16 }}>
              <FormField label="Google Maps Link (optional)">
                <input className="form-input" value={form.googleMapsLocation} onChange={e => set('googleMapsLocation', e.target.value)} placeholder="https://maps.google.com/..." />
              </FormField>
            </div>
          </Section>

          {/* Property Information */}
          <Section title="Property Information">
            <Grid2>
              <FormField label="Total Area (sq.ft)">
                <input className="form-input" type="number" min="0" value={form.totalArea} onChange={e => set('totalArea', e.target.value)} placeholder="1200" />
              </FormField>
              <FormField label="Number of Floors">
                <input className="form-input" type="number" min="0" value={form.floors} onChange={e => set('floors', e.target.value)} />
              </FormField>
              <FormField label="Bedrooms">
                <input className="form-input" type="number" min="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
              </FormField>
              <FormField label="Bathrooms">
                <input className="form-input" type="number" min="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
              </FormField>
            </Grid2>
            <div style={{ marginTop: 16 }}>
              <Grid2>
                <FormField label="Furnishing">
                  <select className="form-input" value={form.furnishing} onChange={e => set('furnishing', e.target.value)}>
                    {FURNISHING_OPTIONS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </FormField>
                <FormField label="Parking Available">
                  <select className="form-input" value={form.parking ? 'Yes' : 'No'} onChange={e => set('parking', e.target.value === 'Yes')}>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </FormField>
              </Grid2>
            </div>
          </Section>

          {/* Financial Information */}
          <Section title="Financial Information" defaultOpen={true}>
            <Grid2>
              <FormField label="Rent Amount (₹/month)">
                <input className="form-input" type="number" min="0" value={form.rentAmount} onChange={e => set('rentAmount', e.target.value)} placeholder="25000" />
              </FormField>
              <FormField label="Security Deposit (₹)">
                <input className="form-input" type="number" min="0" value={form.securityDeposit} onChange={e => set('securityDeposit', e.target.value)} placeholder="50000" />
              </FormField>
              <FormField label="Maintenance Charges (₹/month)">
                <input className="form-input" type="number" min="0" value={form.maintenanceCharges} onChange={e => set('maintenanceCharges', e.target.value)} placeholder="2000" />
              </FormField>
              <FormField label="Sale Price (₹) — optional">
                <input className="form-input" type="number" min="0" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} placeholder="5000000" />
              </FormField>
            </Grid2>
          </Section>

          {/* Media */}
          <Section title="Property Images">
            {/* Existing images */}
            {existingImages.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 10 }}>Existing images (click to set as cover)</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {existingImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 100, height: 80 }}>
                      <img
                        src={imgUrl(img.url)}
                        alt=""
                        onClick={() => setCoverImage(img.url)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: coverImage === img.url ? '3px solid var(--primary)' : '2px solid var(--gray-200)' }}
                      />
                      {coverImage === img.url && <span style={{ position: 'absolute', top: 4, left: 4, background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>Cover</span>}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        disabled={deletingImgIdx === idx}
                        style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New image previews */}
            {newImagePreviews.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 10 }}>New images to upload</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {newImagePreviews.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 100, height: 80 }}>
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '2px solid var(--gray-200)' }} />
                      <button
                        type="button"
                        onClick={() => removeNewImage(idx)}
                        style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', border: '2px dashed var(--gray-300)', borderRadius: 10, background: 'var(--gray-50)', cursor: 'pointer', color: 'var(--gray-500)', width: '100%', justifyContent: 'center', fontFamily: 'inherit' }}
            >
              <FiImage size={20} /> Click to upload property photos (max 10)
            </button>
            <input ref={imgInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImagesSelect} />
          </Section>

          {/* Documents */}
          <Section title="Documents" defaultOpen={false}>
            {existingDocs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 10 }}>Existing documents</p>
                {existingDocs.map((doc, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, marginBottom: 8 }}>
                    <FiFileText size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.9rem' }}>{doc.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', background: 'var(--gray-200)', padding: '2px 8px', borderRadius: 10 }}>{doc.docType}</span>
                    <button
                      type="button"
                      onClick={() => removeExistingDoc(idx)}
                      disabled={deletingDocIdx === idx}
                      style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {newDocFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 10 }}>New documents to upload</p>
                {newDocFiles.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, marginBottom: 8 }}>
                    <FiFileText size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    <input
                      className="form-input"
                      value={newDocNames[idx] || ''}
                      onChange={e => setNewDocNames(prev => { const a = [...prev]; a[idx] = e.target.value; return a; })}
                      placeholder="Document name"
                      style={{ flex: 1, fontSize: '0.85rem', padding: '6px 10px' }}
                    />
                    <select
                      className="form-input"
                      value={newDocTypes[idx] || 'other'}
                      onChange={e => setNewDocTypes(prev => { const a = [...prev]; a[idx] = e.target.value; return a; })}
                      style={{ width: 150, fontSize: '0.85rem', padding: '6px 10px' }}
                    >
                      <option value="ownership">Ownership</option>
                      <option value="agreement">Agreement</option>
                      <option value="noc">NOC</option>
                      <option value="other">Other</option>
                    </select>
                    <button type="button" onClick={() => removeNewDoc(idx)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', border: '2px dashed var(--gray-300)', borderRadius: 10, background: 'var(--gray-50)', cursor: 'pointer', color: 'var(--gray-500)', width: '100%', justifyContent: 'center', fontFamily: 'inherit' }}
            >
              <FiUpload size={20} /> Upload documents (PDF, images — max 5)
            </button>
            <input ref={docInputRef} type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={handleDocsSelect} />
          </Section>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 140 }}>
              {saving ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update Property' : 'Add Property')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PropertyForm;
