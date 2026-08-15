import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';
import axios from 'axios';
import { SkeletonCard } from '../components/Skeleton';
import QueueStats from '../components/QueueStats';
import {
  User, CheckCircle, Stethoscope, Play, AlertTriangle,
  Clock, Plus, Trash2, Send, RefreshCw, Activity,
  ClipboardList, UserCheck, ChevronRight, FileText, Upload
} from 'lucide-react';

const DoctorDashboard = () => {
  const { user, API_BASE_URL } = useAuth();
  const { showToast } = useToast();
  const { lastMessage } = useWebSocket();

  const [docProfile, setDocProfile]   = useState(null);
  const [docLoading, setDocLoading]   = useState(true);
  const [status, setStatus]           = useState('OFFLINE');
  const [liveQueue, setLiveQueue]     = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [todayAppts, setTodayAppts]   = useState([]);
  const [history, setHistory]         = useState([]);

  // Prescription form
  const [medicines, setMedicines]     = useState([{ name: '', dosage: '', frequency: '' }]);
  const [notes, setNotes]             = useState('');
  const [file, setFile]               = useState(null);
  const [prescribing, setPrescribing] = useState(false);
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState('requests'); // requests | queue | appointments | prescription | history

  // Rejection & Suggestion Modals
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('Doctor unavailable');
  const [customReason, setCustomReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const [suggestDate, setSuggestDate] = useState('');
  const [suggestTime, setSuggestTime] = useState('10:00');
  const [suggestNotes, setSuggestNotes] = useState('');
  const [showSuggestModal, setShowSuggestModal] = useState(false);

  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  useEffect(() => {
    if (docProfile) {
      fetchLiveQueue(docProfile.id);
      fetchTodayAppointments();
      fetchHistory();
      fetchDoctorRequests();
    }
  }, [docProfile]);

  // Listen to websocket for live updates
  useEffect(() => {
    if (lastMessage && docProfile) {
      if (lastMessage.type === 'QUEUE_UPDATE' && lastMessage.doctor_id === docProfile.id) {
        fetchLiveQueue(docProfile.id);
        fetchTodayAppointments();
      } else if (lastMessage.type === 'NEW_APPOINTMENT_REQUEST') {
        fetchDoctorRequests();
        showToast('New Appointment Request received!', 'info');
      }
    }
  }, [lastMessage, docProfile]);

  const fetchDoctorProfile = async () => {
    setDocLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/doctors/me`);
      setDocProfile(res.data);
      setStatus(res.data.status);
    } catch (err) {
      showToast('Could not load your doctor profile.', 'error');
    } finally {
      setDocLoading(false);
    }
  };

  const fetchDoctorRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/appointments/doctor/requests`);
      setDoctorRequests(res.data);
    } catch (err) {
      console.error('Doctor requests fetch error:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApproveRequest = async (reqId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/appointments/approve/${reqId}`);
      showToast(`Appointment Approved! Queue Token #${res.data.queue_number} generated.`, 'success');
      fetchDoctorRequests();
      if (docProfile) fetchLiveQueue(docProfile.id);
      fetchTodayAppointments();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to approve request', 'error');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    const finalReason = rejectReason === 'Other' ? customReason : rejectReason;
    if (!finalReason) {
      showToast('Please specify a rejection reason', 'warning');
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/appointments/reject/${selectedReq.id}`, { reason: finalReason });
      showToast('Appointment Request rejected', 'info');
      setShowRejectModal(false);
      setSelectedReq(null);
      fetchDoctorRequests();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to reject request', 'error');
    }
  };

  const handleSuggestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq || !suggestDate || !suggestTime) {
      showToast('Please select a valid date and time', 'warning');
      return;
    }
    try {
      const suggestedSlotISO = new Date(`${suggestDate}T${suggestTime}:00`).toISOString();
      await axios.post(`${API_BASE_URL}/appointments/suggest/${selectedReq.id}`, {
        suggested_slot: suggestedSlotISO,
        notes: suggestNotes
      });
      showToast('New slot suggestion sent to patient', 'success');
      setShowSuggestModal(false);
      setSelectedReq(null);
      fetchDoctorRequests();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to send slot suggestion', 'error');
    }
  };

  const fetchLiveQueue = async (doctorId) => {
    setQueueLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/queues/live/${doctorId}`);
      setLiveQueue(res.data);
    } catch (err) {
      console.error('Queue fetch error:', err);
    } finally {
      setQueueLoading(false);
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/appointments/list`);
      setTodayAppts(res.data);
    } catch (err) {
      console.error('Appointments fetch error:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/doctors/history`);
      setHistory(res.data);
    } catch (err) {
      console.error('History fetch error:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!docProfile) return;
    try {
      await axios.put(`${API_BASE_URL}/doctors/status`, { status: newStatus });
      setStatus(newStatus);
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update status', 'error');
    }
  };

  const handleCallNext = async () => {
    if (!docProfile) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/queues/next`);
      showToast(res.data.message, 'success');
      fetchLiveQueue(docProfile.id);
      setMedicines([{ name: '', dosage: '', frequency: '' }]);
      setNotes('');
      setActiveTab('prescription');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not call next patient.', 'error');
    }
  };

  const addMedicineRow = () => setMedicines(p => [...p, { name: '', dosage: '', frequency: '' }]);
  const removeMedicineRow = (i) => setMedicines(p => p.filter((_, idx) => idx !== i));
  const handleMedicineChange = (i, field, value) => {
    const updated = [...medicines];
    updated[i][field] = value;
    setMedicines(updated);
  };

  const handlePrescribeSubmit = async (e) => {
    e.preventDefault();
    if (!servingNow) return;
    setPrescribing(true);
    try {
      let attachmentUrl = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const fileRes = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        attachmentUrl = fileRes.data.url;
      }

      await axios.post(`${API_BASE_URL}/queues/prescribe/${servingNow.appointment_id}`, {
        notes,
        medicines,
        attachment_url: attachmentUrl
      });
      showToast('Prescription saved and patient completed!', 'success');
      setNotes('');
      setMedicines([{ name: '', dosage: '', frequency: '' }]);
      setFile(null);
      fetchLiveQueue(docProfile.id);
      fetchTodayAppointments();
      fetchHistory();
      setActiveTab('queue');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to prescribe', 'error');
    } finally {
      setPrescribing(false);
    }
  };

  const servingNow      = liveQueue?.serving_now;
  const activeApps      = liveQueue?.active_appointments || [];
  const waitingPatients = activeApps.filter(a => a.status === 'SCHEDULED');
  const completedCount  = liveQueue?.completed_count || 0;

  const STATUS_COLORS = {
    AVAILABLE: { border: 'rgba(16,185,129,0.5)', text: 'var(--color-success)', bg: 'rgba(16,185,129,0.08)' },
    BUSY:      { border: 'rgba(239,68,68,0.5)',  text: 'var(--color-danger)',  bg: 'rgba(239,68,68,0.08)' },
    OFFLINE:   { border: 'rgba(100,116,139,0.5)',text: 'var(--text-muted)',    bg: 'rgba(100,116,139,0.08)' }
  };

  if (docLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SkeletonCard lines={2} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'var(--font-body)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            Dr. <span className="text-gradient">{docProfile?.name || user?.username}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            {docProfile?.qualification} &nbsp;·&nbsp;
            <span style={{ color: 'var(--color-accent)' }}>{docProfile?.department}</span> &nbsp;·&nbsp;
            {docProfile?.experience} yrs experience
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {docProfile?.hospital_name}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => docProfile && fetchLiveQueue(docProfile.id)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <RefreshCw size={14} /> Refresh Queue
          </button>
        </div>
      </div>

      {/* ── Status Manager ── */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>Duty Status</h4>
          <span className={`status-badge status-${status.toLowerCase()}`}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['AVAILABLE', 'BUSY', 'OFFLINE'].map(s => {
            const c = STATUS_COLORS[s];
            const active = status === s;
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                style={{
                  flex: 1, minWidth: 100, padding: '11px 8px',
                  border: active ? `1.5px solid ${c.text}` : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '9px',
                  background: active ? c.bg : 'rgba(30,41,66,0.2)',
                  color: active ? c.text : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  fontFamily: 'var(--font-display)', transition: 'var(--transition-smooth)'
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <QueueStats queue={liveQueue} />

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        {[
          { key: 'queue', icon: <Activity size={14} />, label: 'Live Queue' },
          { key: 'appointments', icon: <ClipboardList size={14} />, label: "Today's Appts" },
          { key: 'prescription', icon: <Send size={14} />, label: 'Prescribe' },
          { key: 'history', icon: <FileText size={14} />, label: 'Patient History' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Live Queue ── */}
      {activeTab === 'queue' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Currently serving */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '20px', textAlign: 'center', border: '1px solid rgba(6,182,212,0.15)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Currently Serving</p>
            {servingNow ? (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>#{servingNow.queue_number}</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 4 }}>{servingNow.patient_name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>In Consultation Room</p>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 10 }}>No patient called yet</p>
            )}
          </div>

          <button onClick={handleCallNext} className="btn-primary" style={{ justifyContent: 'center', padding: '14px', fontSize: '1rem' }} disabled={waitingPatients.length === 0}>
            <Play size={18} fill="#fff" /> Call Next Patient
            {waitingPatients.length > 0 && <span style={{ marginLeft: 4, opacity: 0.8 }}>({waitingPatients.length} waiting)</span>}
          </button>

          {/* Waiting list */}
          {queueLoading ? (
            <SkeletonCard lines={3} />
          ) : waitingPatients.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', padding: '20px 0' }}>
              No patients waiting.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Queue ({waitingPatients.length})</p>
              {waitingPatients.map((app, i) => (
                <div key={app.appointment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-accent)', minWidth: 32 }}>#{app.queue_number}</span>
                    <span style={{ fontSize: '0.88rem' }}>{app.patient_name}</span>
                  </div>
                  {i === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 600, border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: 10 }}>NEXT</span>}
                </div>
              ))}
            </div>
          )}

          {liveQueue?.estimated_wait_minutes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
              <Clock size={14} style={{ color: 'var(--color-warning)' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Estimated wait for last patient: ~<span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{liveQueue.estimated_wait_minutes} min</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        {[
          { key: 'requests', icon: <UserCheck size={14} />, label: 'Appointment Requests', badge: doctorRequests.filter(r => r.status === 'PENDING_DOCTOR_APPROVAL').length },
          { key: 'queue', icon: <Activity size={14} />, label: 'Live Queue' },
          { key: 'appointments', icon: <ClipboardList size={14} />, label: "Today's Appts" },
          { key: 'prescription', icon: <Send size={14} />, label: 'Prescribe' },
          { key: 'history', icon: <FileText size={14} />, label: 'Patient History' },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
            {!!t.badge && t.badge > 0 && (
              <span style={{ marginLeft: 6, background: '#f97316', color: '#fff', fontSize: '0.7rem', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Appointment Requests ── */}
      {activeTab === 'requests' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
                Incoming Appointment Requests ({doctorRequests.length})
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Review symptoms and patient details to approve, reject, or suggest another slot.
              </p>
            </div>
            <button onClick={fetchDoctorRequests} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {requestsLoading ? (
            <SkeletonCard lines={4} />
          ) : doctorRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <UserCheck size={36} style={{ opacity: 0.5, marginBottom: 10 }} />
              <p style={{ fontSize: '0.95rem' }}>No appointment requests received yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {doctorRequests.map(req => {
                const isPending = req.status === 'PENDING_DOCTOR_APPROVAL' || req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';
                const isRejected = req.status === 'REJECTED';
                const isWaiting = req.status === 'WAITING_FOR_PATIENT_CONFIRMATION';

                const priorityColor = {
                  EMERGENCY: '#ef4444',
                  HIGH: '#f97316',
                  NORMAL: '#06b6d4'
                }[req.priority] || '#06b6d4';

                return (
                  <div key={req.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, borderLeft: `4px solid ${priorityColor}` }}>
                    {/* Request Top Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{req.patient_name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>
                            {req.patient_age} yrs · {req.patient_gender}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: priorityColor, border: `1px solid ${priorityColor}44`, padding: '2px 8px', borderRadius: 12 }}>
                            {req.priority} PRIORITY
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(30,41,66,0.4)', padding: '2px 8px', borderRadius: 6 }}>
                            Source: {req.booking_method}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 600, marginTop: 6 }}>
                          Requested Slot: {new Date(req.requested_slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isPending && <span style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>Pending Review</span>}
                        {isApproved && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>Approved</span>}
                        {isRejected && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>Rejected</span>}
                        {isWaiting && <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>Awaiting Patient Response</span>}
                      </div>
                    </div>

                    {/* Symptoms & Medical History */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>Symptoms / Reason:</strong> {req.symptoms}
                      </p>
                      {req.previous_visits_count > 0 && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                          <strong>Previous Visits:</strong> {req.previous_visits_count} completed consultations
                        </p>
                      )}
                      {req.medical_history && req.medical_history.length > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          <strong>Medical History Summary:</strong> {req.medical_history.slice(-2).join(' | ')}
                        </div>
                      )}
                      {req.rejection_reason && (
                        <p style={{ fontSize: '0.82rem', color: '#ef4444', marginTop: 4 }}>
                          <strong>Rejection Reason:</strong> {req.rejection_reason}
                        </p>
                      )}
                      {req.suggested_slot && (
                        <p style={{ fontSize: '0.82rem', color: '#3b82f6', marginTop: 4 }}>
                          <strong>Suggested Slot:</strong> {new Date(req.suggested_slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons for Pending Requests */}
                    {isPending && (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#10b981', borderColor: '#10b981' }}
                        >
                          <CheckCircle size={15} /> Approve & Issue Queue Token
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            const dtStr = req.requested_slot.split('T')[0];
                            setSuggestDate(dtStr);
                            setShowSuggestModal(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}
                        >
                          <Clock size={15} /> Suggest New Slot
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            setShowRejectModal(true);
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                          <Trash2 size={15} /> Decline Request
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Prescription ── */}
      {activeTab === 'prescription' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            Consultation & Prescription
          </h4>

          {!servingNow ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <AlertTriangle size={36} style={{ color: 'var(--color-warning)', margin: '0 auto 12px' }} />
              <p>Call a patient first using the Live Queue tab.</p>
            </div>
          ) : (
            <form onSubmit={handlePrescribeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '12px 16px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filing report for</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-accent)', marginTop: 4 }}>
                  #{servingNow.queue_number} — {servingNow.patient_name}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Diagnosis / Notes</label>
                <textarea className="form-input" rows={3} placeholder="Findings, diagnosis, advice..." value={notes} onChange={e => setNotes(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Medicines</label>
                  <button type="button" onClick={addMedicineRow} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    <Plus size={12} /> Add Row
                  </button>
                </div>

                {medicines.map((med, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input className="form-input" placeholder="Medicine Name" value={med.name} onChange={e => handleMedicineChange(i, 'name', e.target.value)} style={{ flex: 2, padding: '9px 12px' }} required />
                    <input className="form-input" placeholder="Dosage" value={med.dosage} onChange={e => handleMedicineChange(i, 'dosage', e.target.value)} style={{ flex: 1, padding: '9px 12px' }} required />
                    <input className="form-input" placeholder="Frequency" value={med.frequency} onChange={e => handleMedicineChange(i, 'frequency', e.target.value)} style={{ flex: 1.5, padding: '9px 12px' }} required />
                    {medicines.length > 1 && (
                      <button type="button" onClick={() => removeMedicineRow(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Attach File (Lab Report, X-ray)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <Upload size={14} /> Choose File
                    <input type="file" style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} />
                  </label>
                  {file && <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>{file.name}</span>}
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '13px', marginTop: 4 }} disabled={prescribing}>
                {prescribing ? <span className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} /> : <Send size={16} />}
                {prescribing ? 'Submitting...' : 'Complete Consultation & Prescribe'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Tab: History ── */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>Patient History</h4>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No consultation history yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
              {history.map(record => (
                <div key={record.id} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Patient ID: {record.patient_id.slice(-6).toUpperCase()}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Notes:</strong> {record.notes}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><strong>Prescription:</strong> {record.prescriptions}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Rejection Reason Modal ── */}
      {showRejectModal && selectedReq && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 460, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#ef4444' }}>
              Decline Appointment Request
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Decline request from <strong>{selectedReq.patient_name}</strong> for {new Date(selectedReq.requested_slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
            </p>

            <form onSubmit={handleRejectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Rejection Reason</label>
                <select className="form-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
                  <option value="Doctor unavailable">Doctor unavailable</option>
                  <option value="Emergency duty / leave">Emergency duty / leave</option>
                  <option value="Outside consultation hours">Outside consultation hours</option>
                  <option value="Incorrect department">Incorrect department</option>
                  <option value="Fully booked for the day">Fully booked for the day</option>
                  <option value="Hospital closed">Hospital closed</option>
                  <option value="Other">Other (Custom reason)</option>
                </select>
              </div>

              {rejectReason === 'Other' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Custom Reason</label>
                  <input className="form-input" placeholder="Type reason for declining..." value={customReason} onChange={e => setCustomReason(e.target.value)} required />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => { setShowRejectModal(false); setSelectedReq(null); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                  Decline Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Slot Suggestion Modal ── */}
      {showSuggestModal && selectedReq && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 460, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#3b82f6' }}>
              Suggest Alternate Slot
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Propose a new date & time for <strong>{selectedReq.patient_name}</strong>.
            </p>

            <form onSubmit={handleSuggestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</label>
                  <input type="date" className="form-input" value={suggestDate} onChange={e => setSuggestDate(e.target.value)} required />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Time</label>
                  <input type="time" className="form-input" value={suggestTime} onChange={e => setSuggestTime(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Note for Patient (Optional)</label>
                <textarea className="form-input" rows={2} placeholder="e.g. Please come at 10:30 AM tomorrow instead." value={suggestNotes} onChange={e => setSuggestNotes(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => { setShowSuggestModal(false); setSelectedReq(null); }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>
                  Send Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
