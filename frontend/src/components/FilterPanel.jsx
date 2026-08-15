import React from 'react';

const FilterPanel = ({ filterOptions, currentFilter, onFilterChange, onReset }) => {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filter by Status:</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              borderRadius: '20px',
              background: currentFilter === opt.value ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
              color: currentFilter === opt.value ? '#fff' : 'var(--text-secondary)',
              border: currentFilter === opt.value ? '1px solid var(--color-accent)' : '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {currentFilter !== 'ALL' && (
        <button onClick={onReset} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer', marginLeft: 10 }}>
          Clear Filter
        </button>
      )}
    </div>
  );
};

export default FilterPanel;
