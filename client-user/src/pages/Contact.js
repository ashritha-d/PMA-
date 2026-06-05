import React, { useState } from 'react';
import { FiPhone, FiMail, FiMapPin, FiClock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast from 'react-hot-toast';

const Contact = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user ? `${user.firstName} ${user.lastName}` : '', email: user?.email || '', phone: user?.phone || '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await API.post('/inquiries', { ...form, type: 'general' });
      toast.success('Message sent! We\'ll get back to you soon.');
      setForm({ ...form, subject: '', message: '' });
    } catch { toast.error('Failed to send message'); } finally { setSending(false); }
  };

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: 'calc(100vh - 70px)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <div className="section-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>Get In Touch</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', marginTop: 16, marginBottom: 16 }}>Contact Us</h1>
          <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>Have a question? We'd love to hear from you.</p>
        </div>
      </div>

      <div className="container" style={{ marginTop: -40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32, alignItems: 'start' }}>
          {/* Info Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: <FiPhone size={24} />, title: 'Phone', lines: ['+91 99999 99999', '+91 88888 88888'] },
              { icon: <FiMail size={24} />, title: 'Email', lines: ['info@propmanage.com', 'support@propmanage.com'] },
              { icon: <FiMapPin size={24} />, title: 'Address', lines: ['123 Property Lane,', 'Hyderabad, TS 500032'] },
              { icon: <FiClock size={24} />, title: 'Office Hours', lines: ['Mon-Sat: 9AM - 7PM', 'Sunday: 10AM - 4PM'] },
            ].map((item, i) => (
              <div key={i} className="card card-body" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ background: '#dbeafe', borderRadius: 12, padding: 12, color: 'var(--primary)', flexShrink: 0 }}>{item.icon}</div>
                <div><h4 style={{ fontWeight: 700, marginBottom: 4 }}>{item.title}</h4>{item.lines.map((l, j) => <p key={j} style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{l}</p>)}</div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="card card-body">
            <h3 style={{ fontWeight: 700, marginBottom: 24, fontSize: '1.25rem' }}>Send us a Message</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="How can we help?" />
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us more about your inquiry..." />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={sending}>{sending ? 'Sending...' : 'Send Message'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
