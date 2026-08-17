import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogIn, UserPlus, HelpCircle, MapPin, Stethoscope,
  Shield, User, Sparkles, Loader2, KeyRound, Zap
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'patient',
    label: 'Patient',
    username: 'patient_demo',
    password: 'patient123',
    icon: <User size={16} />,
    color: 'var(--color-accent)',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.3)',
    desc: 'Bookings & Queue'
  },
  {
    role: 'doctor',
    label: 'Doctor',
    username: 'dr_smith_central',
    password: 'doctor123',
    icon: <Stethoscope size={16} />,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.1)',
    border: 'rgba(56, 189, 248, 0.3)',
    desc: 'Appointments & Consult'
  },
  {
    role: 'receptionist',
    label: 'Receptionist',
    username: 'receptionist',
    password: 'staff123',
    icon: <Shield size={16} />,
    color: 'var(--color-success)',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    desc: 'Queue & Approvals'
  },
  {
    role: 'admin',
    label: 'Admin',
    username: 'admin',
    password: 'admin123',
    icon: <KeyRound size={16} />,
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.1)',
    border: 'rgba(192, 132, 252, 0.3)',
    desc: 'System & Analytics'
  }
];

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const Login = () => {
  const { login, googleLogin, register, initGuest } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // login | register | guest
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [quickLoadingRole, setQuickLoadingRole] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);

  // Google Sign-In callback
  const handleGoogleCallback = useCallback(async (response) => {
    if (!response.credential) {
      setError('Google authentication was cancelled.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    try {
      const result = await googleLogin(response.credential);
      if (!result.success) {
        setError(result.error);
      }
    } catch {
      setError('Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLogin]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const initGSI = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };
    // GSI script may load async
    if (window.google?.accounts?.id) {
      initGSI();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          initGSI();
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [handleGoogleCallback]);

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured.');
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: use popup flow via google.accounts.oauth2
          // This happens when third-party cookies are blocked
          setError('');
          setGoogleLoading(true);
          const client = window.google.accounts.oauth2.initCodeClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            ux_mode: 'popup',
            callback: async (response) => {
              if (response.error) {
                setError('Google authentication was cancelled.');
                setGoogleLoading(false);
                return;
              }
              // For code flow we need the ID token, use credential endpoint instead
              setError('Please allow popups and try again, or use email/password login.');
              setGoogleLoading(false);
            },
          });
          client.requestCode();
        }
      });
    } else {
      setError('Google Sign-In is loading. Please wait a moment and try again.');
    }
  };

  // Login form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form state
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('patient');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDistrict, setRegDistrict] = useState('Central');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');

  // Guest state
  const [guestDistrict, setGuestDistrict] = useState('Central');

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!loginUser || !loginPass) {
      setError('Please fill in all fields');
      return;
    }
    const result = await login(loginUser, loginPass);
    if (!result.success) {
      setError(result.error);
    }
  };

  const handleQuickLogin = async (acc) => {
    setError('');
    setSuccessMsg('');
    setQuickLoadingRole(acc.role);
    setLoginUser(acc.username);
    setLoginPass(acc.password);
    try {
      const result = await login(acc.username, acc.password);
      if (!result.success) {
        setError(result.error);
      }
    } catch {
      setError('Quick login failed.');
    } finally {
      setQuickLoadingRole(null);
    }
  };

  const handleQuickGuest = async () => {
    setError('');
    setSuccessMsg('');
    setQuickLoadingRole('guest');
    try {
      const result = await initGuest('Central');
      if (!result.success) {
        setError(result.error);
      }
    } catch {
      setError('Guest login failed.');
    } finally {
      setQuickLoadingRole(null);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regUser || !regEmail || !regPass || !regName) {
      setError('Username, Email, Password, and Full Name are required.');
      return;
    }

    const payload = {
      username: regUser,
      email: regEmail,
      password: regPass,
      role: regRole,
      name: regName,
      phone: regPhone,
      district: regRole === 'patient' ? regDistrict : undefined,
      age: regRole === 'patient' && regAge ? parseInt(regAge) : undefined,
      gender: regRole === 'patient' ? regGender : undefined
    };

    const result = await register(payload);
    if (result.success) {
      setSuccessMsg('Registration successful! You can now log in using your credentials.');
      setActiveTab('login');
      // Clear registration inputs
      setRegUser(''); setRegEmail(''); setRegPass(''); setRegName(''); setRegPhone(''); setRegAge('');
    } else {
      setError(result.error);
    }
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!guestDistrict) {
      setError('Please select a district.');
      return;
    }
    const result = await initGuest(guestDistrict);
    if (!result.success) {
      setError(result.error);
    }
  };

  const districts = ['Central', 'North', 'South', 'East', 'West'];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '85vh',
      width: '100%',
      padding: '20px 10px',
      fontFamily: 'var(--font-body)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img src="/logo.png" alt="Q-Med Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} className="glow-active" />
          <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Welcome to Q-Med</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>AI Hospital Appointment & Queue System</p>
        </div>

        {/* ── ONE-CLICK DEMO LOGIN BAR ── */}
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(168,85,247,0.06))',
          border: '1px solid rgba(6,182,212,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={14} /> One-Click Demo Access
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Auto-logs in</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const isLoading = quickLoadingRole === acc.role;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  disabled={quickLoadingRole !== null}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${acc.border}`,
                    background: acc.bg,
                    color: '#fff',
                    cursor: quickLoadingRole !== null ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    minHeight: '44px'
                  }}
                  className="glow-active"
                  title={`Login as ${acc.label} (${acc.username})`}
                >
                  <div style={{ color: acc.color, display: 'flex', alignItems: 'center' }}>
                    {isLoading ? <Loader2 size={16} className="spin" /> : acc.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.2, color: acc.color }}>
                      {acc.label}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {acc.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Instant Guest Demo Button */}
          <button
            type="button"
            onClick={handleQuickGuest}
            disabled={quickLoadingRole !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px dashed rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-secondary)',
              cursor: quickLoadingRole !== null ? 'not-allowed' : 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              minHeight: '38px',
              transition: 'all 0.2s'
            }}
          >
            {quickLoadingRole === 'guest' ? <Loader2 size={14} className="spin" /> : <HelpCircle size={14} />}
            Instant Guest Session (No account needed)
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          {['login', 'register', 'guest'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                background: activeTab === tab ? 'var(--color-accent)' : 'none',
                color: activeTab === tab ? '#ffffff' : 'var(--text-secondary)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '0.85rem',
                textTransform: 'capitalize',
                transition: 'var(--transition-smooth)',
                minHeight: '38px'
              }}
            >
              {tab === 'guest' ? 'Custom Guest' : tab}
            </button>
          ))}
        </div>

        {/* Status Indicators */}
        {error && (
          <div style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--color-danger)',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: 'var(--color-success)',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            {successMsg}
          </div>
        )}

        {/* ── Login Form ── */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Username or Email</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter username or email"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
                style={{ minHeight: '44px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                required
                style={{ minHeight: '44px' }}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px', minHeight: '44px' }}>
              <LogIn size={18} /> Sign In
            </button>

            {/* ── OR Divider ── */}
            {GOOGLE_CLIENT_ID && (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '4px 0'
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>

                {/* ── Continue with Google Button ── */}
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={googleLoading}
                  ref={googleBtnRef}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#f1f5f9',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: googleLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '46px',
                    fontFamily: 'var(--font-body)',
                    opacity: googleLoading ? 0.7 : 1
                  }}
                  className="glow-active"
                >
                  {googleLoading ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  Continue with Google
                </button>
              </>
            )}
          </form>
        )}

        {/* ── Register Form ── */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Choose username"
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
                required
                style={{ minHeight: '40px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="email@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                style={{ minHeight: '40px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                required
                style={{ minHeight: '40px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Role Type</label>
              <select
                className="form-input"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                style={{ cursor: 'pointer', minHeight: '40px' }}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Full Name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                style={{ minHeight: '40px' }}
              />
            </div>

            {regRole === 'patient' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Contact Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Enter phone number"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    style={{ minHeight: '40px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Age</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Age"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      style={{ minHeight: '40px' }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Gender</label>
                    <select
                      className="form-input"
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                      style={{ minHeight: '40px' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>District (Location)</label>
                  <select
                    className="form-input"
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    style={{ minHeight: '40px' }}
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px', minHeight: '44px' }}>
              <UserPlus size={18} /> Complete Registration
            </button>
          </form>
        )}

        {/* ── Guest Booking Mode ── */}
        {activeTab === 'guest' && (
          <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              If you don't want to create an account, you can initialize a temporary guest session for instant hospital booking.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} style={{ color: 'var(--color-accent)' }} /> Select Your District
              </label>
              <select
                className="form-input"
                value={guestDistrict}
                onChange={(e) => setGuestDistrict(e.target.value)}
                style={{ cursor: 'pointer', minHeight: '44px' }}
              >
                {districts.map((d) => (
                  <option key={d} value={d}>{d} District</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '6px', minHeight: '44px' }}>
              <HelpCircle size={18} /> Start Guest Session
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
