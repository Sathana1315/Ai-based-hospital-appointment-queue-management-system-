import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';
import VoiceRecorder from '../components/VoiceRecorder';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import AppointmentCalendar from '../components/AppointmentCalendar';
import RecommendationCard from '../components/RecommendationCard';
import QueueProgress from '../components/QueueProgress';
import MedicalHistoryCard from '../components/MedicalHistoryCard';
import PrescriptionViewer from '../components/PrescriptionViewer';
import axios from 'axios';
import {
  Search, MapPin, Stethoscope, Star, Calendar, Clock,
  ChevronRight, Bell, CheckCircle, RefreshCw, Activity,
  Building2, User, Award, Briefcase, XCircle, AlertTriangle, Plus
} from 'lucide-react';

// ── Hospital Card ────────────────────────────────────────────
const HospitalCard = ({ hospital, selected, onSelect }) => (
  <div
    onClick={onSelect}
    className="glass-card"
    style={{
      cursor: 'pointer', overflow: 'hidden',
      border: selected ? '1.5px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.05)',
      background: selected ? 'rgba(6,182,212,0.06)' : 'rgba(30,41,66,0.3)',
      transition: 'var(--transition-smooth)'
    }}
  >
    {hospital.image_url && (
      <img src={hospital.image_url} alt={hospital.name} className="hospital-card-img"
        onError={e => { e.target.style.display = 'none'; }} />
    )}
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h6 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3 }}>{hospital.name}</h6>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-warning)', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
          <Star size={12} fill="currentColor" /> {hospital.rating}
        </span>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <MapPin size={11} /> {hospital.address}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {hospital.departments?.map(d => (
          <span key={d} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 10, background: 'rgba(6,182,212,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(6,182,212,0.2)' }}>{d}</span>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4 }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <Stethoscope size={11} style={{ display: 'inline', marginRight: 4 }} />
          {hospital.doctors?.length || 0} specialist{hospital.doctors?.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  </div>
);

// ── Doctor Card ──────────────────────────────────────────────
const DoctorCard = ({ doctor, selected, onSelect }) => {
  const initial = doctor.name?.charAt(0) || 'D';
  const statusClass = { AVAILABLE: 'status-available', BUSY: 'status-busy', OFFLINE: 'status-offline' }[doctor.status] || 'status-offline';
  const canBook = doctor.status === 'AVAILABLE';

  return (
    <div
      onClick={() => canBook && onSelect(doctor)}
      className="glass-card"
      style={{
        padding: '14px 16px',
        cursor: canBook ? 'pointer' : 'not-allowed',
        opacity: canBook ? 1 : 0.6,
        border: selected ? '1.5px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.05)',
        background: selected ? 'rgba(6,182,212,0.06)' : 'rgba(30,41,66,0.25)',
        display: 'flex', alignItems: 'center', gap: 14
      }}
    >
      <div className="doctor-avatar">{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{doctor.name}</p>
        {doctor.qualification && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{doctor.qualification}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          {doctor.experience && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Briefcase size={10} /> {doctor.experience}y exp</span>}
          <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 3 }}><Star size={10} fill="currentColor" /> {doctor.rating}</span>
        </div>
      </div>
      <span className={`status-badge ${statusClass}`} style={{ fontSize: '0.65rem' }}>{doctor.status}</span>
    </div>
  );
};

// ── Queue Card ───────────────────────────────────────────────
const QueueCard = ({ app, qInfo }) => {
  const myNum      = app.queue_number;
  const servingIdx = qInfo?.current_serving_index ?? -1;
  const servingNum = servingIdx >= 0 ? (qInfo.active_appointments?.[servingIdx]?.queue_number ?? 0) : 0;
  const ahead      = Math.max(0, myNum - servingNum - 1);
  const isCurrent  = servingNum === myNum;
  const estWait    = ahead * 15;

  return (
    <div className="glass-card glow-active" style={{
      padding: '20px',
      border: '1px solid rgba(6,182,212,0.3)',
      background: 'linear-gradient(135deg, rgba(19,27,46,0.9), rgba(6,182,212,0.05))'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '0.68rem', background: 'rgba(6,182,212,0.15)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: 10, fontWeight: 600, textTransform: 'uppercase' }}>Queue Token</span>
          <p style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 8 }}>{app.doctor_name}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{app.hospital_name} · {app.department}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Appointment</p>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: 2 }}>{new Date(app.slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px', margin: '16px 0', textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Token</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)' }}>#{myNum}</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Now Serving</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>#{servingNum || '—'}</p>
        </div>
      </div>

      <QueueProgress myNum={myNum} servingNum={servingNum} estWait={estWait} ahead={ahead} />
    </div>
  );
};

// ── Main Dashboard ───────────────────────────────────────────
const PatientDashboard = () => {
  const { user, API_BASE_URL } = useAuth();
  const { showToast } = useToast();
  const { lastMessage } = useWebSocket();

  const [profile, setProfile]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [symptomResult, setSymptomResult]   = useState(null);
  const [hospitalsResult, setHospitalsResult] = useState([]);
  const [hospLoading, setHospLoading]       = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [booking, setBooking]               = useState(false);
  
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [recommendingSlots, setRecommendingSlots] = useState(false);

  const [myRequests, setMyRequests]         = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [liveQueues, setLiveQueues]         = useState({});
  const [reqLoading, setReqLoading]         = useState(true);

  // New states
  const [activeTab, setActiveTab]           = useState('book');
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const refreshRef = useRef(null);

  useEffect(() => {
    fetchProfile();
    fetchMyData();
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'QUEUE_UPDATE') {
      fetchMyData();
    }
  }, [lastMessage]);

  const fetchProfile = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/patients/profile`);
      setProfile(r.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const fetchMyData = async () => {
    setReqLoading(true);
    try {
      const [reqRes, appRes, histRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/appointments/requests`),
        axios.get(`${API_BASE_URL}/appointments/list`),
        axios.get(`${API_BASE_URL}/patients/history`)
      ]);
      setMyRequests(reqRes.data);
      setMyAppointments(appRes.data);
      setMedicalHistory(histRes.data);

      appRes.data.filter(a => a.status === 'SCHEDULED').forEach(a => fetchLiveQueue(a.doctor_id));
    } catch { /* silent */ }
    finally { setReqLoading(false); }
  };

  const fetchLiveQueue = async (doctorId) => {
    try {
      const r = await axios.get(`${API_BASE_URL}/queues/live/${doctorId}`);
      setLiveQueues(prev => ({ ...prev, [doctorId]: r.data }));
    } catch { /* silent */ }
  };

  const handleVoiceAnalysisComplete = async (result) => {
    setSymptomResult(result);
    setHospLoading(true);
    setSelectedHospital(null);
    setSelectedDoctor(null);
    try {
      const r = await axios.get(`${API_BASE_URL}/hospitals/recommend?specialty=${encodeURIComponent(result.recommended_specialty)}`);
      setHospitalsResult(r.data.hospitals || []);
      if (!r.data.hospitals?.length) {
        showToast(`No hospitals found in your district for ${result.recommended_specialty}.`, 'warning');
      }
    } catch {
      showToast('Failed to fetch hospital recommendations.', 'error');
    } finally {
      setHospLoading(false);
    }
  };

  const handleDoctorSelect = async (doc) => {
    setSelectedDoctor(doc);
    setAppointmentDate('');
    setAiRecommendations([]);
    setRecommendingSlots(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await axios.post(`${API_BASE_URL}/ai/recommend-slots`, {
        doctor_id: doc.id,
        target_date: dateStr
      });
      setAiRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setRecommendingSlots(false);
    }
  };

  const handleRequestBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !appointmentDate) return;
    setBooking(true);
    try {
      const reqSlot = new Date(appointmentDate).toISOString();
      await axios.post(`${API_BASE_URL}/appointments/request`, {
        doctor_id: selectedDoctor.id,
        hospital_id: selectedHospital.id,
        requested_slot: reqSlot,
        notes: appointmentNotes,
        symptoms: appointmentNotes || "General Checkup",
        priority: "NORMAL",
        booking_method: "MANUAL"
      });
      showToast(`Appointment request submitted! Awaiting doctor approval.`, 'success');
      setAppointmentDate('');
      setAppointmentNotes('');
      setSelectedDoctor(null);
      setSelectedHospital(null);
      fetchMyData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Booking failed. Please try again.', 'error');
    } finally {
      setBooking(false);
    }
  };

  const handleRespondSuggestion = async (reqId, action) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/appointments/patient-respond/${reqId}`, { action });
      showToast(res.data.message, action === 'ACCEPT' ? 'success' : 'info');
      fetchMyData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to respond to slot suggestion.', 'error');
    }
  };

  const handleAcceptSuggestion = async (reqId, slot) => {
    await handleRespondSuggestion(reqId, 'ACCEPT');
  };

  const scheduledAppts = myAppointments.filter(a => a.status === 'SCHEDULED');

  const STATUS_STYLE = {
    PENDING_DOCTOR_APPROVAL: { bg: 'rgba(249,115,22,0.15)', text: '#f97316', label: 'Pending Doctor Approval' },
    PENDING:                 { bg: 'rgba(249,115,22,0.15)', text: '#f97316', label: 'Pending Doctor Approval' },
    APPROVED:                { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'Approved' },
    WAITING_FOR_PATIENT_CONFIRMATION: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', label: 'Suggested New Slot' },
    SUGGESTED:               { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', label: 'Suggested New Slot' },
    REJECTED:                { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Declined by Doctor' },
    COMPLETED:               { bg: 'rgba(168,85,247,0.15)', text: '#a855f7', label: 'Completed' },
    CANCELLED:               { bg: 'rgba(100,116,139,0.15)', text: '#64748b', label: 'Cancelled' },
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SkeletonCard lines={2} />
      <SkeletonTable rows={3} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, fontFamily: 'var(--font-body)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            Hello, <span className="text-gradient">{profile?.name || user?.username}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{profile?.district || 'Unknown'} District</span>
            {user?.role === 'guest' && <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>(Guest Session)</span>}
          </p>
        </div>
        <button onClick={fetchMyData} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 10, overflowX: 'auto' }}>
        {[
          { key: 'book', icon: <Plus size={16} />, label: 'Book Appointment' },
          { key: 'active', icon: <Activity size={16} />, label: 'Active Bookings' },
          { key: 'history', icon: <Calendar size={16} />, label: 'Medical History' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: activeTab === t.key ? 'var(--color-accent)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
              border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600,
              transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'book' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>

          {/* Voice Recorder */}
          <VoiceRecorder onAnalysisComplete={handleVoiceAnalysisComplete} />

          {/* AI Result */}
          {symptomResult && (
            <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: 1 }}>AI Assessment</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>"{symptomResult.transcription}"</p>
                <h4 style={{ fontSize: '1.15rem', marginTop: 8, fontFamily: 'var(--font-display)' }}>
                  Recommended: <span className="text-gradient">{symptomResult.recommended_specialty}</span>
                </h4>
              </div>

              {/* Hospital List */}
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>
                  Hospitals in {profile?.district} District:
                </p>
                {hospLoading ? (
                  <SkeletonTable rows={2} />
                ) : hospitalsResult.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                    No hospitals found in your district for this department.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {hospitalsResult.map(h => (
                      <HospitalCard
                        key={h.id}
                        hospital={h}
                        selected={selectedHospital?.id === h.id}
                        onSelect={() => { setSelectedHospital(h); setSelectedDoctor(null); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Doctor Selection + Booking Form */}
          {selectedHospital && (
            <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
                <Building2 size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--color-accent)' }} />
                {selectedHospital.name}
              </h4>

              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>Choose a Specialist:</p>
                {selectedHospital.doctors?.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No doctors available for this department.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedHospital.doctors?.map(doc => (
                      <DoctorCard
                        key={doc.id}
                        doctor={doc}
                        selected={selectedDoctor?.id === doc.id}
                        onSelect={handleDoctorSelect}
                      />
                    ))}
                  </div>
                )}
              </div>

              {selectedDoctor && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Booking with <strong style={{ color: 'var(--text-primary)' }}>{selectedDoctor.name}</strong>
                  </p>
                  
                  {recommendingSlots ? (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>🤖 AI is finding the best slots...</p>
                    </div>
                  ) : (
                    <RecommendationCard 
                      recommendations={aiRecommendations} 
                      selectedSlot={appointmentDate} 
                      onSelect={setAppointmentDate} 
                    />
                  )}
                  
                  <AppointmentCalendar 
                    doctorId={selectedDoctor.id} 
                    selectedSlot={appointmentDate} 
                    onSelectSlot={setAppointmentDate} 
                  />

                  <form onSubmit={handleRequestBooking} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {appointmentDate && (
                      <div style={{ padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>Selected Slot: {new Date(appointmentDate).toLocaleString()}</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Notes / Symptoms (Optional)</label>
                      <textarea className="form-input" rows={2} placeholder="Describe your symptoms..." value={appointmentNotes} onChange={e => setAppointmentNotes(e.target.value)} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={booking || !appointmentDate}>
                      {booking ? 'Submitting...' : <><Calendar size={16} /> Request Appointment</>}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>

          {/* Live Queue Tracker */}
          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              <Activity size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--color-accent)' }} />
              Live Queue Tracker
            </h4>
            {scheduledAppts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>No active appointments in queue.<br />Book one to see your live position here.</p>
              </div>
            ) : (
              scheduledAppts.map(app => (
                <QueueCard key={app.id} app={app} qInfo={liveQueues[app.doctor_id]} />
              ))
            )}
          </div>

          {/* My Requests */}
          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              My Bookings & Requests
            </h4>
            {reqLoading ? (
              <SkeletonTable rows={3} />
            ) : myRequests.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>No requests yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                {myRequests.map(req => {
                  const s = STATUS_STYLE[req.status] || { bg: 'rgba(255,255,255,0.04)', text: '#fff', label: req.status };
                  const isSuggested = req.status === 'WAITING_FOR_PATIENT_CONFIRMATION' || req.status === 'SUGGESTED';
                  const isRejected = req.status === 'REJECTED';

                  return (
                    <div key={req.id} className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div>
                          <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>{req.doctor_name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{req.hospital_name} · {req.department}</p>
                          <p style={{ fontSize: '0.73rem', color: 'var(--color-accent)', fontWeight: 600, marginTop: 4 }}>
                            Requested: {new Date(req.requested_slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span style={{ backgroundColor: s.bg, color: s.text, fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: `1px solid ${s.text}33`, flexShrink: 0 }}>
                          {s.label}
                        </span>
                      </div>

                      {/* Rejection reason */}
                      {isRejected && (
                        <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--color-danger)' }}>
                          <XCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                          <strong>Doctor's Reason:</strong> {req.rejection_reason || 'Doctor unavailable'}
                        </div>
                      )}

                      {/* Doctor suggested slot */}
                      {isSuggested && (
                        <div style={{ padding: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <p style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 700 }}>
                            <Clock size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            Doctor Proposed Alternate Time:
                          </p>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {req.suggested_slot ? new Date(req.suggested_slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (req.suggested_slots?.[0] ? new Date(req.suggested_slots[0]).toLocaleString() : 'New slot proposed')}
                          </p>
                          {req.doctor_notes && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              "{req.doctor_notes}"
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button
                              onClick={() => handleRespondSuggestion(req.id, 'ACCEPT')}
                              style={{ fontSize: '0.75rem', padding: '6px 14px', background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✓ Accept & Generate Token
                            </button>
                            <button
                              onClick={() => handleRespondSuggestion(req.id, 'DECLINE')}
                              style={{ fontSize: '0.75rem', padding: '6px 14px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✕ Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed appointments */}
          {myAppointments.filter(a => a.status === 'COMPLETED').length > 0 && (
            <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
                <CheckCircle size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--color-success)' }} />
                Completed Appointments
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                {myAppointments.filter(a => a.status === 'COMPLETED').map(app => (
                  <div key={app.id} className="glass-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>{app.doctor_name}</p>
                      <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(app.slot).toLocaleDateString()}</p>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: 20 }}>COMPLETED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 10 }}>Medical History</h4>
          {medicalHistory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No completed consultations yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {medicalHistory.map(record => (
                <MedicalHistoryCard key={record.id} record={record} onViewPrescription={setSelectedRecord} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedRecord && (
        <PrescriptionViewer record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
};

export default PatientDashboard;
