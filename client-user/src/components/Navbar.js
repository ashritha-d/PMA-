import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiUser, FiLogOut, FiHeart, FiCalendar, FiHome } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setDropdown(false); };

  return (
    <nav className="navbar" style={{ boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.1)' : 'none' }}>
      <div className="container">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">Prop<span>Manage</span></Link>
          <ul className={`navbar-nav ${open ? 'open' : ''}`}>
            <li><NavLink to="/" onClick={() => setOpen(false)}>Home</NavLink></li>
            <li><NavLink to="/properties" onClick={() => setOpen(false)}>Properties</NavLink></li>
            <li><NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink></li>
            <li><NavLink to="/contact" onClick={() => setOpen(false)}>Contact</NavLink></li>
          </ul>
          <div className="navbar-actions">
            {isAuthenticated ? (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link to="/favorites" title="Favorites" style={{ position: 'relative', fontSize: '1.2rem', color: 'var(--gray-600)' }}>
                    <FiHeart />
                  </Link>
                  <button onClick={() => setDropdown(!dropdown)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gray-100)', border: 'none', borderRadius: 50, padding: '8px 16px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', color: 'var(--dark)' }}>
                    {user?.photo ? <img src={user.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <FiUser />}
                    {user?.firstName}
                  </button>
                </div>
                {dropdown && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, background: 'white', borderRadius: 12, boxShadow: 'var(--shadow-lg)', minWidth: 200, overflow: 'hidden', zIndex: 200 }}>
                    <Link to="/dashboard" onClick={() => setDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', fontSize: '0.9rem', borderBottom: '1px solid var(--gray-100)', color: 'var(--dark)' }}><FiHome /> Dashboard</Link>
                    <Link to="/bookings" onClick={() => setDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', fontSize: '0.9rem', borderBottom: '1px solid var(--gray-100)', color: 'var(--dark)' }}><FiCalendar /> My Bookings</Link>
                    <Link to="/profile" onClick={() => setDropdown(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', fontSize: '0.9rem', borderBottom: '1px solid var(--gray-100)', color: 'var(--dark)' }}><FiUser /> Profile</Link>
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', fontSize: '0.9rem', color: '#ef4444', background: 'none', border: 'none', width: '100%', fontFamily: 'inherit' }}><FiLogOut /> Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
              </>
            )}
            <button className="nav-toggle" onClick={() => setOpen(!open)}>{open ? <FiX /> : <FiMenu />}</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
