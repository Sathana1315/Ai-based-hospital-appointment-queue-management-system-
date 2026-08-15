import React from 'react';
import { Activity, Clock } from 'lucide-react';

const QueueProgress = ({ myNum, servingNum, estWait, ahead }) => {
  const isCurrent = servingNum === myNum;
  const isDone = servingNum > myNum;
  
  const percentage = ahead === 0 ? 100 : Math.max(5, 100 - (ahead * 10)); // simple visual trick

  if (isCurrent) {
    return (
      <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16,185,129,0.15)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', marginTop: '16px' }}>
        <p style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div className="pulse-dot" style={{ background: 'var(--color-success)', width: 8, height: 8, borderRadius: '50%' }}></div>
          It's your turn!
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-success)', opacity: 0.8, marginTop: '4px' }}>Please proceed to the doctor's room.</p>
      </div>
    );
  }

  if (isDone) {
    return (
       <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginTop: '16px' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Consultation Completed</p>
       </div>
    );
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} /> {ahead} patients ahead</span>
        <span style={{ color: 'var(--color-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> ~{estWait} mins</span>
      </div>
      
      <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', position: 'relative', overflow: 'hidden' }}>
         <div style={{ 
           position: 'absolute', top: 0, left: 0, height: '100%', 
           width: `${percentage}%`, 
           background: 'linear-gradient(90deg, var(--color-warning), var(--color-success))',
           transition: 'width 1s ease'
         }}></div>
      </div>
    </div>
  );
};

export default QueueProgress;
