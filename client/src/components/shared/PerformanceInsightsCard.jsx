import React from 'react';
import { formatCurrency } from '../../utils/helpers';

const PerformanceInsightsCard = React.memo(({ insights, sipInvested, stockInvested, fdInvested, title = 'Performance Insights', subtitle = 'Real-time asset class profitability analysis', isFamily = false }) => {
  if (!insights || (!insights.bestAsset && !insights.worstAsset)) return null;

  return (
    <div className="card animate-fade" style={{ marginBottom: 28 }}>
      <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>💡 {title}</div>
          <div className="card-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="performance-insights-grid">
        {/* Asset Profitability Breakdown */}
        <div className="performance-insights-col">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Asset Profit/Loss Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {[
              { name: 'Mutual Funds', val: insights.sipReturns, icon: '💎', color: insights.sipReturns >= 0 ? 'var(--success)' : 'var(--danger)', invested: sipInvested },
              { name: 'Stocks', val: insights.stockReturns, icon: '📈', color: insights.stockReturns >= 0 ? 'var(--success)' : 'var(--danger)', invested: stockInvested },
              { name: 'Fixed Deposits', val: insights.fdReturns, icon: '🏦', color: 'var(--success)', invested: fdInvested }
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
            {insights.bestAsset && insights.worstAsset && (
              <>
                Your {isFamily ? 'family investments' : 'investments'} are performing best in <strong>{insights.bestAsset.name}</strong>, yielding a total gain of <strong style={{ color: 'var(--success)' }}>{formatCurrency(insights.bestAsset.returns)}</strong>. 
                Conversely, your greatest drag on returns is in <strong>{insights.worstAsset.name}</strong>, with a net loss of <strong style={{ color: 'var(--danger)' }}>{formatCurrency(insights.worstAsset.returns)}</strong>.
              </>
            )}
            {insights.bestAsset && !insights.worstAsset && (
              <>
                Fantastic job! All your invested asset classes are profitable. Your strongest absolute performance comes from <strong>{insights.bestAsset.name}</strong>, netting <strong style={{ color: 'var(--success)' }}>{formatCurrency(insights.bestAsset.returns)}</strong> in gains.
              </>
            )}
            {!insights.bestAsset && insights.worstAsset && (
              <>
                Your {isFamily ? 'family portfolio' : 'portfolio'} is experiencing downward pressure. Your biggest absolute contraction is in <strong>{insights.worstAsset.name}</strong>, showing a loss of <strong style={{ color: 'var(--danger)' }}>{formatCurrency(insights.worstAsset.returns)}</strong>. Consider rebalancing into fixed income.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PerformanceInsightsCard;
