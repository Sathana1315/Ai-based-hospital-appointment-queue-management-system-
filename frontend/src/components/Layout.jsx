import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LogOut, HeartPulse, Shield, User, Stethoscope, Bell, CheckCircle, Info, XCircle, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import SearchBar from './SearchBar';

const Layout = ({ children }) => {
  const { user, logout, API_BASE_URL } = useAuth();
  const { lastMessage } = useWebSocket();
  const [showNotifs, setShowNotifs]     = useState(false);
  const [notifs, setNotifs]             = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [filterType, setFilterType]     = useState('all'); // all, unread
  const notifPanelRef = useRef(null);
  const intervalRef   = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifCount();
    }
  }, [user]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'NEW_NOTIFICATION') {
      fetchNotifCount();
      if (showNotifs) {
        fetchNotifications();
      }
    }
  }, [lastMessage, showNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifCount = async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/notifications/unread-count`);
      setUnreadCount(r.data.unread_count);
    } catch { /* silent */ }
  };

  const fetchNotifications = async () => {
    try {
      const url = filterType === 'unread' ? `${API_BASE_URL}/notifications?read=false` : `${API_BASE_URL}/notifications`;
      const r = await axios.get(url);
      setNotifs(r.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (showNotifs) {
      fetchNotifications();
    }
  }, [filterType]);

  const toggleNotifs = async () => {
    if (!showNotifs) {
      await fetchNotifications();
      setShowNotifs(true);
    } else {
      setShowNotifs(false);
    }
  };

  const markRead = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/mark-all-read`);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE_URL}/notifications/${id}`);
      setNotifs(prev => prev.filter(n => n.id !== id));
      fetchNotifCount();
    } catch { /* silent */ }
  };

  const clearAllNotifs = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications`);
      setNotifs([]);
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const getRoleIcon = () => {
    if (!user) return null;
    switch (user.role) {
      case 'doctor':       return <Stethoscope size={17} style={{ color: 'var(--color-accent)' }} />;
      case 'receptionist':
      case 'admin':        return <Shield size={17} style={{ color: 'var(--color-success)' }} />;
      default:             return <User size={17} style={{ color: 'var(--color-accent)' }} />;
    }
  };

  const NOTIF_ICONS = {
    success: <CheckCircle size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />,
    error:   <XCircle size={14} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />,
    warning: <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />,
    info:    <Info size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <header className="glass-panel" style={{
        position: 'sticky', top: 15, margin: '15px 20px',
        padding: '12px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 200, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HeartPulse size={28} className="glow-active" style={{ color: 'var(--color-accent)' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              Q-<span className="text-gradient">Med</span>
            </h1>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              AI Queue Management
            </span>
          </div>
        </div>

        {/* Right side */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            
            {/* Global Search Bar */}
            {user.role !== 'guest' && (
              <div style={{ marginRight: 10 }}>
                <SearchBar onSelect={(item) => console.log('Selected:', item)} />
              </div>
            )}

            {/* User badge */}
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: '0.85rem', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {getRoleIcon()}
              <span style={{ fontWeight: 500 }}>{user.username}</span>
              <span style={{
                fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.08)',
                padding: '2px 8px', borderRadius: 10, textTransform: 'capitalize',
                color: user.role === 'doctor' ? 'var(--color-accent)' : user.role === 'admin' || user.role === 'receptionist' ? 'var(--color-success)' : 'var(--text-secondary)'
              }}>
                {user.role}
              </span>
            </div>

            {/* Notification Bell */}
            <div ref={notifPanelRef} style={{ position: 'relative' }}>
              <button
                onClick={toggleNotifs}
                style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, width: 38, height: 38, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'var(--transition-smooth)' }}
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div style={{
                  position: 'absolute', top: 46, right: 0,
                  width: 340, maxHeight: 420,
                  background: 'rgba(13,20,38,0.97)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  zIndex: 300,
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Header */}
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h5 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-display)' }}>Notifications</h5>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} style={{ fontSize: '0.72rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            Mark all read
                          </button>
                        )}
                        {notifs.length > 0 && (
                          <button onClick={clearAllNotifs} style={{ fontSize: '0.72rem', color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setFilterType('all')} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: filterType === 'all' ? 'rgba(6,182,212,0.1)' : 'transparent', color: filterType === 'all' ? 'var(--color-accent)' : 'var(--text-secondary)', cursor: 'pointer' }}>All</button>
                      <button onClick={() => setFilterType('unread')} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: filterType === 'unread' ? 'rgba(6,182,212,0.1)' : 'transparent', color: filterType === 'unread' ? 'var(--color-accent)' : 'var(--text-secondary)', cursor: 'pointer' }}>Unread</button>
                    </div>
                  </div>

                  {/* List */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        No notifications yet.
                      </div>
                    ) : notifs.map(n => (
                      <div
                        key={n.id}
                        onClick={() => !n.read && markRead(n.id)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: n.read ? 'transparent' : 'rgba(6,182,212,0.05)',
                          cursor: n.read ? 'default' : 'pointer',
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <span style={{ marginTop: 2 }}>{NOTIF_ICONS[n.type] || NOTIF_ICONS.info}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', fontWeight: n.read ? 400 : 600, lineHeight: 1.3, color: 'var(--text-primary)' }}>{n.title}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.3 }}>{n.message}</p>
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0, marginTop: 5 }} />}
                          <button onClick={(e) => deleteNotif(n.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }} title="Delete">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button onClick={logout} className="btn-secondary" style={{ padding: '8px 12px', borderRadius: '50%', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Logout">
              <LogOut size={16} style={{ color: 'var(--color-danger)' }} />
            </button>
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '20px', maxWidth: 1240, margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      {/* ── Footer ── */}
      <footer style={{ textAlign: 'center', padding: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', marginTop: 40 }}>
        © 2026 Q-Med AI Clinic Queue &nbsp;·&nbsp; React + FastAPI + MongoDB Atlas + Groq
      </footer>
    </div>
  );
};

export default Layout;
