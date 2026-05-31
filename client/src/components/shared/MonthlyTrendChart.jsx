import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/helpers';

const MonthlyTrendChart = React.memo(({ monthlyData, chartRange = 6, setChartRange, height = 250, emptyState }) => {
  const hasData = monthlyData && monthlyData.slice(-chartRange).some(m => m.total > 0);

  if (!hasData) {
    if (emptyState) return emptyState;
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📈</div>
        <div className="empty-state-text">Investment data will appear here</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={monthlyData.slice(-chartRange)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 100000 ? `${v / 100000}L` : v >= 1000 ? `${v / 1000}K` : v}
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
                  backdropFilter: 'blur(8px)',
                  zIndex: 100
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
  );
});

export default MonthlyTrendChart;
