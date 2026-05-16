import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { timeAgo } from '../utils/helpers';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import { Check, CheckCheck, Trash2 } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setUnreadAlerts } = useStore();

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const { data } = await api.get('/alerts'); setAlerts(data.data); setUnreadAlerts(data.unreadCount); } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const markRead = async (id) => { try { await api.put(`/alerts/${id}/read`); load(); } catch(e) {} };
  const markAllRead = async () => { try { await api.put('/alerts/read-all'); toast.success('All marked as read'); load(); } catch(e) {} };
  const deleteAlert = async (id) => { try { await api.delete(`/alerts/${id}`); load(); } catch(e) {} };

  const getIcon = (type) => ({ sip_due:'📅', fd_maturity:'🏦', anomaly:'⚠️', milestone:'🎉', price_alert:'📊', custom:'🔔' }[type] || '🔔');

  if (loading) return (<><Topbar title="Alerts"/><div className="page-content"><div className="page-loading"><div className="spinner"/></div></div></>);

  return (
    <><Topbar title="Alerts"/>
      <div className="page-content animate-fade">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:16,fontWeight:600}}>Notifications ({alerts.length})</h2>
          {alerts.some(a=>!a.isRead) && <button className="btn btn-secondary btn-sm" onClick={markAllRead}><CheckCheck size={14}/> Mark All Read</button>}
        </div>
        {alerts.length > 0 ? alerts.map(alert => (
          <div key={alert._id} className={`alert-item ${!alert.isRead?'unread':''}`}>
            <div className="alert-icon">{getIcon(alert.type)}</div>
            <div className="alert-content">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">{timeAgo(alert.createdAt)}</div>
            </div>
            <div style={{display:'flex',gap:4,flexShrink:0}}>
              {!alert.isRead && <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>markRead(alert._id)} title="Mark read"><Check size={14}/></button>}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>deleteAlert(alert._id)}><Trash2 size={14}/></button>
            </div>
          </div>
        )) : (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">🔔</div><div className="empty-state-title">No alerts</div><div className="empty-state-text">You're all caught up! Alerts will appear for SIP due dates, FD maturity, and more.</div></div></div>
        )}
      </div>
    </>
  );
}
