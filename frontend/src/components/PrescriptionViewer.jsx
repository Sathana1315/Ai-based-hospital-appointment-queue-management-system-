import React from 'react';
import { X, Printer, Download, Share2, Paperclip } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PrescriptionViewer = ({ record, onClose }) => {
  const { API_BASE_URL } = useAuth();
  if (!record) return null;
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)',
      zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-color)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Digital Prescription</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }} id="prescription-content">
          <div style={{ textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.05)', paddingBottom: 16 }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-accent)' }}>Q-Med General Hospital</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>123 Health Ave, Medical District</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <div>
              <p><strong>Doctor:</strong> Dr. {record.doctor_name}</p>
              <p><strong>Date:</strong> {new Date(record.date).toLocaleDateString()}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p><strong>Patient ID:</strong> {record.patient_id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: 8 }}>Diagnosis / Clinical Notes</h4>
            <p style={{ fontSize: '0.95rem' }}>{record.notes}</p>
          </div>

          <div>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: 12 }}>Rx - Medicines</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {record.prescriptions.split(', ').map((med, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'rgba(16,185,129,0.05)', borderLeft: '3px solid var(--color-success)', borderRadius: '0 8px 8px 0' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>{med}</span>
                </div>
              ))}
            </div>
          </div>

          {record.attachment_url && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <Paperclip size={18} style={{ color: 'var(--color-accent)' }} />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Attached Medical File</p>
                <a href={API_BASE_URL.replace('/api', '') + record.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
                  View Attachment
                </a>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handlePrint} className="btn-secondary" style={{ padding: '8px 16px' }}><Printer size={16} /> Print</button>
          <button onClick={handlePrint} className="btn-primary" style={{ padding: '8px 16px' }}><Download size={16} /> Download PDF</button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionViewer;
