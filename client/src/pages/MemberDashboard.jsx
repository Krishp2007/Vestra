import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency, formatPercent, formatDate } from '../utils/helpers';
import AssetAllocationPie from '../components/shared/AssetAllocationPie';
import MonthlyTrendChart from '../components/shared/MonthlyTrendChart';
import PerformanceInsightsCard from '../components/shared/PerformanceInsightsCard';
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

  const insights = useMemo(() => {
    if (!data) return null;

    const sipInvested = data.sip?.invested || 0;
    const sipValue = data.sip?.currentValue || 0;
    const sipReturns = sipValue - sipInvested;

    const stockInvested = data.stocks?.invested || 0;
    const stockValue = data.stocks?.currentValue || 0;
    const stockReturns = stockValue - stockInvested;

    const fdReturns = memberFds.reduce((sum, fd) => {
      const interest = (fd.maturityAmount || fd.principalAmount) - fd.principalAmount;
      return sum + Math.max(0, interest);
    }, 0);

    const assets = [
      { name: 'Mutual Funds', type: 'sip', returns: sipReturns, icon: '💎', invested: sipInvested },
      { name: 'Stocks', type: 'stocks', returns: stockReturns, icon: '📈', invested: stockInvested },
      { name: 'Fixed Deposits', type: 'fd', returns: fdReturns, icon: '🏦', invested: memberFds.reduce((sum, f) => sum + f.principalAmount, 0) }
    ];

    const activeAssets = assets.filter(a => a.invested > 0);
    if (activeAssets.length === 0) return null;

    let bestAsset = null;
    let worstAsset = null;

    activeAssets.forEach(asset => {
      if (!bestAsset || asset.returns > bestAsset.returns) {
        bestAsset = asset;
      }
      if (!worstAsset || asset.returns < worstAsset.returns) {
        worstAsset = asset;
      }
    });

    return {
      sipReturns,
      stockReturns,
      fdReturns,
      bestAsset: bestAsset && bestAsset.returns > 0 ? bestAsset : null,
      worstAsset: worstAsset && worstAsset.returns < 0 ? worstAsset : null
    };
  }, [data, memberFds]);

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
    { name: 'Mutual Funds', value: a.sip||0, invested: data.sip?.invested || 0 },
    { name: 'Fixed Deposits', value: a.fd||0, invested: data.fd?.invested || data.fd?.principal || 0 },
    { name: 'Stocks', value: a.stocks||0, invested: data.stocks?.invested || 0 },
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
              {formatPercent(s.totalReturns || 0)} returns
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">💰</div>
            <div className="stat-label">Total Invested</div>
            <div className="stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              {formatCurrency(s.totalInvested || 0)}
              <span style={{ fontSize: 13, fontWeight: 600, color: isPos ? 'var(--success)' : 'var(--danger)' }}>
                ({isPos ? '+' : ''}{formatCurrency(s.absoluteReturns || 0)})
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Active Capital Outlay</div>
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

        {/* Performance Insights */}
        <PerformanceInsightsCard
          insights={insights}
          sipInvested={data.sip?.invested || 0}
          stockInvested={data.stocks?.invested || 0}
          fdInvested={memberFds.reduce((sum, f) => sum + f.principalAmount, 0)}
          title="Member Portfolio Performance Insights"
          subtitle="Real-time asset class profitability analysis"
        />

        {/* Charts */}
        <div className="charts-grid">
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Asset Allocation</div><div className="card-subtitle">Portfolio split by type</div></div>
            </div>
            <AssetAllocationPie
              pieData={pieData}
              innerRadius={50}
              outerRadius={80}
              height={200}
              emptyState={<div className="empty-state" style={{padding:40}}><p style={{color:'var(--text-muted)'}}>No data yet</p></div>}
            />
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
            <MonthlyTrendChart
              monthlyData={data.monthlyData}
              chartRange={memberChartRange}
              setChartRange={setMemberChartRange}
              height={200}
              emptyState={<div className="empty-state" style={{padding:40}}><p style={{color:'var(--text-muted)'}}>No data yet</p></div>}
            />
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
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-icon">📈</div><div className="empty-state-text">No stocks for this member</div><button className="btn btn-primary btn-sm" onClick={() => navigate(`/add?tab=stock&memberId=${memberId}`)}>Add Stock</button></div>
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
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-icon">💎</div><div className="empty-state-text">No SIPs for this member</div><button className="btn btn-primary btn-sm" onClick={() => navigate(`/add?tab=sip&memberId=${memberId}`)}>Add SIP</button></div>
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
                <div className="empty-state" style={{ padding: 40 }}><div className="empty-state-icon">🏦</div><div className="empty-state-text">No FDs for this member</div><button className="btn btn-primary btn-sm" onClick={() => navigate(`/add?tab=fd&memberId=${memberId}`)}>Add FD</button></div>
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
