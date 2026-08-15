import React from 'react';

// A lightweight custom bar chart using pure HTML/CSS for Admin Dashboard
const AnalyticsChart = ({ data, title, color = "var(--color-accent)" }) => {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value || d.appointments || d.revenue || d.patients || 0));

  return (
    <div className="glass-panel" style={{ padding: '20px', flex: 1, minWidth: 300 }}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: '20px' }}>{title}</h4>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 200, gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
        {data.map((item, idx) => {
          const val = item.value || item.appointments || item.revenue || item.patients || 0;
          const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, group: 'true' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.8 }}>{val}</div>
              <div style={{
                width: '100%',
                height: `${heightPct}%`,
                background: color,
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.5s ease',
                opacity: 0.85
              }}></div>
            </div>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', gap: 10, paddingTop: 10 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
            {item.name.substring(0, 5)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsChart;
