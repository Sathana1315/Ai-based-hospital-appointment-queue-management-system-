import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';
import { SkeletonTable } from '../components/Skeleton';
import QueueStats from '../components/QueueStats';
import axios from 'axios';
import {
  Check, Calendar, Clock, RefreshCw, XCircle,
  Stethoscope, UserPlus, Activity, Users, ChevronRight
} from 'lucide-react';

const ReceptionistDashboard = () => {
  const { API_BASE_URL } = useAuth();
  const { showToast } = useToast();
  const { lastMessage } = useWebSocket();

  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests]   = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [loading, setLoading]     = useState(true);

  // Suggest / Reject state
  const [activeSuggestId, setActiveSuggestId] = useState(null);
  const [suggestedSlot, setSuggestedSlot]     = useState('');
  const [activeRejectId, setActiveRejectId]   = useState(null);
  const [rejectReason, setRejectReason]       = useState('');

  // Walk-in state
  const [walkInName, setWalkInName]     = useState('');
  const [walkInDoctor, setWalkInDoctor] = useState('');
  const [walkInHospital, setWalkInHospital] = useState('');
  const [walkInNotes, setWalkInNotes]   = useState('');
  const [walkInLoading, setWalkInLoading] = useState(false);

  // Queue monitor
  const [queueData, setQueueData]       = useState({});

  const refreshRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'QUEUE_UPDATE' || lastMessage.type === 'DOCTOR_STATUS_UPDATE') {
        fetchData();
      }
    }
  }, [lastMessage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, docRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/appointments/requests`),
        axios.get(`${API_BASE_URL}/doctors`),
      ]);
      setRequests(reqRes.data);
      setDoctors(docRes.data);

      // Fetch live queue for each doctor
      const queueMap = {};
      await Promise.all(docRes.data.map(async (doc) => {
        try {
          const qRes = await axios.get(`${API_BASE_URL}/queues/live/${doc.id}`);
          queueMap[doc.id] = qRes.data;
        } catch { /* silent */ }
      }));
      setQueueData(queueMap);
    } catch (err) {
      console.error('Receptionist data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ──────────────────────────────────────────

  const handleApprove = async (reqId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/appointments/approve/${reqId}`);
      showToast(`Approved! Queue #${res.data.queue_number} assigned.`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Approval failed.', 'error');
    }
  };

  const handleReject = async (reqId) => {
    if (!rejectReason.trim()) {
      showToast('Please provide a rejection reason.', 'warning');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/appointments/reject/${reqId}`, { reason: rejectReason });
      showToast('Request rejected and patient notified.', 'info');
      setActiveRejectId(null);
      setRejectReason('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Rejection failed.', 'error');
    }
  };

  const handleSuggest = async (reqId) => {
    if (!suggestedSlot) return;
    try {
      await axios.post(`${API_BASE_URL}/appointments/suggest/${reqId}`, {
        suggested_slots: [new Date(suggestedSlot).toISOString()]
      });
      showToast('Alternate slot suggested to patient.', 'success');
      setActiveSuggestId(null);
      setSuggestedSlot('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to send suggestion.', 'error');
    }
  };

  const handleDoctorStatusChange = async (docId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/doctors/status?doctor_id=${docId}`, { status: newStatus });
      showToast(`Doctor status → ${newStatus}`, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Status update failed.', 'error');
    }
  };

  const handleWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInName.trim() || !walkInDoctor) {
      showToast('Patient name and doctor are required.', 'warning');
      return;
    }
    setWalkInLoading(true);
    try {
      const doc = doctors.find(d => d.id === walkInDoctor);
      const res = await axios.post(`${API_BASE_URL}/appointments/walk-in`, {
        patient_name: walkInName,
        doctor_id: walkInDoctor,
        hospital_id: doc?.hospital_id || '',
        notes: walkInNotes
      });
      showToast(`Walk-in token #${res.data.queue_number} created for ${walkInName}!`, 'success');
      setWalkInName('');
      setWalkInDoctor('');
      setWalkInNotes('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Walk-in creation failed.', 'error');
    } finally {
      setWalkInLoading(false);
    }
  };

  const handleCallNext = async (docId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/queues/next?doctor_id=${docId}`);
      showToast(res.data.message, 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not advance queue.', 'error');
    }
  };

  // ── Derived data ──────────────────────────────────────
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const otherRequests   = requests.filter(r => r.status !== 'PENDING');

  const STATUS_STYLE = {
    PENDING:   { bg: 'rgba(245,158,11,0.08)', text: 'var(--color-warning)' },
    APPROVED:  { bg: 'rgba(16,185,129,0.08)', text: 'var(--color-success)' },
    SUGGESTED: { bg: 'rgba(6,182,212,0.08)',  text: 'var(--color-accent)' },
    REJECTED:  { bg: 'rgba(239,68,68,0.08)',  text: 'var(--color-danger)' },
  };

  const TABS = [
    { key: 'requests',   icon: <Calendar size={14} />,   label: `Requests (${pendingRequests.length})` },
    { key: 'attendance', icon: <Users size={14} />,       label: 'Attendance' },
    { key: 'walkin',     icon: <UserPlus size={14} />,    label: 'Walk-In' },
    { key: 'queue',      icon: <Activity size={14} />,    label: 'Queue Monitor' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            Receptionist <span className="text-gradient">Portal</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage appointments, attendance, walk-ins, and queue flow.
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {[
          { label: 'Pending', value: pendingRequests.length, color: 'var(--color-warning)' },
          { label: 'Available Drs', value: doctors.filter(d => d.status === 'AVAILABLE').length, color: 'var(--color-success)' },
          { label: 'Busy Drs', value: doctors.filter(d => d.status === 'BUSY').length, color: 'var(--color-danger)' },
          { label: 'Total Requests', value: requests.length, color: 'var(--color-accent)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="stat-number" style={{ color: s.color }}>{s.value}</p>
            <p className="stat-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Appointment Requests ── */}
      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Pending */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              Pending Requests ({pendingRequests.length})
            </h4>
            {loading ? <SkeletonTable rows={3} /> : pendingRequests.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>No pending requests.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pendingRequests.map(req => (
                  <div key={req.id} className="glass-card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>Patient: {req.patient_name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          Doctor: <span style={{ color: 'var(--color-accent)' }}>{req.doctor_name}</span> ({req.department})
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{req.hospital_name}</p>
                        {req.notes && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, padding: '6px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: 6 }}>Notes: {req.notes}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Requested Slot</p>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: 2 }}>{new Date(req.requested_slot).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Doctor live status check */}
                    {(() => {
                      const doc = doctors.find(d => d.id === req.doctor_id);
                      if (doc && doc.status !== 'AVAILABLE') {
                        return (
                          <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: '0.76rem', color: 'var(--color-danger)' }}>
                            ⚠ Doctor is currently {doc.status}
                          </div>
                        );
                      }
                    })()}

                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button onClick={() => handleApprove(req.id)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                        <Check size={13} /> Approve
                      </button>
                      <button onClick={() => { setActiveSuggestId(activeSuggestId === req.id ? null : req.id); setActiveRejectId(null); }} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                        <Calendar size={13} /> Suggest Slot
                      </button>
                      <button onClick={() => { setActiveRejectId(activeRejectId === req.id ? null : req.id); setActiveSuggestId(null); }} className="btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                        <XCircle size={13} /> Reject
                      </button>
                    </div>

                    {/* Suggest form */}
                    {activeSuggestId === req.id && (
                      <div style={{ marginTop: 10, padding: '12px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 8 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Suggest New Date/Time:</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input type="datetime-local" className="form-input" style={{ padding: '8px 12px' }} value={suggestedSlot} onChange={e => setSuggestedSlot(e.target.value)} />
                          <button onClick={() => handleSuggest(req.id)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.8rem', flexShrink: 0 }}>Send</button>
                        </div>
                      </div>
                    )}

                    {/* Reject form */}
                    {activeRejectId === req.id && (
                      <div style={{ marginTop: 10, padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Rejection Reason:</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input type="text" className="form-input" placeholder="e.g. Doctor unavailable on this date" style={{ padding: '8px 12px' }} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                          <button onClick={() => handleReject(req.id)} className="btn-danger" style={{ padding: '8px 14px', fontSize: '0.8rem', flexShrink: 0 }}>Confirm</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              Request History ({otherRequests.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {otherRequests.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No reviewed requests yet.</p>
              ) : otherRequests.map(req => {
                const s = STATUS_STYLE[req.status] || {};
                return (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{req.patient_name} → {req.doctor_name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(req.requested_slot).toLocaleString()}</p>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: s.text, background: s.bg, padding: '3px 10px', borderRadius: 20 }}>{req.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Attendance Manager ── */}
      {activeTab === 'attendance' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            Doctor Attendance Manager
          </h4>
          {loading ? <SkeletonTable rows={4} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {doctors.map(doc => {
                const statusClass = { AVAILABLE: 'status-available', BUSY: 'status-busy', OFFLINE: 'status-offline' }[doc.status];
                return (
                  <div key={doc.id} className="glass-card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="doctor-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>{doc.name?.charAt(0)}</div>
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{doc.name}</p>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{doc.hospital_name} · {doc.department}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`status-badge ${statusClass}`}>{doc.status}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['AVAILABLE', 'BUSY', 'OFFLINE'].filter(s => s !== doc.status).map(s => (
                          <button key={s} onClick={() => handleDoctorStatusChange(doc.id, s)}
                            style={{
                              fontSize: '0.68rem', padding: '4px 10px',
                              border: `1px solid ${s === 'AVAILABLE' ? 'rgba(16,185,129,0.3)' : s === 'BUSY' ? 'rgba(239,68,68,0.3)' : 'rgba(100,116,139,0.3)'}`,
                              borderRadius: 8, background: 'transparent',
                              color: s === 'AVAILABLE' ? 'var(--color-success)' : s === 'BUSY' ? 'var(--color-danger)' : 'var(--text-muted)',
                              cursor: 'pointer', fontWeight: 600, transition: 'var(--transition-smooth)'
                            }}>
                            → {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Walk-In Token ── */}
      {activeTab === 'walkin' && (
        <div className="glass-panel" style={{ padding: '28px', maxWidth: 520 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10, marginBottom: 20 }}>
            Create Walk-In Token
          </h4>
          <form onSubmit={handleWalkIn} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Patient Name *</label>
              <input type="text" className="form-input" placeholder="e.g. John Doe" value={walkInName} onChange={e => setWalkInName(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Doctor *</label>
              <select className="form-input" value={walkInDoctor} onChange={e => setWalkInDoctor(e.target.value)} required>
                <option value="">-- Choose Available Doctor --</option>
                {doctors.filter(d => d.status === 'AVAILABLE').map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.department} · {d.hospital_name})</option>
                ))}
              </select>
              {doctors.filter(d => d.status === 'AVAILABLE').length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>No doctors are currently AVAILABLE. Update attendance first.</p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Notes (optional)</label>
              <textarea className="form-input" rows={2} placeholder="Reason for visit..." value={walkInNotes} onChange={e => setWalkInNotes(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '13px', marginTop: 4 }} disabled={walkInLoading}>
              <UserPlus size={16} /> {walkInLoading ? 'Creating...' : 'Generate Walk-In Token'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB: Queue Monitor ── */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Live Queue — All Doctors</h4>
          {loading ? <SkeletonTable rows={4} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {doctors.map(doc => {
                const q = queueData[doc.id];
                const waiting   = q?.waiting_count || 0;
                const completed = q?.completed_count || 0;
                const serving   = q?.serving_now;
                return (
                  <div key={doc.id} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{doc.name}</p>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{doc.department}</p>
                      </div>
                      <span className={`status-badge status-${doc.status.toLowerCase()}`}>{doc.status}</span>
                    </div>

                    <QueueStats queue={q} />

                    {serving && (
                      <div style={{ padding: '8px 12px', background: 'rgba(6,182,212,0.07)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Serving: <strong style={{ color: 'var(--text-primary)' }}>{serving.patient_name}</strong>
                      </div>
                    )}

                    <button onClick={() => handleCallNext(doc.id)} className="btn-secondary" style={{ fontSize: '0.78rem', padding: '7px 12px', justifyContent: 'center' }} disabled={waiting === 0}>
                      <ChevronRight size={13} /> Call Next
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceptionistDashboard;
