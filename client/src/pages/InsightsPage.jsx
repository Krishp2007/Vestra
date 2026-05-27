import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const res = await api.post('/dashboard/insights');
      if (res.data.insights) setInsights(res.data.insights);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (<><Topbar title="Insights"/><div className="page-content"><div className="page-loading"><div className="spinner"/></div></div></>);

  return (
    <><Topbar title="Insights & Analysis"/>
      <div className="page-content animate-fade">
        <h2 style={{fontSize:16,fontWeight:600,marginBottom:20}}>💡 Smart Insights</h2>
        {insights.length > 0 ? insights.map((ins, i) => (
          <div key={i} className="insight-card">
            <div className="insight-icon">{ins.icon || '💡'}</div>
            <div>
              <div className="insight-title">{ins.title}</div>
              <div className="insight-message">{ins.message}</div>
            </div>
          </div>
        )) : (
          <div className="card"><div className="empty-state"><div className="empty-state-icon">🧠</div><div className="empty-state-title">No insights yet</div><div className="empty-state-text">Add investments and insights will be generated automatically</div></div></div>
        )}
      </div>
    </>
  );
}
