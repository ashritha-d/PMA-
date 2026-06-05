import React, { useState, useEffect } from 'react';
import { FiSave, FiPlus, FiEdit2 } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const CMS_TEMPLATES = [
  { key: 'hero_main', section: 'hero', title: 'Hero Section', fields: ['title', 'subtitle', 'content'] },
  { key: 'about_page', section: 'about', title: 'About Page', fields: ['title', 'subtitle', 'content'] },
  { key: 'contact_info', section: 'contact', title: 'Contact Info', fields: ['title', 'content'] },
  { key: 'footer_info', section: 'footer', title: 'Footer Info', fields: ['title', 'content'] },
  { key: 'social_links', section: 'social', title: 'Social Media Links', fields: ['data'] },
];

const CMS = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ key: '', section: 'general', title: '', subtitle: '', content: '', data: '' });
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    API.get('/cms').then(r => setContent(r.data.content || [])).finally(() => setLoading(false));
  }, []);

  const openEdit = (item) => {
    setSelected(item);
    setForm({ key: item.key, section: item.section, title: item.title || '', subtitle: item.subtitle || '', content: item.content || '', data: item.data ? JSON.stringify(item.data, null, 2) : '' });
    setShowNew(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let data = form;
      if (form.data) {
        try { data = { ...form, data: JSON.parse(form.data) }; } catch { toast.error('Invalid JSON in data field'); setSaving(false); return; }
      }
      const res = await API.post('/cms', data);
      const updated = res.data.content;
      setContent(prev => {
        const idx = prev.findIndex(c => c._id === updated._id);
        if (idx > -1) { const n = [...prev]; n[idx] = updated; return n; }
        return [...prev, updated];
      });
      toast.success('Content saved!');
      setSelected(null);
      setShowNew(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); } finally { setSaving(false); }
  };

  const SECTION_COLORS = { hero: '#dbeafe', about: '#d1fae5', contact: '#fef3c7', footer: '#f3f4f6', social: '#fce7f3', general: '#ede9fe' };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">CMS / Content Management</h1><p className="page-subtitle">Manage website content dynamically</p></div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setSelected(null); setForm({ key: '', section: 'general', title: '', subtitle: '', content: '', data: '' }); }}><FiPlus /> Add Content</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20, alignItems: 'start' }}>
        {/* Content List */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Quick Templates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CMS_TEMPLATES.map(t => {
                const exists = content.find(c => c.key === t.key);
                return (
                  <div key={t.key} style={{ background: SECTION_COLORS[t.section] || 'white', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>key: {t.key}</div>
                    </div>
                    <button onClick={() => {
                      if (exists) openEdit(exists);
                      else { setShowNew(true); setSelected(null); setForm({ key: t.key, section: t.section, title: '', subtitle: '', content: '', data: '' }); }
                    }} className={`btn btn-sm ${exists ? 'btn-outline' : 'btn-primary'}`}>
                      {exists ? <><FiEdit2 /> Edit</> : <><FiPlus /> Create</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>All Content</h3></div>
            {loading ? <div className="loading-center"><div className="spinner" /></div> : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {content.map(c => (
                  <div key={c._id} onClick={() => openEdit(c)} style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.title || c.key}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{c.section} • {c.key}</div>
                    </div>
                    <span style={{ background: SECTION_COLORS[c.section] || 'var(--gray-100)', padding: '3px 8px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600 }}>{c.section}</span>
                  </div>
                ))}
                {content.length === 0 && <div className="empty-state"><div className="icon">📄</div><h4>No content yet</h4><p>Use templates to get started</p></div>}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        {(selected || showNew) && (
          <div className="card card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>{selected ? 'Edit Content' : 'New Content'}</h3>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Key * (unique identifier)</label>
                <input className="form-input" required value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="e.g. hero_main" />
              </div>
              <div className="form-group">
                <label className="form-label">Section</label>
                <select className="form-select" value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
                  {['hero','about','contact','footer','social','faq','testimonial','banner','general'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Main heading or title" />
              </div>
              <div className="form-group">
                <label className="form-label">Subtitle</label>
                <input className="form-input" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Secondary text" />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea className="form-textarea" rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Main content text..." />
              </div>
              <div className="form-group">
                <label className="form-label">Data (JSON for complex content)</label>
                <textarea className="form-textarea" rows={6} value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} placeholder='{"key": "value", "links": {...}}' style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary btn-full" disabled={saving}><FiSave /> {saving ? 'Saving...' : 'Save Content'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setSelected(null); setShowNew(false); }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {!selected && !showNew && (
          <div className="card card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>📝</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Select or Create Content</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Click on a template or existing content to edit it. Changes reflect instantly on the user website.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CMS;
