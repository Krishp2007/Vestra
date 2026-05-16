import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { Menu, Bell } from 'lucide-react';

export default function Topbar({ title }) {
  const { toggleSidebar, unreadAlerts } = useStore();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-btn menu-toggle" onClick={toggleSidebar}><Menu size={18} /></button>
        <h1 className="topbar-title">{title || 'Dashboard'}</h1>
      </div>
      <div className="topbar-right">
        <button className="topbar-btn" onClick={() => navigate('/alerts')} title="Alerts">
          <Bell size={18} />
          {unreadAlerts > 0 && <span className="badge-dot" />}
        </button>
      </div>
    </header>
  );
}
