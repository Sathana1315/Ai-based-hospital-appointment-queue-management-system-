import React from 'react';
import { Users, CheckCircle, Clock, Activity } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${color}` }}>
    <div style={{ padding: '12px', borderRadius: '12px', background: `${color}15`, color: color }}>
      <Icon size={24} />
    </div>
    <div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
      <p style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  </div>
);

const QueueStats = ({ queue }) => {
  if (!queue) return null;

  const total = queue.active_appointments?.length || 0;
  const completed = queue.completed_count || 0;
  const waiting = queue.waiting_count || 0;
  const avgWait = queue.estimated_wait_minutes || 0;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
      <StatCard title="Total Patients" value={total} icon={Users} color="#3b82f6" />
      <StatCard title="Waiting" value={waiting} icon={Activity} color="#f59e0b" />
      <StatCard title="Completed Today" value={completed} icon={CheckCircle} color="#10b981" />
      <StatCard title="Avg Wait" value="~15m" icon={Clock} color="#8b5cf6" />
      
      {/* Progress Bar for Completion */}
      <div className="glass-card" style={{ padding: '20px', gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Queue Completion</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>{percentage}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.5s ease' }}></div>
        </div>
      </div>
    </div>
  );
};

export default QueueStats;
