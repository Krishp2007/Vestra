import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/helpers';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b'];

const AssetAllocationPie = React.memo(({ pieData, innerRadius = 55, outerRadius = 85, height = 200, emptyState }) => {
  if (!pieData || pieData.length === 0) {
    if (emptyState) return emptyState;
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-text">Add investments to see allocation</div>
      </div>
    );
  }

  return (
    <div className="pie-container">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={4}
            dataKey="value"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
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
      <div style={{ flex: 1 }}>
        {pieData.map((item, i) => (
          <div
            key={item.name}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '6px 8px', borderRadius: 8 }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{item.name}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default AssetAllocationPie;
