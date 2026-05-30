import { useState, useEffect, useMemo } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [sips, setSips] = useState([]);
  const [fds, setFds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  
  const load = async () => {
    try {
      const [dashRes, stocksRes, sipsRes, fdsRes] = await Promise.all([
        api.post('/dashboard/insights'),
        api.get('/stocks'),
        api.get('/sips'),
        api.get('/fds')
      ]);
      if (dashRes.data.insights) setInsights(dashRes.data.insights);
      setStocks(stocksRes.data.data || []);
      setSips(sipsRes.data.data || []);
      setFds(fdsRes.data.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const performanceInsights = useMemo(() => {
    if (loading) return null;

    const sipInvested = sips.reduce((sum, s) => sum + (s.totalInvested || 0), 0);
    const sipValue = sips.reduce((sum, s) => sum + (s.currentValue || 0), 0);
    const sipReturns = sipValue - sipInvested;

    const stockInvested = stocks.reduce((sum, s) => sum + (s.totalInvested || 0), 0);
    const stockValue = stocks.reduce((sum, s) => sum + (s.currentValue || 0), 0);
    const stockReturns = stockValue - stockInvested;

    const fdReturns = fds.reduce((sum, fd) => {
      const interest = (fd.maturityAmount || fd.principalAmount) - fd.principalAmount;
      return sum + Math.max(0, interest);
    }, 0);
    const fdInvested = fds.reduce((sum, fd) => sum + fd.principalAmount, 0);

    const assets = [
      { name: 'Mutual Funds', type: 'sip', returns: sipReturns, icon: '💎', invested: sipInvested },
      { name: 'Stocks', type: 'stocks', returns: stockReturns, icon: '📈', invested: stockInvested },
      { name: 'Fixed Deposits', type: 'fd', returns: fdReturns, icon: '🏦', invested: fdInvested }
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
      sipInvested,
      stockInvested,
      fdInvested,
      bestAsset: bestAsset && bestAsset.returns > 0 ? bestAsset : null,
      worstAsset: worstAsset && worstAsset.returns < 0 ? worstAsset : null
    };
  }, [sips, fds, stocks, loading]);

  if (loading) return (<><Topbar title="Insights"/><div className="page-content"><div className="page-loading"><div className="spinner"/></div></div></>);

  return (
    <><Topbar title="Insights & Analysis"/>
      <div className="page-content animate-fade">
        
        {/* Performance Insights (Overall Portfolio Breakdown) */}
        {performanceInsights && (performanceInsights.bestAsset || performanceInsights.worstAsset) && (
          <div className="card animate-fade" style={{ marginBottom: 28 }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>💡 Family Portfolio Performance Insights</div>
                <div className="card-subtitle">Aggregated wealth profitability across all family assets</div>
              </div>
            </div>
            <div className="performance-insights-grid">
              {/* Asset Profitability Breakdown */}
              <div className="performance-insights-col">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Asset Profit/Loss Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  {[
                    { name: 'Mutual Funds', val: performanceInsights.sipReturns, icon: '💎', color: performanceInsights.sipReturns >= 0 ? 'var(--success)' : 'var(--danger)', invested: performanceInsights.sipInvested },
                    { name: 'Stocks', val: performanceInsights.stockReturns, icon: '📈', color: performanceInsights.stockReturns >= 0 ? 'var(--success)' : 'var(--danger)', invested: performanceInsights.stockInvested },
                    { name: 'Fixed Deposits', val: performanceInsights.fdReturns, icon: '🏦', color: 'var(--success)', invested: performanceInsights.fdInvested }
                  ].map(a => {
                    if (a.invested === 0) return null;
                    return (
                      <div key={a.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
                          <span>{a.icon}</span> {a.name}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: a.color }}>
                          {a.val >= 0 ? '+' : ''}{formatCurrency(a.val)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Summary Statement */}
              <div className="performance-insights-statement">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✨ Wealth Intelligence Statement
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {performanceInsights.bestAsset && performanceInsights.worstAsset && (
                    <>
                      Your family investments are performing best in <strong>{performanceInsights.bestAsset.name}</strong>, yielding a total gain of <strong style={{ color: 'var(--success)' }}>{formatCurrency(performanceInsights.bestAsset.returns)}</strong>. 
                      Conversely, your greatest drag on returns is in <strong>{performanceInsights.worstAsset.name}</strong>, with a net loss of <strong style={{ color: 'var(--danger)' }}>{formatCurrency(performanceInsights.worstAsset.returns)}</strong>.
                    </>
                  )}
                  {performanceInsights.bestAsset && !performanceInsights.worstAsset && (
                    <>
                      Fantastic job! All your invested asset classes are profitable. Your strongest absolute performance comes from <strong>{performanceInsights.bestAsset.name}</strong>, netting <strong style={{ color: 'var(--success)' }}>{formatCurrency(performanceInsights.bestAsset.returns)}</strong> in gains.
                    </>
                  )}
                  {!performanceInsights.bestAsset && performanceInsights.worstAsset && (
                    <>
                      Your family portfolio is experiencing downward pressure. Your biggest absolute contraction is in <strong>{performanceInsights.worstAsset.name}</strong>, showing a loss of <strong style={{ color: 'var(--danger)' }}>{formatCurrency(performanceInsights.worstAsset.returns)}</strong>. Consider rebalancing into fixed income.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
          <div className="card"><div className="empty-state"><div className="empty-state-title">No insights yet</div><div className="empty-state-text">Add investments and insights will be generated automatically</div></div></div>
        )}
      </div>
    </>
  );
}
