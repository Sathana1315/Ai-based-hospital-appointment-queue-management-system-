import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import TimeSlot from './TimeSlot';
import { SkeletonCard } from './Skeleton';

const AppointmentCalendar = ({ doctorId, selectedSlot, onSelectSlot }) => {
  const { API_BASE_URL } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchSlots();
    }
  }, [doctorId, currentDate]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      // Need local date string YYYY-MM-DD
      const offset = currentDate.getTimezoneOffset()
      const dateLocal = new Date(currentDate.getTime() - (offset*60*1000))
      const dateStr = dateLocal.toISOString().split('T')[0]
      const res = await axios.get(`${API_BASE_URL}/appointments/slots/${doctorId}?date=${dateStr}`);
      setSlots(res.data.slots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const prevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    // Prevent going before today
    if (prev >= new Date(new Date().setHours(0,0,0,0))) {
      setCurrentDate(prev);
    }
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
          <CalendarIcon size={18} color="var(--color-accent)" />
          Select Appointment Slot
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={prevDay} disabled={isToday} style={{ background: 'transparent', border: 'none', color: isToday ? 'var(--text-muted)' : 'var(--color-accent)', cursor: isToday ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <button type="button" onClick={nextDay} style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonCard lines={2} />
      ) : slots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          No slots available on this date. Doctor may be on leave.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
          {slots.map((s, idx) => (
            <TimeSlot 
              key={idx} 
              time={s.time} 
              status={s.status} 
              selected={selectedSlot === s.datetime}
              onClick={() => onSelectSlot(s.datetime)}
            />
          ))}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px', fontSize: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)' }}></div> Available</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-warning)' }}></div> Booked</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-danger)' }}></div> Blocked/Break</span>
      </div>
    </div>
  );
};

export default AppointmentCalendar;
