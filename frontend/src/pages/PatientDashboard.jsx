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
  Building2, User, Award, Briefcase, XCircle, AlertTriangle, Plus,
  Loader2, Bot, Mic, Sparkles, ArrowRight, HeartPulse, Shield,
  Check, FileText, Phone
} from 'lucide-react';

// Department icon mapping
const DEPT_ICONS = {
  'Cardiology': '❤️',
  'Neurology': '🧠',
  'General Medicine': '🩺',
  'Pediatrics': '👶',
  'Orthopedics': '🦴',
  'Dermatology': '✨',
  'ENT': '👂',
  'Ophthalmology': '👁️',
  'Gynecology': '🌸',
  'Psychiatry': '🧘',
  'Dentistry': '🦷',
  'Oncology': '🎗️',
  'Gastroenterology': '🥗',
  'Pulmonology': '🫁',
  'Urology': '💧',
  'Emergency': '🚑',
  'Default': '🏥'
};

// ── Hospital Card ────────────────────────────────────────────
const HospitalCard = ({ hospital, onSelect, selected }) => (
  <div
    className={`glass-card ${selected ? 'glow-active' : ''}`}
    style={{
      overflow: 'hidden',
      border: selected ? '1.5px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.06)',
      background: selected ? 'rgba(6,182,212,0.08)' : 'rgba(30,41,66,0.3)',
      transition: 'var(--transition-smooth)',
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    {hospital.image_url && (
      <img
        src={hospital.image_url}
        alt={hospital.name}
        className="hospital-card-img"
        onError={e => { e.target.style.display = 'none'; }}
      />
    )}
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h6 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>{hospital.name}</h6>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-warning)', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>
          <Star size={14} fill="currentColor" /> {hospital.rating || '4.5'}
        </span>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <MapPin size={14} style={{ flexShrink: 0 }} /> {hospital.address}, {hospital.district}
      </p>
      
      {hospital.departments?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
          {hospital.departments.slice(0, 4).map(d => (
            <span key={d} style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 10, background: 'rgba(6,182,212,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(6,182,212,0.2)' }}>
              {d}
            </span>
          ))}
          {hospital.departments.length > 4 && (
            <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
              +{hospital.departments.length - 4} more
            </span>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 12, marginTop: 'auto' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <Building2 size={13} style={{ display: 'inline', marginRight: 4 }} />
          {hospital.departments?.length || 0} Departments
        </p>
        <button 
          onClick={onSelect}
          className="btn-primary"
          style={{ fontSize: '0.85rem', padding: '8px 16px', minHeight: '44px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          Select Hospital <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>
);

// ── Doctor Card ──────────────────────────────────────────────
const DoctorCard = ({ doctor, onSelect, selected }) => {
  const initial = doctor.name?.charAt(0) || 'D';
  const isAvailable = doctor.status === 'AVAILABLE';
  const statusClass = isAvailable ? 'status-available' : doctor.status === 'BUSY' ? 'status-busy' : 'status-offline';

  return (
    <div
      className={`glass-card ${selected ? 'glow-active' : ''}`}
      style={{
        padding: '16px',
        opacity: isAvailable ? 1 : 0.75,
        border: selected ? '1.5px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.06)',
        background: selected ? 'rgba(6,182,212,0.08)' : 'rgba(30,41,66,0.25)',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'var(--transition-smooth)'
      }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="doctor-avatar" style={{ width: 55, height: 55, fontSize: '1.5rem', flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700 }}>{doctor.name}</p>
            <span className={`status-badge ${statusClass}`} style={{ fontSize: '0.7rem', padding: '3px 8px', flexShrink: 0 }}>
              {doctor.status}
            </span>
          </div>
          {doctor.qualification && <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>{doctor.qualification}</p>}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doctor.department}</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {doctor.experience && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Briefcase size={12} /> {doctor.experience}y exp
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={12} fill="currentColor" /> {doctor.rating || '4.8'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              ₹{doctor.consultation_fee || 500}
            </span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => isAvailable && onSelect(doctor)}
        disabled={!isAvailable}
        className={isAvailable ? "btn-primary" : "btn-secondary"}
        style={{ width: '100%', justifyContent: 'center', marginTop: 4, minHeight: '44px', opacity: isAvailable ? 1 : 0.6 }}
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

// ── Main Dashboard Component ─────────────────────────────────
const PatientDashboard = () => {
  const { user, API_BASE_URL } = useAuth();
  const { showToast } = useToast();
  const { lastMessage } = useWebSocket();

  const [profile, setProfile]                       = useState(null);
  const [loading, setLoading]                       = useState(true);
  
  // Navigation & Modes
  const [activeTab, setActiveTab]                   = useState('book'); // 'book' | 'active' | 'history'
  const [bookingMode, setBookingMode]               = useState('landing'); // 'landing' | 'manual'
  const [manualStep, setManualStep]                 = useState(1); // 1: Hospital -> 2: Dept -> 3: Doctor -> 4: Slot -> 5: Confirm

  // Manual Wizard Selection States
  const [districtHospitals, setDistrictHospitals]   = useState([]);
  const [hospLoading, setHospLoading]               = useState(false);
  const [hospitalSearch, setHospitalSearch]         = useState('');
  
  const [selectedHospital, setSelectedHospital]     = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [doctorsList, setDoctorsList]               = useState([]);
  const [doctorsLoading, setDoctorsLoading]         = useState(false);
  const [selectedDoctor, setSelectedDoctor]         = useState(null);
  
  const [appointmentDate, setAppointmentDate]       = useState('');
  const [appointmentNotes, setAppointmentNotes]     = useState('');
  const [booking, setBooking]                       = useState(false);
  
  const [aiRecommendations, setAiRecommendations]   = useState([]);
  const [recommendingSlots, setRecommendingSlots]   = useState(false);

  // AI Voice Symptom State
  const [symptomResult, setSymptomResult]           = useState(null);
  const [voiceHospitals, setVoiceHospitals]         = useState([]);
  const [voiceHospLoading, setVoiceHospLoading]     = useState(false);

  // Data states
  const [myRequests, setMyRequests]                 = useState([]);
  const [myAppointments, setMyAppointments]         = useState([]);
  const [liveQueues, setLiveQueues]                 = useState({});
  const [reqLoading, setReqLoading]                 = useState(true);
  const [medicalHistory, setMedicalHistory]         = useState([]);
  const [selectedRecord, setSelectedRecord]         = useState(null);

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

  // ── Manual Booking Flow Helpers ────────────────────────────
  const startManualBooking = async () => {
    setBookingMode('manual');
    setManualStep(1);
    setSelectedHospital(null);
    setSelectedDepartment('');
    setSelectedDoctor(null);
    setAppointmentDate('');
    setAppointmentNotes('');
    
    // Load district hospitals
    setHospLoading(true);
    try {
      const userDistrict = profile?.district || (user?.district);
      const url = userDistrict 
        ? `${API_BASE_URL}/hospitals?district=${encodeURIComponent(userDistrict)}` 
        : `${API_BASE_URL}/hospitals`;
      const res = await axios.get(url);
      setDistrictHospitals(res.data || []);
    } catch {
      showToast('Failed to load hospitals for your district.', 'error');
    } finally {
      setHospLoading(false);
    }
  };

  const handleSelectHospital = (hospital) => {
    setSelectedHospital(hospital);
    setSelectedDepartment('');
    setSelectedDoctor(null);
    setAppointmentDate('');
    setManualStep(2);
  };

  const handleSelectDepartment = async (dept) => {
    setSelectedDepartment(dept);
    setSelectedDoctor(null);
    setAppointmentDate('');
    setManualStep(3);
    
    // Fetch doctors for this hospital and department
    setDoctorsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/doctors?hospital_id=${selectedHospital.id}&department=${encodeURIComponent(dept)}`);
      setDoctorsList(res.data || []);
    } catch {
      showToast('Failed to load specialists for this department.', 'error');
      setDoctorsList([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleDoctorSelect = async (doc) => {
    setSelectedDoctor(doc);
    setAppointmentDate('');
    setAiRecommendations([]);
    setRecommendingSlots(true);
    setManualStep(4);
    
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

  const handleSelectSlot = (dateTimeIso) => {
    setAppointmentDate(dateTimeIso);
    setManualStep(5);
  };

  const handleRequestBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedHospital || !appointmentDate) {
      showToast('Please complete all booking steps.', 'warning');
      return;
    }
    setBooking(true);
    try {
      const reqSlot = new Date(appointmentDate).toISOString();
      await axios.post(`${API_BASE_URL}/appointments/request`, {
        doctor_id: selectedDoctor.id,
        hospital_id: selectedHospital.id,
        requested_slot: reqSlot,
        notes: appointmentNotes,
        symptoms: appointmentNotes || selectedDepartment || "General Consultation",
        priority: "NORMAL",
        booking_method: "MANUAL"
      });
      
      showToast('Appointment request submitted! Awaiting doctor/receptionist approval.', 'success');
      
      // Reset wizard
      setBookingMode('landing');
      setManualStep(1);
      setSelectedHospital(null);
      setSelectedDepartment('');
      setSelectedDoctor(null);
      setAppointmentDate('');
      setAppointmentNotes('');
      
      // Switch to Active Bookings tab and refresh
      fetchMyData();
      setActiveTab('active');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Booking failed. Please try again.', 'error');
    } finally {
      setBooking(false);
    }
  };

  // ── Voice Symptom Handler ───────────────────────────────────
  const handleVoiceAnalysisComplete = async (result) => {
    setSymptomResult(result);
    setVoiceHospLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/hospitals/recommend?specialty=${encodeURIComponent(result.recommended_specialty)}`);
      setVoiceHospitals(r.data.hospitals || []);
      if (!r.data.hospitals?.length) {
        showToast(`No hospitals found in your district for ${result.recommended_specialty}.`, 'warning');
      }
    } catch {
      showToast('Failed to fetch hospital recommendations.', 'error');
    } finally {
      setVoiceHospLoading(false);
    }
  };

  const handleVoiceBookHospital = (hosp) => {
    setSelectedHospital(hosp);
    const specialty = symptomResult?.recommended_specialty || hosp.departments?.[0] || 'General Medicine';
    setSelectedDepartment(specialty);
    setBookingMode('manual');
    setManualStep(3); // jump straight to doctor selection
    
    // Load doctors
    setDoctorsLoading(true);
    axios.get(`${API_BASE_URL}/doctors?hospital_id=${hosp.id}&department=${encodeURIComponent(specialty)}`)
      .then(res => setDoctorsList(res.data || []))
      .catch(() => setDoctorsList([]))
      .finally(() => setDoctorsLoading(false));
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

  const triggerAIAssistant = () => {
    window.dispatchEvent(new CustomEvent('open-chatbot'));
    showToast('AI Assistant opened! Type your symptoms or scheduling request.', 'info');
  };

  const scheduledAppts = myAppointments.filter(a => a.status === 'SCHEDULED');

  const STATUS_STYLE = {
    PENDING_DOCTOR_APPROVAL: { bg: 'rgba(249,115,22,0.15)', text: '#f97316', label: 'Pending Doctor Approval' },
    PENDING:                 { bg: 'rgba(249,115,22,0.15)', text: '#f97316', label: 'Pending Doctor Approval' },
    APPROVED:                { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'Approved & Scheduled' },
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

  const filteredDistrictHospitals = districtHospitals.filter(h => 
    !hospitalSearch.trim() || 
    h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
    h.address?.toLowerCase().includes(hospitalSearch.toLowerCase())
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
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{profile?.district || user?.district || 'Salem'} District</span>
            {user?.role === 'guest' && <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>(Guest Session)</span>}
          </p>
        </div>
        <button onClick={fetchMyData} className="btn-secondary" style={{ fontSize: '0.82rem', minHeight: '44px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 10, overflowX: 'auto' }} className="tab-bar">
        {[
          { key: 'book', icon: <Plus size={16} />, label: 'Book Appointment' },
          { key: 'active', icon: <Activity size={16} />, label: 'Active Bookings' },
          { key: 'history', icon: <Calendar size={16} />, label: 'Medical History' },
        ].filter(t => !(user?.role === 'guest' && t.key === 'history')).map(t => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              if (t.key === 'book') setBookingMode('landing');
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              background: activeTab === t.key ? 'var(--color-accent)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
              border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 600,
              transition: 'all 0.2s', whiteSpace: 'nowrap', minHeight: '44px'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: BOOK APPOINTMENT ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'book' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>

          {/* ── OPTION HUB (Landing View) ── */}
          {bookingMode === 'landing' && (
            <>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  Book an Appointment
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: 4 }}>
                  Choose how you want to book
                </p>
              </div>

              {/* 2 Primary Action Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="booking-options-grid">
                
                {/* 1. Manual Booking Card */}
                <div 
                  className="glass-card glow-active"
                  style={{
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    background: 'linear-gradient(145deg, rgba(30,41,66,0.5), rgba(6,182,212,0.06))'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 14,
                      background: 'rgba(6,182,212,0.15)',
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <Calendar size={26} color="var(--color-accent)" />
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      Manual Booking
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Select hospital, specialist, doctor and available date/time yourself.
                    </p>
                  </div>

                  <button
                    onClick={startManualBooking}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', minHeight: '44px', fontSize: '0.9rem' }}
                  >
                    Start Manual Booking <ChevronRight size={16} />
                  </button>
                </div>

                {/* 2. Book with AI Assistant Card */}
                <div 
                  className="glass-card"
                  style={{
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    background: 'linear-gradient(145deg, rgba(30,41,66,0.5), rgba(168,85,247,0.06))'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: 14,
                      background: 'rgba(168,85,247,0.15)',
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      <Bot size={26} color="#c084fc" />
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#e9d5ff' }}>
                      Book with AI Assistant
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Tell the AI what you need and let it find suitable doctors and real-time slots.
                    </p>
                  </div>

                  <button
                    onClick={triggerAIAssistant}
                    className="btn-secondary"
                    style={{
                      width: '100%', justifyContent: 'center', minHeight: '44px', fontSize: '0.9rem',
                      borderColor: 'rgba(168,85,247,0.4)', color: '#d8b4fe'
                    }}
                  >
                    <Sparkles size={16} /> Open AI Assistant
                  </button>
                </div>

              </div>

              {/* 3. AI Voice Symptom Checker Section */}
              <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}>
                    <Mic size={18} color="#f87171" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      AI Voice Symptom Checker
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Describe your symptoms aloud and get a department recommendation.
                    </p>
                  </div>
                </div>

                <VoiceRecorder onAnalysisComplete={handleVoiceAnalysisComplete} />

                {/* Voice analysis recommendation results */}
                {symptomResult && (
                  <div style={{
                    marginTop: 10, padding: '16px', background: 'rgba(6,182,212,0.06)',
                    borderRadius: 12, border: '1px solid rgba(6,182,212,0.2)',
                    display: 'flex', flexDirection: 'column', gap: 12
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: 1 }}>
                        AI Assessment
                      </span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                        "{symptomResult.transcription}"
                      </p>
                      <h4 style={{ fontSize: '1.1rem', marginTop: 6, fontFamily: 'var(--font-display)' }}>
                        Recommended Specialty: <span className="text-gradient">{symptomResult.recommended_specialty}</span>
                      </h4>
                    </div>

                    <div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10 }}>
                        Matching Hospitals in {profile?.district || user?.district || 'Your'} District:
                      </p>
                      {voiceHospLoading ? (
                        <SkeletonTable rows={2} />
                      ) : voiceHospitals.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          No specific hospitals found in your district for this specialty. You can use Manual Booking to select any hospital.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {voiceHospitals.map(h => (
                            <HospitalCard
                              key={h.id}
                              hospital={h}
                              onSelect={() => handleVoiceBookHospital(h)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── 5-STEP MANUAL BOOKING WIZARD ── */}
          {bookingMode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Stepper Progress Bar */}
              <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                {[
                  { step: 1, label: 'Hospital' },
                  { step: 2, label: 'Department' },
                  { step: 3, label: 'Doctor' },
                  { step: 4, label: 'Date & Time' },
                  { step: 5, label: 'Confirm' }
                ].map(({ step, label }, idx, arr) => {
                  const isDone = manualStep > step;
                  const isCurrent = manualStep === step;
                  return (
                    <React.Fragment key={step}>
                      <div 
                        onClick={() => isDone && setManualStep(step)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          cursor: isDone ? 'pointer' : 'default', minWidth: 40
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          fontSize: '0.78rem', fontWeight: 700,
                          background: isCurrent ? 'var(--color-accent)' : isDone ? 'var(--color-success)' : 'rgba(255,255,255,0.1)',
                          color: isCurrent || isDone ? '#fff' : 'var(--text-muted)',
                          boxShadow: isCurrent ? '0 0 12px rgba(6,182,212,0.5)' : 'none',
                          transition: 'all 0.3s'
                        }}>
                          {isDone ? <Check size={14} /> : step}
                        </div>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? 'var(--color-accent)' : isDone ? 'var(--text-primary)' : 'var(--text-muted)',
                          textAlign: 'center', whiteSpace: 'nowrap'
                        }}>
                          {label}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div style={{
                          flex: 1, height: 2,
                          background: manualStep > step ? 'var(--color-success)' : 'rgba(255,255,255,0.08)',
                          marginBottom: 16, transition: 'all 0.3s'
                        }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* ── STEP 1: SELECT HOSPITAL ── */}
              {manualStep === 1 && (
                <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setBookingMode('landing')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '6px 0', minHeight: '44px' }}
                    >
                      <ChevronLeft size={16} /> Back to Booking Options
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                      Step 1 of 5
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                      Select a Hospital
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Showing hospitals in <strong style={{ color: 'var(--color-accent)' }}>{profile?.district || user?.district || 'your'} District</strong>
                    </p>
                  </div>

                  {/* Search Bar for Hospitals */}
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search hospital by name or area..."
                      value={hospitalSearch}
                      onChange={e => setHospitalSearch(e.target.value)}
                      style={{ paddingLeft: 36, minHeight: '44px' }}
                    />
                  </div>

                  {/* Hospital List */}
                  {hospLoading ? (
                    <SkeletonTable rows={3} />
                  ) : filteredDistrictHospitals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <Building2 size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No hospitals found</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        No hospitals match your search in {profile?.district || user?.district || 'this'} district.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {filteredDistrictHospitals.map(h => (
                        <HospitalCard
                          key={h.id}
                          hospital={h}
                          selected={selectedHospital?.id === h.id}
                          onSelect={() => handleSelectHospital(h)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: SELECT SPECIALIST / DEPARTMENT ── */}
              {manualStep === 2 && selectedHospital && (
                <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setManualStep(1)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '6px 0', minHeight: '44px' }}
                    >
                      <ChevronLeft size={16} /> Back to Hospitals
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                      Step 2 of 5
                    </span>
                  </div>

                  {/* Selected Hospital Header Pill */}
                  <div style={{ padding: '12px 16px', background: 'rgba(6,182,212,0.08)', borderRadius: 10, border: '1px solid rgba(6,182,212,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 700 }}>Selected Hospital</p>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{selectedHospital.name}</p>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: 2 }} /> {selectedHospital.district}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                      Select Department / Specialization
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Choose a medical department to view available doctors
                    </p>
                  </div>

                  {/* Department Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }} className="dept-grid">
                    {(selectedHospital.departments?.length ? selectedHospital.departments : [
                      'General Medicine', 'Cardiology', 'Neurology', 'Pediatrics',
                      'Orthopedics', 'Dermatology', 'ENT', 'Gynecology'
                    ]).map(dept => {
                      const icon = DEPT_ICONS[dept] || DEPT_ICONS['Default'];
                      const isSelected = selectedDepartment === dept;
                      return (
                        <div
                          key={dept}
                          onClick={() => handleSelectDepartment(dept)}
                          className="glass-card glow-active"
                          style={{
                            padding: '16px',
                            borderRadius: 12,
                            cursor: 'pointer',
                            border: isSelected ? '1.5px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.06)',
                            background: isSelected ? 'rgba(6,182,212,0.15)' : 'rgba(30,41,66,0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: 8,
                            transition: 'var(--transition-smooth)',
                            minHeight: '80px',
                            justifyContent: 'center'
                          }}
                        >
                          <span style={{ fontSize: '1.6rem' }}>{icon}</span>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--color-accent)' : 'var(--text-primary)' }}>
                            {dept}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP 3: SELECT DOCTOR ── */}
              {manualStep === 3 && selectedHospital && selectedDepartment && (
                <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setManualStep(2)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '6px 0', minHeight: '44px' }}
                    >
                      <ChevronLeft size={16} /> Back to Departments
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                      Step 3 of 5
                    </span>
                  </div>

                  {/* Context Header */}
                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 700 }}>{selectedHospital.name}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-accent)', marginTop: 2 }}>Department: <strong>{selectedDepartment}</strong></p>
                    </div>
                    <button onClick={() => setManualStep(2)} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                      Change
                    </button>
                  </div>

                  <div>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                      Choose a Doctor
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Select an available specialist to view real-time time slots
                    </p>
                  </div>

                  {/* Doctors List */}
                  {doctorsLoading ? (
                    <SkeletonTable rows={2} />
                  ) : doctorsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <AlertTriangle size={32} color="var(--color-warning)" style={{ margin: '0 auto 10px' }} />
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>
                        No doctors are currently available for this department.
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Please choose another medical department or select a different hospital.
                      </p>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setManualStep(2)} className="btn-primary" style={{ fontSize: '0.85rem', minHeight: '44px' }}>
                          Choose Another Department
                        </button>
                        <button onClick={() => setManualStep(1)} className="btn-secondary" style={{ fontSize: '0.85rem', minHeight: '44px' }}>
                          Choose Another Hospital
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {doctorsList.map(doc => (
                        <DoctorCard
                          key={doc.id}
                          doctor={doc}
                          selected={selectedDoctor?.id === doc.id}
                          onSelect={() => handleDoctorSelect(doc)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: REAL-TIME DATE & TIME SLOTS ── */}
              {manualStep === 4 && selectedDoctor && selectedHospital && (
                <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setManualStep(3)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '6px 0', minHeight: '44px' }}
                    >
                      <ChevronLeft size={16} /> Back to Doctors
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                      Step 4 of 5
                    </span>
                  </div>

                  {/* Doctor Profile Header */}
                  <div style={{ padding: '14px', background: 'rgba(6,182,212,0.08)', borderRadius: 12, border: '1px solid rgba(6,182,212,0.2)', display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="doctor-avatar" style={{ width: 46, height: 46, fontSize: '1.2rem', flexShrink: 0 }}>
                      {selectedDoctor.name?.charAt(0) || 'D'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedDoctor.name}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {selectedDoctor.department} · {selectedHospital.name}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 600, marginTop: 2 }}>
                        Fee: ₹{selectedDoctor.consultation_fee || 500}
                      </p>
                    </div>
                  </div>

                  {/* Optional AI Smart Recommendation Box */}
                  {recommendingSlots ? (
                    <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(168,85,247,0.06)', borderRadius: 10 }}>
                      <Loader2 size={20} className="spin" style={{ color: '#c084fc', margin: '0 auto 6px' }} />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI Smart Scheduler is finding the best slots...</p>
                    </div>
                  ) : (
                    <RecommendationCard
                      recommendations={aiRecommendations}
                      selectedSlot={appointmentDate}
                      onSelect={(dt) => handleSelectSlot(dt)}
                    />
                  )}

                  {/* Real-time Dynamic Slot Calendar */}
                  <AppointmentCalendar
                    doctorId={selectedDoctor.id}
                    selectedSlot={appointmentDate}
                    onSelectSlot={(dt) => handleSelectSlot(dt)}
                  />
                </div>
              )}

              {/* ── STEP 5: CONFIRMATION & SUBMIT REQUEST ── */}
              {manualStep === 5 && selectedDoctor && selectedHospital && appointmentDate && (
                <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setManualStep(4)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '6px 0', minHeight: '44px' }}
                    >
                      <ChevronLeft size={16} /> Back to Calendar
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                      Step 5 of 5
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                      Appointment Summary
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Please review your details before requesting this appointment
                    </p>
                  </div>

                  {/* Summary Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }} className="summary-grid">
                    <div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patient</p>
                      <p style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: 2 }}>{profile?.name || user?.username}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hospital</p>
                      <p style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: 2 }}>{selectedHospital.name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Department</p>
                      <p style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: 2 }}>{selectedDepartment || selectedDoctor.department}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Doctor</p>
                      <p style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: 2 }}>{selectedDoctor.name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consultation Fee</p>
                      <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-success)', marginTop: 2 }}>₹{selectedDoctor.consultation_fee || 500}</p>
                    </div>
                  </div>

                  {/* Selected Slot Highlight Box */}
                  <div style={{ padding: '16px', background: 'rgba(6,182,212,0.1)', borderRadius: 12, border: '1px solid rgba(6,182,212,0.3)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
                      Selected Date & Time
                    </p>
                    <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                      {new Date(appointmentDate).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Notes / Reason Form */}
                  <form onSubmit={handleRequestBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Notes / Symptoms (Optional)
                      </label>
                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Briefly describe your symptoms or purpose of consultation..."
                        value={appointmentNotes}
                        onChange={e => setAppointmentNotes(e.target.value)}
                        style={{ padding: '12px', borderRadius: 10 }}
                      />
                    </div>

                    {/* Workflow Info Alert */}
                    <div style={{ padding: '12px 14px', background: 'rgba(249,115,22,0.08)', borderRadius: 10, border: '1px solid rgba(249,115,22,0.25)', fontSize: '0.78rem', color: '#fb923c', lineHeight: 1.4 }}>
                      <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                      <strong>Next Step:</strong> Submitting creates an appointment request for the doctor/receptionist to review and confirm. Once approved, your live Queue Token will be generated.
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ justifyContent: 'center', minHeight: 48, fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(6,182,212,0.3)' }}
                      disabled={booking}
                    >
                      {booking ? <><Loader2 size={18} className="spin" /> Submitting Request...</> : 'Request Appointment'}
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: ACTIVE BOOKINGS & REQUESTS ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 680 }}>

          {/* Live Queue Tracker */}
          <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              <Activity size={16} style={{ display: 'inline', marginRight: 6, color: 'var(--color-accent)' }} />
              Live Queue Tracker
            </h4>
            {scheduledAppts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>No active appointments in queue.<br />Book an appointment to see your live position here.</p>
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
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                No requests yet. Use "Book Appointment" to request a slot.
              </p>
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

                      {/* Doctor suggested alternate slot */}
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
                              style={{ fontSize: '0.75rem', padding: '8px 14px', minHeight: '44px', background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                            >
                              ✓ Accept & Generate Token
                            </button>
                            <button
                              onClick={() => handleRespondSuggestion(req.id, 'DECLINE')}
                              style={{ fontSize: '0.75rem', padding: '8px 14px', minHeight: '44px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: MEDICAL HISTORY ── */}
      {/* ════════════════════════════════════════════════════════════ */}
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
