import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import AnalyticsChart from '../components/AnalyticsChart';
import axios from 'axios';
import {
  Shield, Building2, UserCheck, Plus, Star, Eye, EyeOff,
  RefreshCw, BarChart2, Users, Activity, TrendingUp, Stethoscope, Settings
} from 'lucide-react';

const AdminDashboard = () => {
  const { API_BASE_URL } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');

  const [hospitals, setHospitals] = useState([]);
  const [doctors,   setDoctors]   = useState([]);
  const [patients,  setPatients]  = useState([]);
  const [stats,     setStats]     = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [settings,  setSettings]  = useState({});
  const [loading,   setLoading]   = useState(true);

  // Hospital form
  const [showHospForm,  setShowHospForm]  = useState(false);
  const [hospName,      setHospName]      = useState('');
  const [hospDistrict,  setHospDistrict]  = useState('Central');
  const [hospRating,    setHospRating]    = useState('4.5');
  const [hospDepts,     setHospDepts]     = useState('');
  const [hospAddr,      setHospAddr]      = useState('');
  const [hospEmail,     setHospEmail]     = useState('');
  const [hospEmergency, setHospEmergency] = useState(false);

  // Doctor form
  const [showDocForm,  setShowDocForm]   = useState(false);
  const [docUsername,  setDocUsername]   = useState('');
  const [docEmail,     setDocEmail]      = useState('');
  const [docPass,      setDocPass]       = useState('');
  const [docName,      setDocName]       = useState('');
  const [docHospId,    setDocHospId]     = useState('');
  const [docDept,      setDocDept]       = useState('');
  const [docRating,    setDocRating]     = useState('4.8');
  const [docQual,      setDocQual]       = useState('');
  const [docExp,       setDocExp]        = useState('');
  const [docFee,       setDocFee]        = useState('');
  const [docLangs,     setDocLangs]      = useState('');

  const DISTRICTS = ['Central', 'North', 'South', 'East', 'West'];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hospRes, docRes, patRes, statRes, analRes, setRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/hospitals`),
        axios.get(`${API_BASE_URL}/doctors`),
        axios.get(`${API_BASE_URL}/admin/patients`),
        axios.get(`${API_BASE_URL}/admin/stats`),
        axios.get(`${API_BASE_URL}/admin/analytics`),
        axios.get(`${API_BASE_URL}/settings`)
      ]);
      setHospitals(hospRes.data);
      setDoctors(docRes.data);
      setPatients(patRes.data);
      setStats(statRes.data);
      setAnalytics(analRes.data);
      setSettings(setRes.data);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    const deptsArray = hospDepts.split(',').map(d => d.trim()).filter(Boolean);
    try {
      await axios.post(`${API_BASE_URL}/hospitals`, {
        name: hospName, district: hospDistrict,
        rating: parseFloat(hospRating), departments: deptsArray, address: hospAddr,
        email: hospEmail, emergency_support: hospEmergency
      });
      showToast('Hospital created successfully!', 'success');
      setHospName(''); setHospDepts(''); setHospAddr(''); setHospEmail(''); setHospEmergency(false); setShowHospForm(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create hospital.', 'error');
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    const langArray = docLangs ? docLangs.split(',').map(d => d.trim()).filter(Boolean) : [];
    try {
      await axios.post(`${API_BASE_URL}/doctors`, {
        username: docUsername, email: docEmail, password: docPass,
        name: docName, hospital_id: docHospId,
        department: docDept, rating: parseFloat(docRating),
        qualification: docQual, experience: parseInt(docExp) || 0,
        consultation_fee: parseFloat(docFee) || 0.0,
        languages: langArray
      });
      showToast('Doctor registered successfully!', 'success');
      setDocUsername(''); setDocEmail(''); setDocPass(''); setDocName(''); setDocDept(''); setDocQual(''); setDocExp(''); setDocFee(''); setDocLangs('');
      setShowDocForm(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to register doctor.', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/settings`, settings);
      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save settings.', 'error');
    }
  };

  // ── Department breakdown (for analytics chart) ──
  const deptBreakdown = doctors.reduce((acc, doc) => {
    acc[doc.department] = (acc[doc.department] || 0) + 1;
    return acc;
  }, {});
  const maxDeptCount = Math.max(...Object.values(deptBreakdown), 1);

  const TABS = [
    { key: 'overview',  label: 'Overview',  icon: <BarChart2 size={14} /> },
    { key: 'hospitals', label: 'Hospitals', icon: <Building2 size={14} /> },
    { key: 'doctors',   label: 'Doctors',   icon: <Stethoscope size={14} /> },
    { key: 'patients',  label: 'Patients',  icon: <Users size={14} /> },
    { key: 'settings',  label: 'Settings',  icon: <Settings size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            System <span className="text-gradient">Administration</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage hospitals, doctors, patients, and view analytics.
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview (Stats + Analytics) ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {loading || !stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} lines={2} />)}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {[
                  { icon: <Building2 size={22} />, label: 'Hospitals', value: stats.hospitals, color: 'var(--color-accent)' },
                  { icon: <UserCheck size={22} />,  label: 'Doctors',   value: stats.doctors,   color: 'var(--color-success)' },
                  { icon: <Users size={22} />,      label: 'Patients',  value: stats.patients,  color: '#a855f7' },
                  { icon: <Activity size={22} />,   label: "Today's Appts",  value: stats.appointments_today,  color: 'var(--color-warning)' },
                  { icon: <TrendingUp size={22} />, label: 'Completed Today', value: stats.completed_today, color: 'var(--color-success)' },
                  { icon: <Shield size={22} />,     label: 'Pending Requests', value: stats.pending_requests, color: 'var(--color-danger)' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <p className="stat-number" style={{ color: s.color }}>{s.value}</p>
                    <p className="stat-label">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Doctor Status Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <div className="glass-panel" style={{ padding: '22px' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 16 }}>Doctor Availability</h4>
                  {[
                    { label: 'Available', count: stats.doctor_status.available, color: 'var(--color-success)' },
                    { label: 'Busy',      count: stats.doctor_status.busy,      color: 'var(--color-danger)' },
                    { label: 'Offline',   count: stats.doctor_status.offline,   color: 'var(--text-muted)' },
                  ].map(s => (
                    <div key={s.label} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 5 }}>
                        <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{s.count} / {stats.doctors}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: s.color, width: `${stats.doctors > 0 ? (s.count / stats.doctors) * 100 : 0}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Department breakdown */}
                <div className="glass-panel" style={{ padding: '22px' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 16 }}>Doctors by Department</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(deptBreakdown).sort(([, a], [, b]) => b - a).map(([dept, count]) => (
                      <div key={dept}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{dept}</span>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{count}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, var(--color-accent), #3b82f6)', width: `${(count / maxDeptCount) * 100}%`, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {analytics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginTop: 10 }}>
                  <AnalyticsChart data={analytics.daily_appointments} title="Daily Appointments" color="var(--color-accent)" />
                  <AnalyticsChart data={analytics.revenue} title="Revenue Trend ($)" color="var(--color-success)" />
                  <AnalyticsChart data={analytics.doctor_workload} title="Doctor Workload (Patients)" color="var(--color-warning)" />
                  <AnalyticsChart data={analytics.department_popularity} title="Department Popularity" color="var(--color-danger)" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Hospitals ── */}
      {activeTab === 'hospitals' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Hospitals Registry</h4>
            <button onClick={() => setShowHospForm(!showHospForm)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              {showHospForm ? <><EyeOff size={12} /> Close</> : <><Plus size={12} /> Add Hospital</>}
            </button>
          </div>

          {showHospForm && (
            <form onSubmit={handleCreateHospital} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: 'rgba(0,0,0,0.15)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hospital Name</label>
                <input type="text" className="form-input" placeholder="e.g. City General Hospital" value={hospName} onChange={e => setHospName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>District</label>
                  <select className="form-input" value={hospDistrict} onChange={e => setHospDistrict(e.target.value)}>
                    {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating</label>
                  <input type="number" step="0.1" min="1" max="5" className="form-input" value={hospRating} onChange={e => setHospRating(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Departments (comma-separated)</label>
                <input type="text" className="form-input" placeholder="Cardiology, Pediatrics, Neurology" value={hospDepts} onChange={e => setHospDepts(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Address</label>
                  <input type="text" className="form-input" placeholder="100 Main Street" value={hospAddr} onChange={e => setHospAddr(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email</label>
                  <input type="email" className="form-input" placeholder="info@hospital.com" value={hospEmail} onChange={e => setHospEmail(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input type="checkbox" id="hospEmg" checked={hospEmergency} onChange={e => setHospEmergency(e.target.checked)} />
                <label htmlFor="hospEmg" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Has 24/7 Emergency Support</label>
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '10px', marginTop: 6 }}>Save Hospital</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 450, overflowY: 'auto' }}>
            {loading ? <SkeletonTable rows={3} /> : hospitals.map(h => (
              <div key={h.id} className="glass-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{h.name}</p>
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 4 }}>{h.address} · {h.district}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {h.departments?.map(d => (
                        <span key={d} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 10, background: 'rgba(6,182,212,0.08)', color: 'var(--color-accent)', border: '1px solid rgba(6,182,212,0.15)' }}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <span style={{ color: 'var(--color-warning)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={12} fill="currentColor" /> {h.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Doctors ── */}
      {activeTab === 'doctors' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Doctors Directory</h4>
            <button onClick={() => setShowDocForm(!showDocForm)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              {showDocForm ? <><EyeOff size={12} /> Close</> : <><Plus size={12} /> Register Doctor</>}
            </button>
          </div>

          {showDocForm && (
            <form onSubmit={handleCreateDoctor} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: 'rgba(0,0,0,0.15)', borderRadius: 10, border: '1px solid var(--border-color)', maxHeight: 380, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Username</label>
                  <input type="text" className="form-input" placeholder="dr_watson" value={docUsername} onChange={e => setDocUsername(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email</label>
                  <input type="email" className="form-input" placeholder="watson@hospital.com" value={docEmail} onChange={e => setDocEmail(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Password</label>
                <input type="password" className="form-input" placeholder="Min 6 characters" value={docPass} onChange={e => setDocPass(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" className="form-input" placeholder="Dr. John Watson" value={docName} onChange={e => setDocName(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hospital</label>
                <select className="form-input" value={docHospId} onChange={e => setDocHospId(e.target.value)} required>
                  <option value="">-- Select Hospital --</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Department</label>
                  <input type="text" className="form-input" placeholder="Cardiology" value={docDept} onChange={e => setDocDept(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Exp (yrs)</label>
                  <input type="number" className="form-input" placeholder="10" value={docExp} onChange={e => setDocExp(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rating</label>
                  <input type="number" step="0.1" min="1" max="5" className="form-input" value={docRating} onChange={e => setDocRating(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Qualification</label>
                  <input type="text" className="form-input" placeholder="MBBS, MD" value={docQual} onChange={e => setDocQual(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Consultation Fee</label>
                  <input type="number" className="form-input" placeholder="100" value={docFee} onChange={e => setDocFee(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Languages</label>
                  <input type="text" className="form-input" placeholder="English, Spanish" value={docLangs} onChange={e => setDocLangs(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '10px', marginTop: 6 }}>Register Doctor</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 450, overflowY: 'auto' }}>
            {loading ? <SkeletonTable rows={3} /> : doctors.map(doc => (
              <div key={doc.id} className="glass-card" style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="doctor-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>{doc.name?.charAt(0)}</div>
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{doc.name}</p>
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 2 }}>{doc.hospital_name} · {doc.department}</p>
                    {doc.qualification && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{doc.qualification}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--color-warning)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Star size={11} fill="currentColor" style={{ display: 'inline', marginRight: 3 }} />{doc.rating}
                  </span>
                  <span className={`status-badge status-${doc.status.toLowerCase()}`} style={{ fontSize: '0.68rem' }}>{doc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Patients ── */}
      {activeTab === 'patients' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            Registered Patients ({patients.length})
          </h4>
          {loading ? <SkeletonTable rows={4} /> : patients.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '30px', fontStyle: 'italic' }}>No registered patients yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
              {patients.map(p => (
                <div key={p.id} className="glass-card" style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="doctor-avatar" style={{ width: 38, height: 38, fontSize: '0.95rem', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>{p.name?.charAt(0)}</div>
                    <div>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>{p.name}</p>
                      <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.district || 'No district'} · Age: {p.age || 'N/A'} · {p.gender || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {p.medical_history?.length || 0} visits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Settings ── */}
      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 10 }}>System Settings</h4>
          <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Consultation Duration (mins)</label>
              <input type="number" className="form-input" value={settings.consultation_duration_min || 15} onChange={e => setSettings({...settings, consultation_duration_min: parseInt(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hospital Working Hours</label>
              <input type="text" className="form-input" value={settings.hospital_working_hours || ''} onChange={e => setSettings({...settings, hospital_working_hours: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max Daily Appointments</label>
              <input type="number" className="form-input" value={settings.max_daily_appointments || 100} onChange={e => setSettings({...settings, max_daily_appointments: parseInt(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
              <input type="checkbox" checked={settings.emergency_mode || false} onChange={e => setSettings({...settings, emergency_mode: e.target.checked})} style={{ width: 18, height: 18, accentColor: 'var(--color-danger)' }} />
              <label style={{ fontSize: '0.9rem', color: 'var(--color-danger)', fontWeight: 600 }}>Enable Emergency Mode</label>
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
              <button type="submit" className="btn-primary">Save Settings</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
