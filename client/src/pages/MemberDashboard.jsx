import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b'];

export default function MemberDashboard() {
  const { memberId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { load(); }, [memberId]);
  const load = async () => {
    try { const res = await api.get(`/dashboard/member/${memberId}`); setData(res.data.data); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (<><Topbar title="Loading..."/><div className="page-content"><div className="page-loading"><div className="spinner"/></div></div></>);
  if (!data) return (<><Topbar title="Not Found"/><div className="page-content"><div className="empty-state"><div className="empty-state-title">Member not found</div></div></div></>);

  const s = data.summary || {};
  const a = data.allocation || {};
  const isPos = (s.absoluteReturns || 0) >= 0;
  const pieData = [
    { name: 'SIP/MF', value: a.sip||0 },
    { name: 'FD', value: a.fd||0 },
    { name: 'Stocks', value: a.stocks||0 },
  ].filter(d => d.value > 0);

  return (
    <><Topbar title={`${data.member?.name || 'Member'}'s Dashboard`}/>
      <div className="page-content animate-fade">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{marginBottom:16}}><ArrowLeft size={16}/> Back to Family</button>

        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
          <div style={{fontSize:48}}>{data.member?.avatar||'👤'}</div>
          <div><h2 style={{fontSize:22,fontWeight:700}}>{data.member?.name}</h2><p style={{color:'var(--text-muted)',fontSize:13}}>{data.member?.relation}</p></div>
        </div>

        <div className="stats-grid">
          <div className={`stat-card ${isPos?'success':'danger'}`}><div className="stat-label">Portfolio Value</div><div className="stat-value">{formatCurrency(s.totalCurrentValue)}</div><div className={`stat-change ${isPos?'up':'down'}`}>{isPos?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}{formatPercent(s.totalReturns)}</div></div>
          <div className="stat-card"><div className="stat-label">Total Invested</div><div className="stat-value">{formatCurrency(s.totalInvested)}</div></div>
          <div className="stat-card"><div className="stat-label">SIPs</div><div className="stat-value">{data.sip?.active||0} <span style={{fontSize:14,color:'var(--text-muted)'}}>active</span></div></div>
          <div className="stat-card"><div className="stat-label">FDs</div><div className="stat-value">{data.fd?.active||0} <span style={{fontSize:14,color:'var(--text-muted)'}}>active</span></div></div>
        </div>

        <div className="charts-grid">
          <div className="card">
            <div className="card-title" style={{marginBottom:16}}>Asset Allocation</div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,value})=>`${name} ${value}%`}>
                  {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie><Tooltip contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:8}}/></PieChart>
              </ResponsiveContainer>
            ) : <div className="empty-state" style={{padding:40}}><p style={{color:'var(--text-muted)'}}>No data yet</p></div>}
          </div>
          <div className="card">
            <div className="card-title" style={{marginBottom:16}}>Monthly Investments</div>
            {data.monthlyData?.some(m=>m.total>0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="month" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false}/><YAxis tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickFormatter={v=>v>=100000?`${v/100000}L`:v>=1000?`${v/1000}K`:v}/><Tooltip contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:8}} formatter={v=>formatCurrency(v)}/><Bar dataKey="total" fill="#4f46e5" radius={[4,4,0,0]}/></BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state" style={{padding:40}}><p style={{color:'var(--text-muted)'}}>No data yet</p></div>}
          </div>
        </div>

        {data.recentActivity?.length > 0 && (
          <div className="card">
            <div className="card-title" style={{marginBottom:16}}>Recent Activity</div>
            {data.recentActivity.slice(0,10).map((act,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border-color)'}}>
                <span style={{fontSize:20}}>{act.icon}</span>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:500}}>{act.title}</div></div>
                <div style={{fontWeight:600}}>{formatCurrency(act.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
