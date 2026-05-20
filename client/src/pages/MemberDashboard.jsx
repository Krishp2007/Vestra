import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatPercent, formatDate } from '../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, ChevronRight, TrendingUp, Landmark, BarChart3, Clock } from 'lucide-react';
import AssetDetailsModal from '../components/investments/AssetDetailsModal';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b'];

export default function MemberDashboard() {
  const { memberId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [memberChartRange, setMemberChartRange] = useState(6);
  const [memberStocks, setMemberStocks] = useState([]);
  const [memberSips, setMemberSips] = useState([]);
  const [memberFds, setMemberFds] = useState([]);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [viewingAssetType, setViewingAssetType] = useState(null);
  const holdingsRef = useRef(null);
  const navigate = useNavigate();

  const scrollToTab = (tab) => {
    setActiveTab(tab);
    setTimeout(() => holdingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  useEffect(() => { load(); }, [memberId]);

  const load = async () => {
    try {
      const [dashRes, stocksRes, sipsRes, fdsRes] = await Promise.all([
        api.get(`/dashboard/member/${memberId}`),
        api.get('/stocks'),
        api.get('/sips'),
        api.get('/fds')
      ]);
      setData(dashRes.data.data);

      // Filter assets for this member
      const allStocks = stocksRes.data.data || [];
      const allSips = sipsRes.data.data || [];
      const allFds = fdsRes.data.data || [];

      setMemberStocks(allStocks.filter(s => (s.memberId?._id || s.memberId) === memberId));
      setMemberSips(allSips.filter(s => (s.memberId?._id || s.memberId) === memberId));
      setMemberFds(allFds.filter(f => (f.memberId?._id || f.memberId) === memberId));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openDetail = (asset, type) => {
    setViewingAsset(asset);
    setViewingAssetType(type);
  };

  if (loading) return (<><Topbar title="Loading..."/><div className="page-content"><div className="page-loading"><div className="spinner"/></div></div></>);
  if (!data) return (<><Topbar title="Not Found"/><div className="page-content"><div className="empty-state"><div className="empty-state-title">Member not found</div></div></div></>);

  const s = data.summary || {};
  const a = data.allocation || {};
  const isPos = (s.absoluteReturns || 0) >= 0;
  const pieData = [
    { name: 'Mutual Funds', value: a.sip||0 },
    { name: 'Fixed Deposits', value: a.fd||0 },
    { name: 'Stocks', value: a.stocks||0 },
  ].filter(d => d.value > 0);

  const tabs = [
    { key: 'all', label: 'Overview', icon: '📊' },
    { key: 'stocks', label: `Stocks (${memberStocks.length})`, icon: '📈' },
    { key: 'sips', label: `SIPs (${memberSips.length})`, icon: '💎' },
    { key: 'fds', label: `FDs (${memberFds.length})`, icon: '🏦' },
  ];

  return (
    <><Topbar title={`${data.member?.name || 'Member'}'s Dashboard`}/>
      <div className="page-content animate-fade">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{marginBottom:16}}><ArrowLeft size={16}/> Back to Family</button>

        {/* Member Header */}
        <div className="member-header-card animate-fade">
          <div className="member-header-avatar">{data.member?.avatar||'👤'}</div>
          <div className="member-header-details">
            <h2 className="member-header-name">{data.member?.name}</h2>
            <p className="member-header-relation">{data.member?.relation}</p>
          </div>
          <div className="member-header-stats">
            <div className="member-header-value">{formatCurrency(s.totalCurrentValue || 0)}</div>
            <div className="member-header-returns" style={{ color: isPos ? 'var(--success)' : 'var(--danger)' }}>
              {isPos ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
              {isPos ? '+' : ''}{formatPercent(s.totalReturns || 0)} returns
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className={`stat-card ${isPos?'success':'danger'}`}>
            <div className="stat-label">Portfolio Value</div>
            <div className="stat-value">{formatCurrency(s.totalCurrentValue)}</div>
            <div className={`stat-change ${isPos?'up':'down'}`}>{isPos?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}{formatPercent(s.totalReturns)}</div>
          </div>
          <div className="stat-card" onClick={() => scrollToTab('sips')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon green">💎</div>
            <div className="stat-label">Mutual Funds</div>
            <div className="stat-value">{data.sip?.active||0} <span style={{fontSize:14,color:'var(--text-muted)'}}>active</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Invested: {formatCurrency(data.sip?.invested || 0)}</div>
          </div>
          <div className="stat-card" onClick={() => scrollToTab('fds')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon blue">🏦</div>
            <div className="stat-label">Fixed Deposits</div>
            <div className="stat-value">{data.fd?.active||0} <span style={{fontSize:14,color:'var(--text-muted)'}}>active</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Principal: {formatCurrency(data.fd?.principal || 0)}</div>
          </div>
          <div className="stat-card" onClick={() => scrollToTab('stocks')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon amber">📈</div>
            <div className="stat-label">Stocks</div>
            <div className="stat-value">{data.stocks?.total||0} <span style={{fontSize:14,color:'var(--text-muted)'}}>holdings</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Value: {formatCurrency(data.stocks?.currentValue || 0)}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Asset Allocation</div><div className="card-subtitle">Portfolio split by type</div></div>
            </div>
            {pieData.length > 0 ? (
              <div className="pie-container">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background: 'rgba(23, 23, 37, 0.95)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}>
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
                    <div key={item.name} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px', padding: '6px 8px', borderRadius: 8}}>
                      <span style={{width:10,height:10,borderRadius:3,background:PIE_COLORS[i],flexShrink:0}} />
                      <span style={{fontSize:13,color:'var(--text-secondary)',flex:1}}>{item.name}</span>
                      <span style={{fontSize:14,fontWeight:600}}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="empty-state" style={{padding:40}}><p style={{color:'var(--text-muted)'}}>No data yet</p></div>}
          </div>

          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Monthly Investments</div><div className="card-subtitle">Investment breakdown over time</div></div>
              <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                {[3, 6, 12].map(n => (
                  <button
                    key={n}
                    onClick={() => setMemberChartRange(n)}
                    style={{
                      padding: '4px 10px', borderRadius: 'calc(var(--radius-md) - 2px)', border: 'none',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: memberChartRange === n ? 'var(--accent)' : 'transparent',
                      color: memberChartRange === n ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.2s'
                    }}
                  >{n}M</button>
                ))}
              </div>
            </div>
            {data.monthlyData?.slice(-memberChartRange).some(m=>m.total>0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthlyData.slice(-memberChartRange)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>v>=100000?`${v/100000}L`:v>=1000?`${v/1000}K`:v}/>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 4 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background: 'rgba(23, 23, 37, 0.95)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}>
                            <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</p>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(payload[0]?.value || 0)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} barSize={20}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty-state" style={{padding:40}}><p style={{color:'var(--text-muted)'}}>No data yet</p></div>}
          </div>
        </div>

        {/* Holdings Tabs */}
        <div className="card" ref={holdingsRef} style={{ marginBottom: 28 }}>
          <div className="responsive-tabs-container">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`responsive-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'all' && (
            <div>
              {data.recentActivity?.length > 0 ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14}/> Recent Activity
                  </div>
                  {data.recentActivity.slice(0,10).map((act,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom: i < data.recentActivity.slice(0,10).length - 1 ? '1px solid var(--border-color)' : 'none'}}>
                      <span style={{fontSize:22}}>{act.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:500}}>{act.title}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{act.date ? formatDate(act.date) : ''}</div>
                      </div>
                      <div style={{fontWeight:600,fontSize:14}}>{formatCurrency(act.amount)}</div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-text">No recent activity</div>
                </div>
              )}
            </div>
          )}

          {/* Stocks Tab */}
          {activeTab === 'stocks' && (
            <div>
              {memberStocks.length > 0 ? memberStocks.map(stock => {
                const currentVal = (stock.currentPrice || stock.avgBuyPrice) * (stock.holdingQuantity || 0);
                const ret = stock.totalInvested > 0 ? ((currentVal - stock.totalInvested) / stock.totalInvested * 100) : 0;
                const isUp = ret >= 0;
                return (
                  <div
                    key={stock._id}
                    onClick={() => openDetail(stock, 'stock')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                      borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📈</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{stock.symbol}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stock.exchange?.toUpperCase()} · {stock.holdingQuantity} shares</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(currentVal)}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isUp ? 'var(--success)' : 'var(--danger)' }}>
                        {isUp ? '+' : ''}{ret.toFixed(1)}%
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                );
              }) : (
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-icon">📈</div><div className="empty-state-text">No stocks for this member</div><button className="btn btn-primary btn-sm" onClick={() => navigate('/stocks')}>Add Stock</button></div>
              )}
            </div>
          )}

          {/* SIPs Tab */}
          {activeTab === 'sips' && (
            <div>
              {memberSips.length > 0 ? memberSips.map(sip => {
                const ret = sip.totalInvested > 0 ? ((sip.currentValue - sip.totalInvested) / sip.totalInvested * 100) : 0;
                const isUp = ret >= 0;
                return (
                  <div
                    key={sip._id}
                    onClick={() => openDetail(sip, 'sip')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                      borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💎</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sip.fundName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sip.category} · ₹{sip.amountPerMonth?.toLocaleString('en-IN')}/mo · <span className={`badge ${sip.status === 'active' ? 'badge-success' : sip.status === 'paused' ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: 10, padding: '1px 6px' }}>{sip.status}</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(sip.currentValue || 0)}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: isUp ? 'var(--success)' : 'var(--danger)' }}>
                        {isUp ? '+' : ''}{ret.toFixed(1)}%
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                );
              }) : (
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-icon">💎</div><div className="empty-state-text">No SIPs for this member</div><button className="btn btn-primary btn-sm" onClick={() => navigate('/sips')}>Add SIP</button></div>
              )}
            </div>
          )}

          {/* FDs Tab */}
          {activeTab === 'fds' && (
            <div>
              {memberFds.length > 0 ? memberFds.map(fd => {
                const interest = (fd.maturityAmount || fd.principalAmount) - fd.principalAmount;
                const daysLeft = fd.maturityDate ? Math.ceil((new Date(fd.maturityDate) - new Date()) / (1000*60*60*24)) : 0;
                return (
                  <div
                    key={fd._id}
                    onClick={() => openDetail(fd, 'fd')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                      borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏦</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{fd.bankName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fd.interestRate}% p.a. · <span className={`badge ${fd.status === 'active' ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: 10, padding: '1px 6px' }}>{fd.status}</span> {daysLeft > 0 && fd.status === 'active' ? `· ${daysLeft}d left` : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{formatCurrency(fd.principalAmount)}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>
                        +{formatCurrency(interest)} interest
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                );
              }) : (
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-icon">🏦</div><div className="empty-state-text">No FDs for this member</div><button className="btn btn-primary btn-sm" onClick={() => navigate('/fds')}>Add FD</button></div>
              )}
            </div>
          )}
        </div>
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
