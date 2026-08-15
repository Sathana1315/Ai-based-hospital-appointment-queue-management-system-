import React from 'react';
import { Sparkles, Calendar, Clock } from 'lucide-react';

const RecommendationCard = ({ recommendations, onSelect, selectedSlot }) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(139,92,246,0.3)', background: 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(139,92,246,0.1))' }}>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: '#c4b5fd' }}>
        <Sparkles size={18} />
        AI Recommended Slots
      </h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', marginTop: '4px' }}>
        Based on doctor's schedule and shortest waiting time.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recommendations.map((rec, idx) => {
          const date = new Date(rec.datetime);
          const isSelected = selectedSlot === rec.datetime;
          return (
            <div 
              key={idx}
              onClick={() => onSelect(rec.datetime)}
              className="glass-card"
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: isSelected ? '1.5px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s'
              }}
            >
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#a78bfa" /> {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  <Clock size={14} color="#a78bfa" style={{ marginLeft: '6px' }} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                  "{rec.reason}"
                </p>
              </div>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: isSelected ? '5px solid #8b5cf6' : '1px solid var(--text-muted)', background: 'transparent' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendationCard;
