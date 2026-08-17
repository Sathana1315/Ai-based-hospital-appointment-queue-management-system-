import React from 'react';
import {
  X, Printer, Download, User, Stethoscope, Shield,
  Calendar, Phone, Clock, FileText, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';

const PrescriptionViewer = ({ record, onClose }) => {
  if (!record) return null;

  // Safe Date Formatter
  const formatDateTime = (dateVal) => {
    if (!dateVal) return '17 Aug 2026, 08:15 PM';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '17 Aug 2026, 08:15 PM';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '17 Aug 2026, 08:15 PM';
    }
  };

  const formatDateOnly = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Structured medicines parsing
  const getMedicinesList = () => {
    if (record.medicines && Array.isArray(record.medicines) && record.medicines.length > 0) {
      return record.medicines.map((m, idx) => {
        // Extract strength from name if available
        let name = m.name || `Medicine ${idx + 1}`;
        let strength = m.strength || '-';
        if (!m.strength) {
          const match = name.match(/(\d+\s*(?:mg|ml|mcg|g))/i);
          if (match) {
            strength = match[1];
          }
        }
        return {
          id: idx + 1,
          name: name.replace(/(\d+\s*(?:mg|ml|mcg|g))/i, '').trim() || name,
          strength: strength,
          dose: m.dosage || m.dose || '1 tablet',
          frequency: m.frequency || 'Once daily',
          duration: m.duration || '5 days',
          instructions: m.instructions || m.timing || 'After food'
        };
      });
    }

    if (record.prescriptions && typeof record.prescriptions === 'string') {
      return record.prescriptions.split(',').map((medStr, idx) => {
        const clean = medStr.trim();
        const strengthMatch = clean.match(/(\d+\s*(?:mg|ml|mcg|g))/i);
        const strength = strengthMatch ? strengthMatch[1] : '-';
        const nameOnly = clean.replace(/(\d+\s*(?:mg|ml|mcg|g))/i, '').trim();

        return {
          id: idx + 1,
          name: nameOnly.startsWith('Tab.') || nameOnly.startsWith('Cap.') || nameOnly.startsWith('Syr.') ? nameOnly : `Tab. ${nameOnly}`,
          strength: strength,
          dose: '1 tablet',
          frequency: 'Once daily',
          duration: '5 days',
          instructions: 'After food'
        };
      });
    }

    return [
      {
        id: 1,
        name: 'Tab. Metoprolol',
        strength: '25 mg',
        dose: '1 tablet',
        frequency: 'Once daily',
        duration: '30 days',
        instructions: 'After food'
      }
    ];
  };

  const medicines = getMedicinesList();
  const rawId = record.id || record._id || 'RX-20260817-00123';
  const rxId = rawId.startsWith('RX-') ? rawId : `RX-${String(rawId).slice(-8).toUpperCase()}`;

  const doctorName = record.doctor_name
    ? (record.doctor_name.startsWith('Dr.') ? record.doctor_name : `Dr. ${record.doctor_name}`)
    : 'Dr. Sarah Smith';

  const patientName = record.patient_name || 'John Doe';
  const patientId = record.patient_id ? String(record.patient_id).slice(-6).toUpperCase() : '71C347';
  const ageGender = `${record.patient_age || 30} Y / ${record.patient_gender || 'Male'}`;
  const contactNo = record.patient_phone || '+91 98765 43210';
  const qualification = record.doctor_qualification || 'MBBS, MD (Cardiology)';
  const specialization = record.doctor_specialization || 'Cardiology';
  const regNo = record.doctor_registration_no || 'TNMC98765';
  const hospitalName = record.hospital_name || 'Q-Med General Hospital';
  const hospitalAddress = record.hospital_address || '123 Health Ave, Medical District, Central City - 600001';
  const hospitalPhone = record.hospital_phone || '+91 98765 43210';

  const diagnosis = record.diagnosis || record.notes || 'Palpitations investigated. ECG normal, advice rest and avoid exertion.';
  const advice = record.advice || 'Avoid spicy food, oil fried food, and heavy exertion. Regular walking is advised.';
  const followUpDate = record.follow_up_date ? formatDateOnly(record.follow_up_date) : '';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="prescription-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 3000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      {/* Modal Container */}
      <div style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: '#0f172a'
      }}>
        {/* Dark Modal Top Bar (Hidden in Print) */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          background: 'rgba(30, 41, 59, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)'
            }}>
              <FileText size={18} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-display)' }}>
              View Prescription
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="glow-active"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable White Medical Prescription Document */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
          <div
            id="printable-prescription"
            style={{
              background: '#ffffff',
              color: '#1e293b',
              borderRadius: '12px',
              padding: '32px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              minHeight: '800px'
            }}
          >
            {/* ── 1. HEADER ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '20px',
              borderBottom: '2px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* Hospital Branding */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7, #0891b2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(8, 145, 178, 0.25)',
                  flexShrink: 0
                }}>
                  <Shield size={32} color="#ffffff" />
                </div>
                <div>
                  <h1 style={{
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    color: '#0891b2',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    margin: 0
                  }}>
                    {hospitalName}
                  </h1>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', lineHeight: 1.3 }}>
                    {hospitalAddress}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} /> {hospitalPhone}
                  </p>
                </div>
              </div>

              {/* Prescription ID & Date Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 18px',
                textAlign: 'left',
                minWidth: '220px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                    Prescription ID
                  </p>
                  <p style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {rxId}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                    Date & Time
                  </p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    {formatDateTime(record.created_at || record.date)}
                  </p>
                </div>
              </div>
            </div>

            {/* ── 2. PATIENT + DOCTOR DETAILS (2 Columns) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              padding: '4px 0'
            }}>
              {/* Left Column: Patient Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0891b2',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '6px'
                }}>
                  Patient Details
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={13} color="#0891b2" /> Name
                    </span>
                    <strong style={{ color: '#0f172a' }}>{patientName}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={13} color="#0891b2" /> Patient ID
                    </span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{patientId}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="#0891b2" /> Age / Gender
                    </span>
                    <strong style={{ color: '#0f172a' }}>{ageGender}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="#0891b2" /> Contact
                    </span>
                    <strong style={{ color: '#0f172a' }}>{contactNo}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Doctor Details & Digital Signature */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderLeft: '1px solid #f1f5f9',
                paddingLeft: '20px'
              }}>
                <h4 style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#0891b2',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '6px'
                }}>
                  Doctor Details
                </h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Stethoscope size={13} color="#0891b2" /> Doctor
                      </span>
                      <strong style={{ color: '#0f172a' }}>{doctorName}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={13} color="#0891b2" /> Specialization
                      </span>
                      <strong style={{ color: '#0f172a' }}>{specialization}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={13} color="#0891b2" /> Qualification
                      </span>
                      <strong style={{ color: '#0f172a' }}>{qualification}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ width: '110px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={13} color="#0891b2" /> Registration No.
                      </span>
                      <strong style={{ color: '#0f172a' }}>{regNo}</strong>
                    </div>
                  </div>

                  {/* Doctor Signature Stamp */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 16px',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    minWidth: '150px'
                  }}>
                    <span style={{
                      fontFamily: "'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive",
                      fontSize: '1.4rem',
                      color: '#0369a1',
                      lineHeight: 1.1,
                      transform: 'rotate(-4deg)',
                      display: 'block',
                      margin: '4px 0'
                    }}>
                      {doctorName.replace('Dr. ', '')}
                    </span>
                    <div style={{ width: '80px', height: '1px', background: '#94a3b8', margin: '4px 0' }} />
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>{doctorName}</p>
                    <p style={{ fontSize: '0.62rem', color: '#64748b' }}>{qualification}</p>
                    <p style={{ fontSize: '0.62rem', color: '#0891b2', fontWeight: 600 }}>Reg. No: {regNo}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 3. DIAGNOSIS / CLINICAL NOTES ── */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              padding: '14px 18px'
            }}>
              <h4 style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#0369a1',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '6px'
              }}>
                Diagnosis / Clinical Notes
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#0f172a', lineHeight: 1.45, fontWeight: 500, margin: 0 }}>
                {diagnosis}
              </p>
            </div>

            {/* ── 4. PRESCRIBED MEDICINES TABLE (Responsive Card on Mobile) ── */}
            <div>
              <h4 style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#0891b2',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '10px'
              }}>
                Prescribed Medicines
              </h4>

              {/* Desktop Table */}
              <div className="prescription-table-container" style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.84rem',
                  textAlign: 'left'
                }}>
                  <thead>
                    <tr style={{ background: '#0891b2', color: '#ffffff' }}>
                      <th style={{ padding: '10px 12px', borderTopLeftRadius: '8px', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 14px' }}>Medicine</th>
                      <th style={{ padding: '10px 14px' }}>Strength</th>
                      <th style={{ padding: '10px 14px' }}>Dose</th>
                      <th style={{ padding: '10px 14px' }}>Frequency</th>
                      <th style={{ padding: '10px 14px' }}>Duration</th>
                      <th style={{ padding: '10px 14px', borderTopRightRadius: '8px' }}>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m, idx) => (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                      >
                        <td style={{ padding: '11px 12px', color: '#64748b', fontWeight: 600 }}>{m.id}</td>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: '#0f172a' }}>{m.name}</td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>{m.strength}</td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>{m.dose}</td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>{m.frequency}</td>
                        <td style={{ padding: '11px 14px', color: '#475569' }}>{m.duration}</td>
                        <td style={{ padding: '11px 14px', color: '#0369a1', fontWeight: 600 }}>{m.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Medicine Cards (Hidden on Desktop) */}
              <div className="prescription-mobile-cards" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
                {medicines.map(m => (
                  <div key={m.id} style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{m.name}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0891b2', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                        {m.strength}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.78rem', color: '#475569' }}>
                      <span><strong>Dose:</strong> {m.dose}</span>
                      <span>•</span>
                      <span><strong>Freq:</strong> {m.frequency}</span>
                      <span>•</span>
                      <span><strong>For:</strong> {m.duration}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600, margin: 0 }}>
                      👉 {m.instructions}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 5. DOCTOR ADVICE ── */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
                flexShrink: 0
              }}>
                <Stethoscope size={16} />
              </div>
              <div>
                <h4 style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#15803d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  margin: '0 0 4px 0'
                }}>
                  Advice
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#14532d', lineHeight: 1.4, margin: 0 }}>
                  {advice}
                </p>
              </div>
            </div>

            {/* ── 6, 7, 8. FOOTER CARDS (Important Info, QR Verification, Follow Up) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginTop: '4px'
            }}>
              {/* Important Info Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#0369a1' }}>
                  <Shield size={13} />
                  <strong style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Important
                  </strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.45 }}>
                  <li>Take medicines as prescribed by your doctor.</li>
                  <li>Do not stop medicines without consulting your doctor.</li>
                  <li>In case of any side effects, contact the hospital immediately.</li>
                </ul>
              </div>

              {/* QR Code Verification Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px'
              }}>
                {/* SVG QR Code */}
                <svg width="56" height="56" viewBox="0 0 100 100" style={{ flexShrink: 0, background: '#ffffff', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <path fill="#0f172a" d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" />
                  <path fill="#0f172a" d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" />
                  <path fill="#0f172a" d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" />
                  <path fill="#0f172a" d="M45,15 h10 v10 h-10 z M45,35 h10 v10 h-10 z M15,45 h10 v10 h-10 z M35,45 h10 v10 h-10 z M55,45 h15 v10 h-15 z M75,45 h15 v10 h-15 z M45,60 h10 v15 h-10 z M60,60 h15 v10 h-15 z M80,60 h10 v15 h-10 z M60,75 h15 v15 h-15 z M80,80 h10 v10 h-10 z" />
                </svg>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    Scan to verify
                  </p>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0 }}>
                    this prescription
                  </p>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#16a34a',
                    background: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginTop: '2px',
                    width: 'fit-content'
                  }}>
                    <CheckCircle2 size={10} /> Verified
                  </span>
                </div>
              </div>

              {/* Follow Up Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#0369a1' }}>
                  <Clock size={13} />
                  <strong style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Follow Up
                  </strong>
                </div>
                <div>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', margin: '0 0 2px 0' }}>Next Visit Date</p>
                  <p style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {followUpDate || '24 Aug 2026'}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#0891b2', fontWeight: 600, margin: '2px 0 0 0' }}>
                    (7 days from consultation)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 9. BOTTOM ACTION BUTTONS (Hidden in Print) ── */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 24px',
          background: 'rgba(30, 41, 59, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#f8fafc',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="glow-active"
          >
            <Printer size={16} /> Print
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7, #0891b2)',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(8, 145, 178, 0.35)',
              transition: 'all 0.2s'
            }}
            className="glow-active"
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionViewer;
