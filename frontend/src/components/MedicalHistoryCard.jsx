import React from 'react';
import { FileText, Calendar, User, Download, Share2 } from 'lucide-react';

const MedicalHistoryCard = ({ record, onViewPrescription }) => {
  const dateStr = new Date(record.date).toLocaleDateString();
  
  return (
    <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          <Calendar size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--color-accent)' }} />
          {dateStr}
        </p>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 12 }}>COMPLETED</span>
      </div>
      
      <div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <User size={12} style={{ display: 'inline', marginRight: 4 }} /> Dr. {record.doctor_name}
        </p>
        <p style={{ fontSize: '0.85rem', marginTop: 8, fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: 6 }}>
          "{record.notes}"
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={() => onViewPrescription(record)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.8rem' }}>
          <FileText size={14} /> View Prescription
        </button>
      </div>
    </div>
  );
};

export default MedicalHistoryCard;
