import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import { FiSearch, FiArrowRight, FiHome, FiUsers, FiStar, FiTrendingUp } from 'react-icons/fi';
import { FaBuilding, FaWarehouse, FaTree, FaHotel } from 'react-icons/fa';
import PropertyCard from '../components/PropertyCard';
import API from '../api/axios';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1600&q=80',
];

const PROPERTY_TYPES = [
  { type: 'apartment', label: 'Apartments', icon: <FaBuilding />, color: '#dbeafe' },
  { type: 'villa', label: 'Villas', icon: <FiHome />, color: '#d1fae5' },
  { type: 'commercial', label: 'Commercial', icon: <FaWarehouse />, color: '#fef3c7' },
  { type: 'plot', label: 'Plots', icon: <FaTree />, color: '#fce7f3' },
  { type: 'pg', label: 'PG / Hostel', icon: <FaHotel />, color: '#ede9fe' },
];

const STATS = [
  { number: '5,000+', label: 'Properties Listed' },
  { number: '2,500+', label: 'Happy Clients' },
  { number: '15+', label: 'Years Experience' },
  { number: '98%', label: 'Satisfaction Rate' },
];

const sliderSettings = { dots: true, infinite: true, speed: 700, slidesToShow: 1, slidesToScroll: 1, autoplay: true, autoplaySpeed: 5000, fade: true };
const featuredSettings = { dots: false, infinite: true, speed: 500, slidesToShow: 3, slidesToScroll: 1, autoplay: true, autoplaySpeed: 3000, responsive: [{ breakpoint: 1024, settings: { slidesToShow: 2 } }, { breakpoint: 640, settings: { slidesToShow: 1 } }] };

const Home = () => {
  const [search, setSearch] = useState({ query: '', type: '', listingType: '' });
  const [featured, setFeatured] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get('/properties?featured=true&limit=6'),
      API.get('/properties?limit=6'),
    ]).then(([f, r]) => {
      setFeatured(f.data.properties || []);
      setRecent(r.data.properties || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.query) params.set('search', search.query);
    if (search.type) params.set('type', search.type);
    if (search.listingType) params.set('listingType', search.listingType);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <Slider {...sliderSettings}>
            {HERO_IMAGES.map((img, i) => (
              <div key={i}><div style={{ height: '90vh', background: `url(${img}) center/cover no-repeat`, filter: 'brightness(0.4)' }} /></div>
            ))}
          </Slider>
        </div>
        <div className="container">
          <div className="hero-content" style={{ maxWidth: 700 }}>
            <h1 className="hero-title">Find Your <span>Dream</span> Property Today</h1>
            <p className="hero-subtitle">Discover thousands of premium properties for rent and sale. Your perfect home is just a search away.</p>
            <form onSubmit={handleSearch}>
              <div className="search-bar">
                <input className="search-input" placeholder="Search by location, property name..." value={search.query} onChange={e => setSearch({ ...search, query: e.target.value })} />
                <select className="search-select" value={search.type} onChange={e => setSearch({ ...search, type: e.target.value })}>
                  <option value="">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="commercial">Commercial</option>
                  <option value="plot">Plot</option>
                  <option value="pg">PG/Hostel</option>
                </select>
                <select className="search-select" value={search.listingType} onChange={e => setSearch({ ...search, listingType: e.target.value })}>
                  <option value="">Buy/Rent</option>
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                </select>
                <button type="submit" className="search-btn"><FiSearch /> Search</button>
              </div>
            </form>
            <div className="stats-row">
              {STATS.map((s, i) => (
                <div key={i} className="stat-item">
                  <div className="stat-number">{s.number}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Property Types */}
      <section className="section-sm" style={{ background: 'var(--gray-50)' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Browse by Type</div>
            <h2 className="section-title">Explore Property Categories</h2>
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {PROPERTY_TYPES.map(({ type, label, icon, color }) => (
              <button key={type} onClick={() => navigate(`/properties?type=${type}`)} style={{ background: color, border: 'none', borderRadius: 16, padding: '24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 140, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span style={{ fontSize: '2rem', color: 'var(--primary)' }}>{icon}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Hand Picked</div>
            <h2 className="section-title">Featured Properties</h2>
            <p className="section-subtitle">Explore our carefully curated selection of premium properties</p>
          </div>
          {loading ? <div className="spinner" /> : featured.length > 0 ? (
            <Slider {...featuredSettings}>
              {featured.map(p => (
                <div key={p._id} style={{ padding: '0 12px' }}>
                  <PropertyCard property={p} />
                </div>
              ))}
            </Slider>
          ) : (
            <div className="properties-grid">
              {recent.slice(0, 3).map(p => <PropertyCard key={p._id} property={p} />)}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button onClick={() => navigate('/properties')} className="btn btn-primary btn-lg">View All Properties <FiArrowRight /></button>
          </div>
        </div>
      </section>

      {/* Recent Properties */}
      {recent.length > 0 && (
        <section className="section" style={{ background: 'var(--gray-50)' }}>
          <div className="container">
            <div className="section-header">
              <div className="section-tag">Just Listed</div>
              <h2 className="section-title">Recent Properties</h2>
            </div>
            <div className="properties-grid">
              {recent.map(p => <PropertyCard key={p._id} property={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">Why Us</div>
            <h2 className="section-title">Why Choose PropManage?</h2>
          </div>
          <div className="grid-4">
            {[
              { icon: <FiHome size={32} />, title: 'Wide Selection', desc: 'Thousands of verified properties across all categories and price ranges.' },
              { icon: <FiUsers size={32} />, title: 'Expert Team', desc: 'Our experienced agents guide you through every step of the process.' },
              { icon: <FiStar size={32} />, title: 'Trusted Reviews', desc: 'Real reviews from verified tenants and buyers to help you decide.' },
              { icon: <FiTrendingUp size={32} />, title: 'Best Prices', desc: 'Competitive pricing with transparent fees and no hidden charges.' },
            ].map((item, i) => (
              <div key={i} className="card card-body" style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', padding: '80px 0', color: 'white', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', marginBottom: 16 }}>Ready to Find Your Perfect Property?</h2>
          <p style={{ opacity: 0.9, fontSize: '1.1rem', marginBottom: 40 }}>Join thousands of happy clients who found their dream home with us</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/properties')} className="btn btn-secondary btn-lg">Browse Properties</button>
            <button onClick={() => navigate('/contact')} className="btn btn-outline btn-lg" style={{ color: 'white', borderColor: 'white' }}>Contact Us</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
