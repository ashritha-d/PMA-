import React from 'react';
import { Link } from 'react-router-dom';
import { FiPhone, FiMail, FiMapPin, FiFacebook, FiTwitter, FiInstagram, FiLinkedin } from 'react-icons/fi';

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div>
          <div className="footer-logo">Prop<span>Manage</span></div>
          <p className="footer-desc">Your trusted partner for premium property management. Finding the perfect home has never been easier.</p>
          <div className="footer-social" style={{ marginTop: 24 }}>
            <a href="https://facebook.com" target="_blank" rel="noreferrer"><FiFacebook /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer"><FiTwitter /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer"><FiInstagram /></a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer"><FiLinkedin /></a>
          </div>
        </div>
        <div>
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/properties">Properties</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="footer-heading">Property Types</h4>
          <ul className="footer-links">
            <li><Link to="/properties?type=apartment">Apartments</Link></li>
            <li><Link to="/properties?type=villa">Villas</Link></li>
            <li><Link to="/properties?type=commercial">Commercial</Link></li>
            <li><Link to="/properties?type=plot">Plots</Link></li>
            <li><Link to="/properties?type=pg">PG/Hostels</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="footer-heading">Contact Info</h4>
          <ul className="footer-links">
            <li><a href="tel:+919999999999" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiPhone /> +91 99999 99999</a></li>
            <li><a href="mailto:info@propmanage.com" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiMail /> info@propmanage.com</a></li>
            <li><span style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><FiMapPin style={{ marginTop: 3, flexShrink: 0 }} /> 123 Property Lane, Hyderabad, TS 500032</span></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>© {new Date().getFullYear()} PropManage. All rights reserved.</p>
        <div style={{ display: 'flex', gap: 24, fontSize: '0.85rem', opacity: 0.6 }}>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
