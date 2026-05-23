import { X, Activity } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';
import api from '../../utils/api';

export default function AssetDetailsModal({ asset, type, onClose }) {
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const currentFdValue = useMemo(() => {
    if (!asset || type !== 'fd') return 0;
    let val = asset.principalAmount;
    if (asset.status === 'matured') {
      val = asset.maturityAmount;
    } else if (asset.status === 'active') {
      const start = new Date(asset.startDate);
      const now = new Date();
      if (now > start) {
        const daysRun = (now - start) / (1000 * 60 * 60 * 24);
        const yearsRun = daysRun / 365.25;
        let n = 4;
        const comp = (asset.compoundingFrequency || asset.compounding || 'quarterly').toLowerCase();
        if (comp.includes('month')) n = 12;
        if (comp.includes('year') || comp.includes('annual')) n = 1;
        const effectiveN = comp.includes('maturity') ? (1/yearsRun) : n;
        val = asset.principalAmount * Math.pow(1 + (asset.interestRate/100)/effectiveN, effectiveN * yearsRun);
        if (asset.maturityAmount && val > asset.maturityAmount) val = asset.maturityAmount;
      }
    }
    return val;
  }, [asset, type]);

  const displayStockPrice = useMemo(() => {
    if (!asset || type !== 'stock') return 0;
    if (chartData && chartData.length > 0) {
      return chartData[chartData.length - 1].price;
    }
    return asset.currentPrice || asset.avgBuyPrice;
  }, [asset, type, chartData]);

  const closestFdPoint = useMemo(() => {
    if (type !== 'fd' || !chartData || chartData.length === 0) return null;
    const today = new Date();
    let minDiff = Infinity;
    let closest = null;
    chartData.forEach(pt => {
      if (pt.rawDate) {
        const diff = Math.abs(pt.rawDate.getTime() - today.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closest = pt;
        }
      }
    });
    return closest;
  }, [chartData, type]);

  const stockMetrics = useMemo(() => {
    if (!asset || type !== 'stock' || !asset.transactions?.length) return { text: '-', cagr: 0 };
    
    const firstBuy = asset.transactions.find(t => t.type === 'buy');
    if (!firstBuy) return { text: '-', cagr: 0 };
    
    const start = new Date(firstBuy.date);
    const diffDays = Math.ceil(Math.abs(new Date() - start) / (1000 * 60 * 60 * 24));
    
    let text = `${diffDays} days`;
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30);
      if (months < 12) text = `${months} month${months > 1 ? 's' : ''}`;
      else {
        const years = Math.floor(months / 12);
        const rem = months % 12;
        text = `${years} yr${years > 1 ? 's' : ''} ${rem > 0 ? `${rem} mo` : ''}`;
      }
    }
    
    let cagr = 0;
    if (diffDays >= 30 && asset.totalInvested > 0) {
      const currentValue = displayStockPrice * asset.holdingQuantity;
      cagr = (Math.pow(currentValue / asset.totalInvested, 365.25 / diffDays) - 1) * 100;
    }
    
    return { text, cagr };
  }, [asset, type, displayStockPrice]);

  useEffect(() => {
    if (!asset) return;
    setChartData([]);
    
    if (type === 'stock') {
      setLoadingChart(true);
      api.get(`/stocks/history/${asset.symbol}?range=6mo&interval=1d`)
        .then(res => {
          if (res.data.success) {
            setChartData(res.data.history.map(d => ({
              date: new Date(d.date).toLocaleDateString('en-IN', {month:'short', day:'numeric'}),
              price: Math.round(d.price * 100) / 100
            })));
          }
        })
        .catch(console.error)
        .finally(() => setLoadingChart(false));
    } 
    else if (type === 'sip' && asset.schemeCode) {
      setLoadingChart(true);
      fetch(`https://api.mfapi.in/mf/${asset.schemeCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.data) {
            const history = data.data.slice(0, 100).reverse().map(d => ({
              date: d.date.slice(0, 5),
              nav: parseFloat(d.nav)
            }));
            setChartData(history);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingChart(false));
    }
    else if (type === 'fd') {
      // Generate projection curve for FD
      try {
        const start = new Date(asset.startDate);
        const end = new Date(asset.maturityDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const totalDays = (end - start) / (1000 * 60 * 60 * 24);
          const points = 12;
          const step = totalDays / points;
          const curve = [];
          const comp = (asset.compoundingFrequency || asset.compounding || 'quarterly').toLowerCase();
          let n = 4;
          if (comp.includes('month')) n = 12;
          if (comp.includes('year') || comp.includes('annual')) n = 1;

          for (let i = 0; i <= points; i++) {
            const d = new Date(start.getTime() + (step * i * 1000 * 60 * 60 * 24));
            const years = (step * i) / 365.25;
            
            let val = asset.principalAmount;
            if (i === points && asset.maturityAmount) {
               val = asset.maturityAmount;
            } else if (years > 0) {
               const effectiveN = comp.includes('maturity') ? (1/years) : n;
               val = asset.principalAmount * Math.pow(1 + (asset.interestRate/100)/effectiveN, effectiveN * years);
            }

            curve.push({
              date: d.toLocaleDateString('en-IN', {month:'short', year:'2-digit'}),
              value: Math.round(val),
              rawDate: d
            });
          }
          setChartData(curve);
        }
      } catch(e) {}
    }
  }, [asset, type]);

  if (!asset) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 15, marginBottom: 15 }}>
          <h2 className="modal-title" style={{ fontSize: 18 }}>
             {type === 'sip' && 'Mutual Fund Details'}
             {type === 'fd' && 'Fixed Deposit Details'}
             {type === 'stock' && 'Stock Details'}
          </h2>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ padding: '0 5px' }}>
          
          {type === 'sip' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{asset.fundName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{asset.category} &bull; {asset.status?.toUpperCase()}</div>
              </div>
              
              <div className="asset-details-grid">
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Monthly Investment</div><div style={{ fontSize: 15, fontWeight: 600 }}>{formatCurrency(asset.amountPerMonth)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SIP Date</div><div style={{ fontSize: 15, fontWeight: 600 }}>Day {asset.sipDate}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Invested</div><div style={{ fontSize: 15, fontWeight: 600 }}>{formatCurrency(asset.totalInvested)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Value</div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(asset.currentValue)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Units</div><div style={{ fontSize: 15, fontWeight: 500 }}>{asset.totalUnits || '-'}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start Date</div><div style={{ fontSize: 15, fontWeight: 500 }}>{formatDate(asset.startDate)}</div></div>
              </div>
              
              {asset.notes && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{asset.notes}</div>
                </div>
              )}

              <div style={{ marginTop: 10, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 15 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14}/> Historical NAV (Last 100 days)</div>
                {loadingChart ? (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{width: 20, height: 20}} /></div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} minTickGap={20} />
                      <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelStyle={{ color: '#64748b', fontSize: 12 }} />
                      <Line type="monotone" dataKey="nav" stroke="#4f46e5" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No historical data available</div>
                )}
              </div>
            </div>
          )}

          {type === 'fd' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{asset.bankName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fixed Deposit &bull; {asset.status?.toUpperCase()}</div>
              </div>
              
              <div className="asset-details-grid">
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Principal Amount</div><div style={{ fontSize: 15, fontWeight: 600 }}>{formatCurrency(asset.principalAmount)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Interest Rate</div><div style={{ fontSize: 15, fontWeight: 600 }}>{asset.interestRate}%</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Value</div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(currentFdValue)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Maturity Amount</div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(asset.maturityAmount)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Compounding</div><div style={{ fontSize: 15, fontWeight: 500, textTransform: 'capitalize' }}>{asset.compounding || asset.compoundingFrequency || '-'}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start Date</div><div style={{ fontSize: 15, fontWeight: 500 }}>{formatDate(asset.startDate)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Maturity Date</div><div style={{ fontSize: 15, fontWeight: 500 }}>{formatDate(asset.maturityDate)}</div></div>
                 {asset.fdNumber && <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>FD Number</div><div style={{ fontSize: 15, fontWeight: 500 }}>{asset.fdNumber}</div></div>}
              </div>
              
              {asset.notes && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{asset.notes}</div>
                </div>
              )}

              <div style={{ marginTop: 10, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 15 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14}/> Value Projection</div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={40} tickFormatter={v => v>=1000 ? `${v/1000}k` : v} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelStyle={{ color: '#64748b', fontSize: 12 }} formatter={v => formatCurrency(v)} />
                      <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                      {closestFdPoint && (
                        <ReferenceDot
                          x={closestFdPoint.date}
                          y={closestFdPoint.value}
                          r={5}
                          fill="var(--accent)"
                          stroke="#fff"
                          strokeWidth={2}
                          isFront={true}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Projection not available</div>
                )}
              </div>
            </div>
          )}

          {type === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{asset.symbol}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Direct Equity &bull; {asset.exchange?.toUpperCase()}</div>
              </div>
              
              <div className="asset-details-grid">
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quantity</div><div style={{ fontSize: 15, fontWeight: 600 }}>{asset.holdingQuantity}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Avg. Buy Price</div><div style={{ fontSize: 15, fontWeight: 600 }}>{formatCurrency(asset.avgBuyPrice)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Current Price</div><div style={{ fontSize: 15, fontWeight: 600, color: displayStockPrice >= asset.avgBuyPrice ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(displayStockPrice)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Value</div><div style={{ fontSize: 15, fontWeight: 600, color: displayStockPrice >= asset.avgBuyPrice ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(displayStockPrice * asset.holdingQuantity)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Holding Period</div><div style={{ fontSize: 15, fontWeight: 500 }}>{stockMetrics?.text || '-'}</div></div>
                 <div title="Compound Annual Growth Rate"><div style={{ fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px dashed #ccc', display: 'inline-block', cursor: 'help' }}>Est. CAGR</div><div style={{ fontSize: 15, fontWeight: 600, color: stockMetrics?.cagr >= 0 ? 'var(--success)' : 'var(--danger)' }}>{stockMetrics?.cagr > 0 ? '+' : ''}{stockMetrics?.cagr?.toFixed(2)}%</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Invested</div><div style={{ fontSize: 15, fontWeight: 500 }}>{formatCurrency(asset.totalInvested)}</div></div>
                 <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Sold</div><div style={{ fontSize: 15, fontWeight: 500 }}>{formatCurrency(asset.totalSold)}</div></div>
              </div>
              
              {asset.notes && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{asset.notes}</div>
                </div>
              )}

              <div style={{ marginTop: 10, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: 15 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 15, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14}/> 6M Price History</div>
                {loadingChart ? (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{width: 20, height: 20}} /></div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} minTickGap={30} />
                      <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} width={40} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} labelStyle={{ color: '#64748b', fontSize: 12 }} formatter={v => `₹${v}`} />
                      <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No historical data available</div>
                )}
              </div>
            </div>
          )}

        </div>
        <div className="modal-footer" style={{ borderTop: 'none', marginTop: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>Close Details</button>
        </div>
      </div>
    </div>
  );
}
