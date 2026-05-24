import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatPercent } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, TrendingUp, Landmark, BarChart3, ArrowUpRight, ArrowDownRight, ChevronRight, Eye, Zap, Clock, Award } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topHoldings, setTopHoldings] = useState([]);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [viewingAssetType, setViewingAssetType] = useState(null);
  const [chartRange, setChartRange] = useState(6);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, memRes, stocksRes, sipsRes, fdsRes] = await Promise.all([
        api.get('/dashboard/family'),
        api.get('/members'),
        api.get('/stocks'),
        api.get('/sips'),
        api.get('/fds')
      ]);
      setData(dashRes.data.data);
      setMembers(memRes.data.data);

      // Build top holdings from all assets
      const holdings = [];
      (stocksRes.data.data || []).forEach(s => {
        const currentVal = (s.currentPrice || s.avgBuyPrice) * (s.holdingQuantity || 0);
        const invested = s.totalInvested || 0;
        const ret = invested > 0 ? ((currentVal - invested) / invested) * 100 : 0;
        holdings.push({ id: s._id, name: s.symbol, type: 'stock', invested, currentValue: currentVal, returns: ret, data: s });
      });
      (sipsRes.data.data || []).forEach(s => {
        const ret = s.totalInvested > 0 ? ((s.currentValue - s.totalInvested) / s.totalInvested) * 100 : 0;
        holdings.push({ id: s._id, name: s.fundName, type: 'sip', invested: s.totalInvested, currentValue: s.currentValue || 0, returns: ret, data: s });
      });
      (fdsRes.data.data || []).forEach(f => {
        const ret = f.principalAmount > 0 ? ((f.maturityAmount - f.principalAmount) / f.principalAmount) * 100 : 0;
        holdings.push({ id: f._id, name: f.bankName, type: 'fd', invested: f.principalAmount, currentValue: f.maturityAmount || f.principalAmount, returns: ret, data: f });
      });

      holdings.sort((a, b) => Math.abs(b.returns) - Math.abs(a.returns));
      setTopHoldings(holdings.slice(0, 6));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAssetDetail = (holding) => {
    setViewingAsset(holding.data);
    setViewingAssetType(holding.type);
  };

  const summary = data?.summary || {};
  const allocation = data?.allocation || {};
  const monthlyData = data?.monthlyData || [];
  const memberBreakdown = data?.memberBreakdown || [];
  const isPositive = (summary.absoluteReturns || 0) >= 0;

  const pieData = [
    { name: 'Mutual Funds', value: allocation.sip || 0, route: '/sips', invested: summary.sipInvested || 0 },
    { name: 'Fixed Deposits', value: allocation.fd || 0, route: '/fds', invested: summary.fdInvested || 0 },
    { name: 'Stocks', value: allocation.stocks || 0, route: '/stocks', invested: summary.stockInvested || 0 },
  ].filter(d => d.value > 0);

  const getTypeIcon = (type) => {
    if (type === 'stock') return '📈';
    if (type === 'sip') return '💎';
    if (type === 'fd') return '🏦';
    return '💰';
  };

  const getTypeLabel = (type) => {
    if (type === 'stock') return 'Stock';
    if (type === 'sip') return 'Mutual Fund';
    if (type === 'fd') return 'Fixed Deposit';
    return type;
  };

  return (
    <>
      <Topbar title="Family Dashboard" />
      <div className="page-content animate-fade">
        {/* Stats */}
        <div className="stats-grid">
          <div className={`stat-card ${!loading && isPositive ? 'success' : 'danger'}`}>
            <div className="stat-icon purple">💰</div>
            <div className="stat-label">Total Portfolio Value</div>
            <div className="stat-value">
              {loading ? <span className="skeleton" style={{ width: '120px', height: '24px', margin: '4px 0' }} /> : formatCurrency(summary.totalCurrentValue || 0)}
            </div>
            <div className="stat-change" style={{ background: 'transparent', padding: 0 }}>
              {loading ? (
                <span className="skeleton" style={{ width: '70px', height: '14px', marginTop: '6px' }} />
              ) : (
                <div className={`stat-change ${isPositive ? 'up' : 'down'}`} style={{ marginTop: 0 }}>
                  {isPositive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                  {formatPercent(summary.overallReturns || 0)}
                </div>
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📈</div>
            <div className="stat-label">Total Invested</div>
            <div className="stat-value">
              {loading ? <span className="skeleton" style={{ width: '120px', height: '24px', margin: '4px 0' }} /> : formatCurrency(summary.totalInvested || 0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {loading ? (
                <span className="skeleton" style={{ width: '140px', height: '12px' }} />
              ) : (
                `${summary.totalSips || 0} SIPs · ${summary.totalFds || 0} FDs · ${summary.totalStocks || 0} Stocks`
              )}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              {loading ? '📊' : (isPositive ? '📊' : '📉')}
            </div>
            <div className="stat-label">Total Returns</div>
            <div className="stat-value" style={{color: !loading && isPositive ? 'var(--success)' : 'var(--danger)'}}>
              {loading ? <span className="skeleton" style={{ width: '120px', height: '24px', margin: '4px 0' }} /> : `${isPositive ? '+' : '-'}${formatCurrency(Math.abs(summary.absoluteReturns || 0))}`}
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/members')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon amber">👨‍👩‍👧‍👦</div>
            <div className="stat-label">Family Members</div>
            <div className="stat-value">
              {loading ? <span className="skeleton" style={{ width: '60px', height: '24px', margin: '4px 0' }} /> : (summary.totalMembers || members.length || 0)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {loading ? <span className="skeleton" style={{ width: '120px', height: '12px' }} /> : 'Click to manage members'}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-grid">
          {[
            { icon: <TrendingUp size={18}/>, label: 'Add Stock', path: '/add?tab=stock', color: '#10b981' },
            { icon: <Landmark size={18}/>, label: 'Add FD', path: '/add?tab=fd', color: '#f59e0b' },
            { icon: <BarChart3 size={18}/>, label: 'Add SIP', path: '/add?tab=sip', color: '#6366f1' },
            { icon: <Eye size={18}/>, label: 'Insights', path: '/insights', color: '#8b5cf6' },
          ].map(action => (
            <button
              key={action.label}
              className="btn btn-ghost"
              onClick={() => navigate(action.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)', justifyContent: 'flex-start',
                transition: 'all 0.2s ease', fontWeight: 500, fontSize: 13
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ color: action.color }}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {/* Charts Row */}
        <div className="charts-grid">
          {/* Asset Allocation */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Asset Allocation</div><div className="card-subtitle">Portfolio distribution by type</div></div>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
                <span className="skeleton" style={{ width: '100%', height: '140px', borderRadius: '50%' }} />
                <span className="skeleton" style={{ width: '60%', height: '16px' }} />
              </div>
            ) : pieData.length > 0 ? (
              <div className="pie-container">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={4} dataKey="value"
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div style={{ 
                              background: 'rgba(23, 23, 37, 0.95)', 
                              border: '1px solid var(--border-color)', 
                              padding: '12px 16px', 
                              borderRadius: '12px', 
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                              backdropFilter: 'blur(8px)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.fill }} />
                                <span style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600 }}>{item.name}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Share: <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{item.value}%</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                Invested: <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(item.invested || 0)}</span>
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
                    <div
                      key={item.name}
                      style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px', padding: '6px 8px', borderRadius: 8}}
                    >
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
              <div><div className="card-title">Monthly Investments</div><div className="card-subtitle">Investment breakdown over time</div></div>
              <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                {[3, 6, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => setChartRange(n)}
                    style={{
                      padding: '4px 10px', borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: chartRange === n ? 'var(--accent)' : 'transparent',
                      color: chartRange === n ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.2s'
                    }}
                  >{n}M</button>
                ))}
              </div>
            </div>
            {loading ? (
              <div style={{ padding: '20px 24px' }}>
                <span className="skeleton" style={{ width: '100%', height: '200px', borderRadius: 8 }} />
              </div>
            ) : monthlyData.slice(-chartRange).some(m => m.total > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData.slice(-chartRange)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

        {/* Top Holdings - Clickable Details */}
        {topHoldings.length > 0 && (
          <div className="card hide-mobile" style={{ marginBottom: 28 }}>
            <div className="card-header">
              <div><div className="card-title">🏆 Top Holdings</div><div className="card-subtitle">Click any holding for detailed breakdown</div></div>
            </div>
            <div className="holdings-grid">
              {topHoldings.map(h => {
                const isUp = h.returns >= 0;
                return (
                  <div
                    key={h.id}
                    onClick={() => openAssetDetail(h)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                      background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)', cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = isUp ? 'var(--success)' : 'var(--danger)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ fontSize: 28, lineHeight: 1 }}>{getTypeIcon(h.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getTypeLabel(h.type)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(h.currentValue)}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isUp ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                        {isUp ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                        {isUp ? '+' : ''}{h.returns.toFixed(1)}%
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Family Members - Enhanced */}
        <div className="card" style={{marginBottom:'28px'}}>
          <div className="card-header">
            <div><div className="card-title">Family Members</div><div className="card-subtitle">Click a member to view their portfolio</div></div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/members')}>Manage</button>
          </div>
          {loading ? (
            <div className="members-grid">
              {[1, 2].map(i => (
                <div key={i} className="member-card" style={{ cursor: 'default' }}>
                  <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%', marginBottom: '12px' }} />
                  <div className="skeleton" style={{ width: '70%', height: '14px', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ width: '50%', height: '11px' }} />
                </div>
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="members-grid">
              {memberBreakdown.length > 0 ? memberBreakdown.map(m => {
                const memberReturn = m.totalInvested > 0 ? ((m.totalValue - m.totalInvested) / m.totalInvested * 100) : 0;
                const mIsPos = memberReturn >= 0;
                return (
                  <div key={m.member._id} className="member-card" onClick={() => navigate(`/member/${m.member._id}`)}>
                    <div className="member-avatar">{m.member.avatar || '👤'}</div>
                    <div className="member-name">{m.member.name}</div>
                    <div className="member-relation">{m.member.relation}</div>
                    <div style={{marginTop:'12px',fontSize:18,fontWeight:700}}>{formatCurrency(m.totalInvested || 0)}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>Total Invested</div>
                    <div style={{ 
                      fontSize: 12, fontWeight: 600, marginTop: 6, 
                      color: mIsPos ? 'var(--success)' : 'var(--danger)',
                      display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center'
                    }}>
                      {mIsPos ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                      {mIsPos ? '+' : ''}{memberReturn.toFixed(1)}% returns
                    </div>
                    <div style={{fontSize:11,color:'var(--text-muted)',marginTop:6}}>
                      {m.sipCount} SIPs · {m.fdCount} FDs · {m.stockCount} Stocks
                    </div>
                  </div>
                );
              }) : members.map(m => (
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
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>View All <ChevronRight size={14} /></button>
            </div>
            {data.alerts.slice(0, 5).map(alert => (
              <div key={alert._id} className={`alert-item ${!alert.isRead ? 'unread' : ''}`} onClick={() => navigate('/alerts')} style={{ cursor: 'pointer' }}>
                <div className="alert-icon">{alert.type === 'sip_due' ? '📅' : alert.type === 'fd_maturity' ? '🏦' : '⚠️'}</div>
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Detail Modal */}
      <AssetDetailsModal 
        asset={viewingAsset} 
        type={viewingAssetType} 
        onClose={() => { setViewingAsset(null); setViewingAssetType(null); }} 
      />
    </>
  );
}
