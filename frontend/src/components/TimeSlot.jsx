import React from 'react';

const TimeSlot = ({ time, status, selected, onClick }) => {
  const isAvailable = status === 'AVAILABLE';
  const isBooked = status === 'BOOKED';
  const isLunch = status === 'LUNCH';
  const isBlocked = status === 'BLOCKED';

  let bg = 'rgba(255,255,255,0.05)';
  let color = 'var(--text-secondary)';
  let border = '1px solid rgba(255,255,255,0.1)';
  let cursor = 'not-allowed';

  if (isAvailable) {
    bg = selected ? 'var(--color-accent)' : 'rgba(16,185,129,0.1)';
    color = selected ? '#fff' : 'var(--color-success)';
    border = selected ? '1px solid var(--color-accent)' : '1px solid rgba(16,185,129,0.3)';
    cursor = 'pointer';
  } else if (isBooked) {
    bg = 'rgba(245,158,11,0.1)';
    color = 'var(--color-warning)';
    border = '1px solid rgba(245,158,11,0.3)';
  } else if (isLunch || isBlocked) {
    bg = 'rgba(239,68,68,0.1)';
    color = 'var(--color-danger)';
    border = '1px solid rgba(239,68,68,0.3)';
  }

  return (
    <div
      onClick={() => isAvailable && onClick()}
      style={{
        padding: '8px',
        borderRadius: '8px',
        background: bg,
        color: color,
        border: border,
        textAlign: 'center',
        cursor: cursor,
        fontSize: '0.85rem',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        opacity: isAvailable ? 1 : 0.7
      }}
    >
      {time}
    </div>
  );
};

export default TimeSlot;
