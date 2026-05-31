import { useState, useEffect, useMemo } from 'react';
import Topbar from '../components/layout/Topbar';
import api from '../utils/api';
import { formatCurrency } from '../utils/helpers';
import PerformanceInsightsCard from '../components/shared/PerformanceInsightsCard';

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
        <PerformanceInsightsCard
          insights={performanceInsights}
          sipInvested={performanceInsights?.sipInvested || 0}
          stockInvested={performanceInsights?.stockInvested || 0}
          fdInvested={performanceInsights?.fdInvested || 0}
          title="Family Portfolio Performance Insights"
          subtitle="Aggregated wealth profitability across all family assets"
          isFamily={true}
        />

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
