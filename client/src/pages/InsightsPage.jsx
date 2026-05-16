import { useState, useEffect } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      // Fetch all data and send to Python analytics
      const [sips, fds, stocks, members] = await Promise.all([
        api.get('/sips'), api.get('/fds'), api.get('/stocks'), api.get('/members')
      ]);
      // Try Python service
      try {
        const res = await fetch('http://localhost:5001/insights', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ sips: sips.data.data, fds: fds.data.data, stocks: stocks.data.data, members: members.data.data })
        });
        const data = await res.json();
        if (data.insights) setInsights(data.insights);
      } catch(e) {
        // Fallback: generate basic insights client-side
        const sipData = sips.data.data || [];
        const fdData = fds.data.data || [];
        const basic = [];
        if (sipData.length > 0) basic.push({ icon:'📈', severity:'info', title:`${sipData.filter(s=>s.status==='active').length} Active SIPs`, message:`Total monthly commitment: ₹${sipData.filter(s=>s.status==='active').reduce((s,i)=>s+(i.amountPerMonth||0),0).toLocaleString('en-IN')}` });
        if (fdData.length > 0) basic.push({ icon:'🏦', severity:'info', title:`${fdData.length} Fixed Deposits`, message:`Total principal: ₹${fdData.reduce((s,f)=>s+(f.principalAmount||0),0).toLocaleString('en-IN')}` });
        if (sipData.length===0 && fdData.length===0) basic.push({ icon:'💡', severity:'info', title:'Get Started!', message:'Add investments to see personalized insights.' });
        setInsights(basic);
      }
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
