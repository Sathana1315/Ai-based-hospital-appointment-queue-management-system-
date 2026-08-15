import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, User, Stethoscope } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SearchBar = ({ onSelect }) => {
  const { API_BASE_URL } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setResults(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (q) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/search/?q=${q}`);
      setResults(res.data);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 400 }} ref={dropdownRef}>
      <div style={{ 
        display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', 
        border: '1px solid var(--border-color)', borderRadius: '20px', padding: '8px 16px',
        transition: 'all 0.2s'
      }}>
        <Search size={18} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Search doctors, hospitals..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            background: 'transparent', border: 'none', color: '#fff', 
            outline: 'none', width: '100%', marginLeft: 10, fontSize: '0.9rem'
          }}
        />
        {loading && <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }}/>}
      </div>

      {results && (
        <div className="glass-panel" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8,
          maxHeight: 400, overflowY: 'auto', zIndex: 50, padding: '12px'
        }}>
          {results.hospitals?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Hospitals</p>
              {results.hospitals.map(h => (
                <div key={h.id} onClick={() => { onSelect({ type: 'hospital', data: h }); setResults(null); }} style={{ padding: '8px', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }} className="hover-bg">
                  <MapPin size={14} color="var(--color-accent)"/>
                  <span style={{ fontSize: '0.85rem' }}>{h.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {results.doctors?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Doctors</p>
              {results.doctors.map(d => (
                <div key={d.id} onClick={() => { onSelect({ type: 'doctor', data: d }); setResults(null); }} style={{ padding: '8px', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }} className="hover-bg">
                  <Stethoscope size={14} color="var(--color-success)"/>
                  <div>
                    <span style={{ fontSize: '0.85rem', display: 'block' }}>{d.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.department} • {d.hospital_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {results.patients?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Patients</p>
              {results.patients.map(p => (
                <div key={p.id} onClick={() => { onSelect({ type: 'patient', data: p }); setResults(null); }} style={{ padding: '8px', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }} className="hover-bg">
                  <User size={14} color="var(--color-warning)"/>
                  <span style={{ fontSize: '0.85rem' }}>{p.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {(!results.hospitals?.length && !results.doctors?.length && !results.patients?.length) && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No results found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
