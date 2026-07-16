import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import API from '../api/axios';
import toast from 'react-hot-toast';

const Categories = () => {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '', isActive: true, order: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/categories').then(r => setCats(r.data.categories || [])).finally(() => setLoading(false));
  }, []);

  const openForm = (cat = null) => {
    if (cat) { setEditing(cat); setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || '', isActive: cat.isActive, order: cat.order || 0 }); }
    else { setEditing(null); setForm({ name: '', description: '', icon: '', isActive: true, order: 0 }); }
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { data } = await API.put(`/categories/${editing._id}`, form);
        setCats(prev => prev.map(c => c._id === editing._id ? data.category : c));
        toast.success('Category updated!');
      } else {
        const { data } = await API.post('/categories', form);
        setCats(prev => [...prev, data.category]);
        toast.success('Category created!');
      }
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await API.delete(`/categories/${id}`);
      setCats(prev => prev.filter(c => c._id !== id));
      toast.success('Category deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Categories</h1><p className="page-subtitle">Manage property categories</p></div>
        <button className="btn btn-primary" onClick={() => openForm()}><FiPlus /> Add Category</button>
      </div>

      <div className="card">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Icon</th><th>Description</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td style={{ fontSize: '1.5rem' }}>{c.icon}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '-'}</td>
                    <td>{c.order}</td>
                    <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="td-actions">
                        <button onClick={() => openForm(c)} className="btn btn-icon btn-outline"><FiEdit2 /></button>
                        <button onClick={() => handleDelete(c._id)} className="btn btn-icon btn-danger"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cats.length === 0 && <tr><td colSpan={6}><div className="empty-state"><div className="icon">🏷️</div><h4>No categories yet</h4></div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="category-modal-title" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" id="category-modal-title">{editing ? 'Edit Category' : 'Add Category'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Category Name *</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Icon (Emoji)</label>
                  <input className="form-input" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="🏢" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input className="form-input" type="number" value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Active</span>
                  <label className="toggle">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving ? 'Saving...' : 'Save Category'}</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
