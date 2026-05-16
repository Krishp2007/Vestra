import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, TrendingUp, Landmark, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, memRes] = await Promise.all([
        api.get('/dashboard/family'),
        api.get('/members')
      ]);
      setData(dashRes.data.data);
      setMembers(memRes.data.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (<><Topbar title="Family Dashboard" /><div className="page-content"><div className="page-loading"><div className="spinner" /><p style={{color:'var(--text-muted)'}}>Loading dashboard...</p></div></div></>);

  const summary = data?.summary || {};
  const allocation = data?.allocation || {};
  const monthlyData = data?.monthlyData || [];
  const memberBreakdown = data?.memberBreakdown || [];
  const isPositive = (summary.absoluteReturns || 0) >= 0;

  const pieData = [
    { name: 'Mutual Funds', value: allocation.sip || 0 },
    { name: 'Fixed Deposits', value: allocation.fd || 0 },
    { name: 'Stocks', value: allocation.stocks || 0 },
  ].filter(d => d.value > 0);

  return (
    <>
      <Topbar title="Family Dashboard" />
      <div className="page-content animate-fade">
        {/* Stats */}
        <div className="stats-grid">
          <div className={`stat-card ${isPositive ? 'success' : 'danger'}`}>
            <div className="stat-icon purple">💰</div>
            <div className="stat-label">Total Portfolio Value</div>
            <div className="stat-value">{formatCurrency(summary.totalCurrentValue || 0)}</div>
            <div className={`stat-change ${isPositive ? 'up' : 'down'}`}>
              {isPositive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
              {formatPercent(summary.overallReturns || 0)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📈</div>
            <div className="stat-label">Total Invested</div>
            <div className="stat-value">{formatCurrency(summary.totalInvested || 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              {isPositive ? '📊' : '📉'}
            </div>
            <div className="stat-label">Total Returns</div>
            <div className="stat-value" style={{color: isPositive ? 'var(--success)' : 'var(--danger)'}}>
              {formatCurrency(Math.abs(summary.absoluteReturns || 0))}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">👨‍👩‍👧‍👦</div>
            <div className="stat-label">Family Members</div>
            <div className="stat-value">{summary.totalMembers || members.length || 0}</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-grid">
          {/* Asset Allocation */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Asset Allocation</div><div className="card-subtitle">Portfolio distribution by type</div></div>
            </div>
            {pieData.length > 0 ? (
              <div className="pie-container">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ 
                              background: 'rgba(23, 23, 37, 0.95)', 
                              border: '1px solid var(--border-color)', 
                              padding: '10px 14px', 
                              borderRadius: '12px', 
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                              backdropFilter: 'blur(8px)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: payload[0].payload.fill }} />
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{payload[0].name}:</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{payload[0].value}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{flex:1}}>
                  {pieData.map((item, i) => (
                    <div key={item.name} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                      <span style={{width:10,height:10,borderRadius:3,background:PIE_COLORS[i],flexShrink:0}} />
                      <span style={{fontSize:13,color:'var(--text-secondary)',flex:1}}>{item.name}</span>
                      <span style={{fontSize:14,fontWeight:600}}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📊</div><div className="empty-state-text">Add investments to see allocation</div></div>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Monthly Investments</div><div className="card-subtitle">Last 12 months breakdown</div></div>
            </div>
            {monthlyData.some(m => m.total > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{fill:'var(--text-muted)', fontSize:11}} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    tick={{fill:'var(--text-muted)', fontSize:11}} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={v => v >= 100000 ? `${v/100000}L` : v >= 1000 ? `${v/1000}K` : v} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 4 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="custom-tooltip" style={{ 
                            background: 'rgba(23, 23, 37, 0.95)', 
                            border: '1px solid var(--border-color)', 
                            padding: '12px', 
                            borderRadius: '12px', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(8px)'
                          }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</p>
                            {payload.map((entry, index) => (
                              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: index === payload.length - 1 ? 0 : '4px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.fill }} />
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{entry.name}:</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(entry.value)}</span>
                              </div>
                            ))}
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Total:</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                                {formatCurrency(payload.reduce((acc, curr) => acc + curr.value, 0))}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Bar dataKey="sip" name="SIP" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="fd" name="FD" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="stocks" name="Stocks" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📈</div><div className="empty-state-text">Investment data will appear here</div></div>
            )}
          </div>
        </div>

        {/* Family Members */}
        <div className="card" style={{marginBottom:'28px'}}>
          <div className="card-header">
            <div><div className="card-title">Family Members</div><div className="card-subtitle">Click a member to view details</div></div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/members')}>Manage</button>
          </div>
          {members.length > 0 ? (
            <div className="members-grid">
              {memberBreakdown.length > 0 ? memberBreakdown.map(m => (
                <div key={m.member._id} className="member-card" onClick={() => navigate(`/member/${m.member._id}`)}>
                  <div className="member-avatar">{m.member.avatar || '👤'}</div>
                  <div className="member-name">{m.member.name}</div>
                  <div className="member-relation">{m.member.relation}</div>
                  <div style={{marginTop:'12px',fontSize:18,fontWeight:700}}>{formatCurrency(m.totalInvested || 0)}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Total Invested</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>
                    {m.sipCount} SIPs · {m.fdCount} FDs · {m.stockCount} Stocks
                  </div>
                </div>
              )) : members.map(m => (
                <div key={m._id} className="member-card" onClick={() => navigate(`/member/${m._id}`)}>
                  <div className="member-avatar">{m.avatar || '👤'}</div>
                  <div className="member-name">{m.name}</div>
                  <div className="member-relation">{m.relation}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍👩‍👧‍👦</div>
              <div className="empty-state-title">No family members yet</div>
              <div className="empty-state-text">Add family members to start tracking investments</div>
              <button className="btn btn-primary" onClick={() => navigate('/members')}>Add Members</button>
            </div>
          )}
        </div>

        {/* Alerts */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">🔔 Recent Alerts</div></div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>View All</button>
            </div>
            {data.alerts.slice(0, 5).map(alert => (
              <div key={alert._id} className={`alert-item ${!alert.isRead ? 'unread' : ''}`}>
                <div className="alert-icon">{alert.type === 'sip_due' ? '📅' : alert.type === 'fd_maturity' ? '🏦' : '⚠️'}</div>
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
