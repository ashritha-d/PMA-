import React from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiHome, FiAward, FiTrendingUp } from 'react-icons/fi';

const About = () => (
  <div>
    <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', padding: '100px 0', textAlign: 'center' }}>
      <div className="container">
        <div className="section-tag" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>Our Story</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '3rem', marginTop: 16, marginBottom: 20 }}>About PropManage</h1>
        <p style={{ opacity: 0.9, fontSize: '1.15rem', maxWidth: 600, margin: '0 auto' }}>India's most trusted property management platform, connecting property owners and seekers since 2010.</p>
      </div>
    </div>

    <section className="section">
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div className="section-tag">Who We Are</div>
            <h2 className="section-title" style={{ marginTop: 16 }}>Building Trust, One Property at a Time</h2>
            <p style={{ color: 'var(--gray-600)', lineHeight: 1.8, marginBottom: 16 }}>PropManage was founded with a simple vision: to make property management transparent, efficient, and accessible for everyone. We've helped thousands of property owners and tenants find the perfect match.</p>
            <p style={{ color: 'var(--gray-600)', lineHeight: 1.8, marginBottom: 32 }}>Our platform combines cutting-edge technology with personalized service to ensure the best possible experience for all stakeholders in the property ecosystem.</p>
            <Link to="/contact" className="btn btn-primary">Get In Touch</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { icon: <FiHome size={32} />, number: '5,000+', label: 'Properties Listed', color: '#dbeafe' },
              { icon: <FiUsers size={32} />, number: '2,500+', label: 'Happy Clients', color: '#d1fae5' },
              { icon: <FiAward size={32} />, number: '15+', label: 'Years Experience', color: '#fef3c7' },
              { icon: <FiTrendingUp size={32} />, number: '98%', label: 'Satisfaction', color: '#fce7f3' },
            ].map((s, i) => (
              <div key={i} className="card card-body" style={{ textAlign: 'center', background: s.color }}>
                <div style={{ color: 'var(--primary)', marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--dark)' }}>{s.number}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="section" style={{ background: 'var(--gray-50)' }}>
      <div className="container">
        <div className="section-header">
          <div className="section-tag">Our Values</div>
          <h2 className="section-title">What Drives Us</h2>
        </div>
        <div className="grid-3">
          {[
            { emoji: '🏆', title: 'Excellence', desc: 'We strive for excellence in every interaction, ensuring the highest quality service for our clients.' },
            { emoji: '🤝', title: 'Integrity', desc: 'Transparency and honesty are at the core of everything we do. No hidden fees, no surprises.' },
            { emoji: '🚀', title: 'Innovation', desc: 'We continuously improve our platform with the latest technology to make your experience seamless.' },
          ].map((v, i) => (
            <div key={i} className="card card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>{v.emoji}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>{v.title}</h3>
              <p style={{ color: 'var(--gray-500)', lineHeight: 1.7, fontSize: '0.9rem' }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default About;
