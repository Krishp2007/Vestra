import { NavLink, useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';
import { LayoutDashboard, TrendingUp, Landmark, BarChart3, Upload, Bell, Lightbulb, Users, Settings, LogOut, X, Zap, User, ChevronUp, Gem } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
];

const renderAvatar = (avatarStr, size = 32) => {
  if (avatarStr?.startsWith('http') || avatarStr?.startsWith('data:')) {
    return <img src={avatarStr} alt="Avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return <span style={{ fontSize: size * 0.6, lineHeight: 1 }}>{avatarStr || '👤'}</span>;
};

export default function Sidebar() {
  const { user, logout, sidebarOpen, setSidebarOpen, unreadAlerts } = useStore();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    setShowProfileMenu(false);
    toast.loading('Logging out...', { duration: 800 });
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 800);
  };

  const handleMenuAction = (action) => {
    setShowProfileMenu(false);
    setSidebarOpen(false);
    if (action === 'profile') navigate('/settings');
    if (action === 'logout') setShowLogoutConfirm(true);
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
            <div className="sidebar-logo">
              <Gem size={20} color="white" fill="white" style={{ opacity: 0.95 }} />
            </div>
            <div>
              <div className="sidebar-title">Vestra</div>
              <div className="sidebar-subtitle">Family Office</div>
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

        <div className="sidebar-footer" ref={menuRef} style={{ position: 'relative' }}>
          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 8,
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)', boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
              overflow: 'hidden', zIndex: 200, animation: 'slideUp 0.2s ease'
            }}>
              {/* Profile Header */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    width: 44, height: 44, borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--border-color)'
                  }}>
                    {renderAvatar(user?.avatar, 44)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'User'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email || ''}</div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '6px' }}>
                <button
                  onClick={() => handleMenuAction('profile')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 12px', border: 'none', borderRadius: 'var(--radius-md)',
                    background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: 'var(--text-secondary)', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <User size={16} /> My Profile & Settings
                </button>
                <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 8px' }} />
                <button
                  onClick={() => handleMenuAction('logout')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 12px', border: 'none', borderRadius: 'var(--radius-md)',
                    background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: 'var(--danger)', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}

          {/* User Profile Button */}
          <div 
            className="sidebar-user" 
            onClick={() => setShowProfileMenu(!showProfileMenu)} 
            title="Account menu"
            style={{ cursor: 'pointer' }}
          >
            <div className="sidebar-user-avatar">{renderAvatar(user?.avatar, 36)}</div>
            <div>
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-email">{user?.email || ''}</div>
            </div>
            <ChevronUp 
              size={16} 
              style={{ 
                marginLeft: 'auto', color: 'var(--text-muted)', 
                transition: 'transform 0.2s',
                transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)'
              }} 
            />
          </div>
        </div>
      </aside>
    </>
  );
}
