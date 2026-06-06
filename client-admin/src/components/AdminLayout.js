import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FiGrid, FiHome, FiUsers, FiCalendar, FiDollarSign, FiMessageSquare, FiStar, FiFileText, FiBarChart2, FiLogOut, FiBell, FiMenu, FiTag, FiUserCheck, FiKey, FiClipboard, FiTool } from 'react-icons/fi';
import { useAdminAuth } from '../context/AdminAuthContext';
import API from '../api/axios';
import { io } from 'socket.io-client';

const NAV_ITEMS = [
  { section: 'Overview' },
  { path: '/', icon: <FiGrid />, label: 'Dashboard' },
  { section: 'Properties' },
  { path: '/properties', icon: <FiHome />, label: 'Properties' },
  { path: '/categories', icon: <FiTag />, label: 'Categories' },
  { section: 'Operations' },
  { path: '/bookings', icon: <FiCalendar />, label: 'Bookings', notifKey: 'bookings' },
  { path: '/payments', icon: <FiDollarSign />, label: 'Payments' },
  { section: 'Users & Communication' },
  { path: '/users', icon: <FiUsers />, label: 'Users' },
  { path: '/inquiries', icon: <FiMessageSquare />, label: 'Inquiries', notifKey: 'inquiries' },
  { path: '/reviews', icon: <FiStar />, label: 'Reviews' },
  { section: 'PMA' },
  { path: '/owners', icon: <FiUserCheck />, label: 'Owners' },
  { path: '/tenants', icon: <FiKey />, label: 'Tenants' },
  { path: '/contracts', icon: <FiClipboard />, label: 'Contracts' },
  { path: '/fintrans', icon: <FiDollarSign />, label: 'Transactions' },
  { path: '/servtrans', icon: <FiTool />, label: 'Service Requests' },
  { section: 'Management' },
  { path: '/cms', icon: <FiFileText />, label: 'CMS / Content' },
  { path: '/reports', icon: <FiBarChart2 />, label: 'Reports' },
];

const AdminLayout = ({ children }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.on('admin_notification', (data) => {
      setUnread(n => n + 1);
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    API.get('/notifications/admin').then(r => {
      setNotifications(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    }).catch(() => {});
  }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const markAllRead = async () => {
    await API.put('/notifications/read-all/admin').catch(() => {});
    setUnread(0);
    setShowNotifs(false);
  };

  const PAGE_TITLES = { '/': 'Dashboard', '/properties': 'Properties', '/categories': 'Categories', '/bookings': 'Bookings', '/payments': 'Payments', '/users': 'Users', '/inquiries': 'Inquiries', '/reviews': 'Reviews', '/cms': 'CMS / Content', '/reports': 'Reports & Analytics', '/owners': 'Owners', '/owners/new': 'Add Owner', '/tenants': 'Tenants', '/tenants/new': 'Add Tenant', '/contracts': 'Contracts', '/contracts/new': 'New Contract', '/fintrans': 'Financial Transactions', '/fintrans/new': 'Add Transaction', '/servtrans': 'Service Requests', '/servtrans/new': 'New Service Request' };
  const title = PAGE_TITLES[location.pathname] || 'Admin Panel';

  return (
    <div className="admin-layout">
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">Prop<span>Manage</span><span className="sidebar-badge">Admin</span></div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => (
            item.section ? <div key={i} className="sidebar-section">{item.section}</div> : (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{admin?.name?.[0]}</div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin?.name}</div>
              <div className="sidebar-user-role">{admin?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', background: 'none', border: 'none', color: '#ef4444', marginTop: 8, cursor: 'pointer' }}>
            <span className="icon"><FiLogOut /></span> Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="topbar-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }}><FiMenu /></button>
            <div>
              <div className="topbar-title">{title}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div style={{ position: 'relative' }}>
              <button className="topbar-btn" onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) markAllRead(); }}>
                <FiBell />
                {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, background: 'white', borderRadius: 12, boxShadow: 'var(--shadow-lg)', width: 320, maxHeight: 400, overflow: 'hidden', zIndex: 200 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '0.9rem' }}>Notifications</strong>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 320 }}>
                    {notifications.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No notifications</div> :
                      notifications.slice(0, 10).map(n => (
                        <div key={n._id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', background: n.isRead ? 'white' : '#f0f7ff' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{n.message}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{admin?.name?.[0]}</div>
              <div style={{ display: 'none' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{admin?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'capitalize' }}>{admin?.role}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;
