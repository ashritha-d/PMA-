import React, { useState } from 'react';
import { FiUser, FiCamera } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    setUploading(true);
    try {
      const { data } = await API.put('/users/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo updated!');
      window.location.reload();
    } catch { toast.error('Failed to upload photo'); } finally { setUploading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateProfile(form);
    setSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      await API.put('/auth/change-password', { oldPassword: passwords.oldPassword, newPassword: passwords.newPassword });
      toast.success('Password changed!');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', padding: '40px 0' }}>
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 32 }}>My Profile</h1>

        {/* Photo */}
        <div className="card card-body" style={{ marginBottom: 24, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            {user?.photo ? <img src={user.photo} alt="" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
              : <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700 }}>{user?.firstName?.[0]}</div>}
            <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', color: 'white', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
              <FiCamera />
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <h3 style={{ fontWeight: 700 }}>{user?.firstName} {user?.lastName}</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{user?.email}</p>
            {uploading && <p style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Uploading...</p>}
          </div>
        </div>

        {/* Edit Info */}
        <div className="card card-body" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 24 }}>Personal Information</h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email (cannot change)</label>
              <input className="form-input" value={user?.email} disabled style={{ background: 'var(--gray-50)', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card card-body">
          <h3 style={{ fontWeight: 700, marginBottom: 24 }}>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" required value={passwords.oldPassword} onChange={e => setPasswords({ ...passwords, oldPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" required minLength={6} value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" required value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-outline">Update Password</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
