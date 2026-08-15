import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, HelpCircle, MapPin } from 'lucide-react';

const Login = () => {
  const { login, register, initGuest } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // login | register | guest
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    e.preventDefault();
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
      minHeight: '80vh',
      width: '100%',
      fontFamily: 'var(--font-body)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img src="/logo.png" alt="Q-Med Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} className="glow-active" />
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>Welcome to Q-Med</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>AI Hospital Appointment & Queue System</p>
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
                transition: 'var(--transition-smooth)'
              }}
            >
              {tab === 'guest' ? 'Guest Booking' : tab}
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

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Username or Email</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username or email"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
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
              />
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '10px' }}>
              <LogIn size={18} /> Sign In
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Test Credentials: receptionist / staff123 (Receptionist) | dr_smith / doctor123 (Doctor)
            </div>
          </form>
        )}

        {/* Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Choose username"
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="email@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Role Type</label>
              <select
                className="form-input"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Dr. or Patient Full Name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            {regRole === 'patient' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Contact Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Enter phone number"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Age</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Age"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Gender</label>
                    <select
                      className="form-input"
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>District (Location)</label>
                  <select
                    className="form-input"
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '10px' }}>
              <UserPlus size={18} /> Complete Registration
            </button>
          </form>
        )}

        {/* Guest Booking Mode */}
        {activeTab === 'guest' && (
          <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              If you don't want to create an account, you can book an appointment instantly using a temporary guest session. Your session expires after 24 hours.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} style={{ color: 'var(--color-accent)' }} /> Select Your District
              </label>
              <select
                className="form-input"
                value={guestDistrict}
                onChange={(e) => setGuestDistrict(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {districts.map((d) => (
                  <option key={d} value={d}>{d} District</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '10px' }}>
              <HelpCircle size={18} /> Initialize Guest Session
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
