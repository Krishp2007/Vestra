import { NavLink, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';
import { LayoutDashboard, TrendingUp, Landmark, BarChart3, Upload, Bell, Lightbulb, Users, Settings, LogOut, X, Zap } from 'lucide-react';

import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'SIP', path: '/sips', icon: TrendingUp },
  { label: 'Fixed Deposits', path: '/fds', icon: Landmark },
  { label: 'Stocks', path: '/stocks', icon: BarChart3 },
  { label: 'Quick Add', path: '/add', icon: Zap },
];

const secondaryItems = [
  { label: 'Alerts', path: '/alerts', icon: Bell, hasBadge: true },
  { label: 'Insights', path: '/insights', icon: Lightbulb },
  { label: 'Family Members', path: '/members', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout, sidebarOpen, setSidebarOpen, unreadAlerts } = useStore();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    toast.loading('Logging out...', { duration: 800 });
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 800);
  };

  return (
    <>
      {showLogoutConfirm && (
        <div className="modal-overlay" style={{zIndex: 9999}}>
          <div className="modal" style={{maxWidth: 400, textAlign: 'center'}}>
            <div style={{fontSize: 48, marginBottom: 16}}>👋</div>
            <h3 style={{fontSize: 20, marginBottom: 8}}>Ready to leave?</h3>
            <p style={{color: 'var(--text-muted)', marginBottom: 24}}>Are you sure you want to log out of your account?</p>
            <div style={{display: 'flex', gap: 12}}>
              <button className="btn btn-secondary" style={{flex: 1}} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" style={{flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)'}} onClick={handleLogout}>Yes, Log out</button>
            </div>
          </div>
        </div>
      )}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:99}} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} 
            onClick={() => { navigate('/'); setSidebarOpen(false); }}
          >
            <div className="sidebar-logo">AV</div>
            <div>
              <div className="sidebar-title">Assets View</div>
              <div className="sidebar-subtitle">Family Finance</div>
            </div>
          </div>
          <button className="menu-toggle btn-icon btn-ghost" onClick={() => setSidebarOpen(false)} style={{marginLeft:'auto'}}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Investments</div>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <div className="nav-section-title">Tools</div>
          {secondaryItems.map(item => (
            <NavLink key={item.path} to={item.path} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.hasBadge && unreadAlerts > 0 && <span className="nav-badge">{unreadAlerts}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => setShowLogoutConfirm(true)} title="Click to logout">
            <div className="sidebar-user-avatar">{user?.avatar || '👤'}</div>
            <div>
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-email">{user?.email || ''}</div>
            </div>
            <LogOut size={16} style={{marginLeft:'auto', color:'var(--text-muted)'}} />
          </div>
        </div>
      </aside>
    </>
  );
}
