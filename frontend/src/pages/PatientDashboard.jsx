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
  ChevronRight, ChevronLeft, Bell, CheckCircle, RefreshCw, Activity,
  Building2, User, Award, Briefcase, XCircle, AlertTriangle, Plus, Loader2
} from 'lucide-react';

// ── Hospital Card ────────────────────────────────────────────
const HospitalCard = ({ hospital, onSelect }) => (
  <div
    className="glass-card"
    style={{
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(30,41,66,0.3)',
      transition: 'var(--transition-smooth)'
    }}
  >
    {hospital.image_url && (
      <img src={hospital.image_url} alt={hospital.name} className="hospital-card-img"
        onError={e => { e.target.style.display = 'none'; }} />
    )}
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h6 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>{hospital.name}</h6>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-warning)', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>
          <Star size={14} fill="currentColor" /> {hospital.rating}
        </span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <MapPin size={14} /> {hospital.address}, {hospital.district}
      </p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {hospital.departments?.map(d => (
          <span key={d} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 12, background: 'rgba(6,182,212,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(6,182,212,0.2)' }}>{d}</span>
        ))}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 14, marginTop: 8 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <Stethoscope size={14} style={{ display: 'inline', marginRight: 4 }} />
          {hospital.doctors?.length || 0} specialist{hospital.doctors?.length !== 1 ? 's' : ''}
        </p>
        <button 
          onClick={onSelect}
          className="btn-primary"
          style={{ fontSize: '0.85rem', padding: '8px 16px', minHeight: '44px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          View Specialists <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>
);

// ── Doctor Card ──────────────────────────────────────────────
const DoctorCard = ({ doctor, onSelect }) => {
  const initial = doctor.name?.charAt(0) || 'D';
  const isAvailable = doctor.status === 'AVAILABLE';
  const statusClass = isAvailable ? 'status-available' : doctor.status === 'BUSY' ? 'status-busy' : 'status-offline';

  return (
    <div
      className="glass-card"
      style={{
        padding: '16px',
        opacity: isAvailable ? 1 : 0.7,
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(30,41,66,0.25)',
        display: 'flex', flexDirection: 'column', gap: 12
      }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="doctor-avatar" style={{ width: 55, height: 55, fontSize: '1.5rem', flexShrink: 0 }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700 }}>{doctor.name}</p>
            <span className={`status-badge ${statusClass}`} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>{doctor.status}</span>
          </div>
          {doctor.qualification && <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>{doctor.qualification}</p>}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doctor.department}</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {doctor.experience && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={12} /> {doctor.experience}y exp</span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="currentColor" /> {doctor.rating || 'N/A'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> ₹{doctor.consultation_fee || 500}</span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => isAvailable && onSelect(doctor)}
        disabled={!isAvailable}
        className={isAvailable ? "btn-primary" : "btn-secondary"}
        style={{ width: '100%', justifyContent: 'center', marginTop: 8, minHeight: '44px', opacity: isAvailable ? 1 : 0.6 }}
      >
        <Calendar size={16} /> View Availability
      </button>
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
  const [bookingStep, setBookingStep]       = useState(1);
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
        ].filter(t => !(user?.role === 'guest' && t.key === 'history')).map(t => (
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

          {/* Step Progress Indicator */}
          {bookingStep > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(30,41,66,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
              {[1, 2, 3, 4].map(step => (
                <React.Fragment key={step}>
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                    background: bookingStep >= step ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                    color: bookingStep >= step ? '#fff' : 'var(--text-muted)'
                  }}>{step}</div>
                  {step < 4 && <div style={{ flex: 1, height: 2, background: bookingStep > step ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)' }} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* STEP 1: AI Assessment & Hospital Selection */}
          {bookingStep === 1 && (
            <>
              <VoiceRecorder onAnalysisComplete={(res) => { handleVoiceAnalysisComplete(res); setBookingStep(1); }} />
              
              {symptomResult && (
                <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: 1 }}>AI Assessment</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>"{symptomResult.transcription}"</p>
                    <h4 style={{ fontSize: '1.15rem', marginTop: 8, fontFamily: 'var(--font-display)' }}>
                      Recommended: <span className="text-gradient">{symptomResult.recommended_specialty}</span>
                    </h4>
                  </div>

                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>Hospitals in {profile?.district} District:</p>
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
                            onSelect={() => { setSelectedHospital(h); setSelectedDoctor(null); setBookingStep(2); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: Hospital Details & Specialist Selection */}
          {bookingStep === 2 && selectedHospital && (
            <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button onClick={() => setBookingStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 0', alignSelf: 'flex-start' }}><ChevronLeft size={16} /> Back to Hospitals</button>
              
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-accent)' }}>{selectedHospital.name}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}><MapPin size={14} /> {selectedHospital.address}, {selectedHospital.district}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Star size={14} color="var(--color-warning)" /> {selectedHospital.rating} Rating</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={14} /> {selectedHospital.departments?.length || 0} Departments</span>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12 }}>Available Specialists</p>
                {selectedHospital.doctors?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <AlertTriangle size={32} color="var(--color-warning)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>No specialists currently available</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>There are no doctors available for {symptomResult?.recommended_specialty || 'this department'} at this hospital right now.</p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button onClick={() => setBookingStep(1)} className="btn-secondary" style={{ fontSize: '0.8rem', minHeight: 40 }}>Try another hospital</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedHospital.doctors?.map(doc => (
                      <DoctorCard
                        key={doc.id}
                        doctor={doc}
                        onSelect={(doc) => { handleDoctorSelect(doc); setBookingStep(3); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: AI Recommendations & Date/Time Selection */}
          {bookingStep === 3 && selectedDoctor && (
            <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button onClick={() => setBookingStep(2)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 0', alignSelf: 'flex-start' }}><ChevronLeft size={16} /> Back to Specialists</button>
              
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Booking with {selectedDoctor.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedHospital.name}</p>
              </div>
              
              {recommendingSlots ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Loader2 size={24} className="spin" style={{ color: 'var(--color-accent)', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>AI is analyzing schedules for the best slot...</p>
                </div>
              ) : (
                <RecommendationCard 
                  recommendations={aiRecommendations} 
                  selectedSlot={appointmentDate} 
                  onSelect={(date) => { setAppointmentDate(date); setBookingStep(4); }} 
                />
              )}
              
              <AppointmentCalendar 
                doctorId={selectedDoctor.id} 
                selectedSlot={appointmentDate} 
                onSelectSlot={(date) => { setAppointmentDate(date); setBookingStep(4); }} 
              />
            </div>
          )}

          {/* STEP 4: Confirm Appointment */}
          {bookingStep === 4 && selectedDoctor && appointmentDate && (
            <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <button onClick={() => setBookingStep(3)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 0', alignSelf: 'flex-start' }}><ChevronLeft size={16} /> Back to Calendar</button>
              
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>Appointment Summary</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hospital</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedHospital.name}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{symptomResult?.recommended_specialty || selectedDoctor.department}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specialist</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedDoctor.name}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Consultation Fee</p>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)' }}>₹{selectedDoctor.consultation_fee || 500}</p>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(6,182,212,0.1)', borderRadius: 12, border: '1px solid rgba(6,182,212,0.2)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Selected Date & Time</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {new Date(appointmentDate).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <form onSubmit={(e) => { handleRequestBooking(e); setBookingStep(1); }} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Notes / Symptoms (Optional)</label>
                  <textarea className="form-input" rows={3} placeholder="Describe your symptoms to help the doctor prepare..." value={appointmentNotes} onChange={e => setAppointmentNotes(e.target.value)} style={{ padding: '12px', borderRadius: 10 }} />
                </div>
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', minHeight: 48, fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(6,182,212,0.3)' }} disabled={booking}>
                  {booking ? 'Submitting Request...' : 'Submit Appointment Request'}
                </button>
              </form>
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
