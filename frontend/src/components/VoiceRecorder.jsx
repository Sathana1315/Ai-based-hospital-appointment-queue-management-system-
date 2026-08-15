import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Animated waveform bars (active during recording)
const Waveform = () => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="wave-bar"
        style={{
          height: `${Math.random() * 60 + 40}%`,
          animationDelay: `${i * 0.1}s`
        }}
      />
    ))}
  </div>
);

const VoiceRecorder = ({ onAnalysisComplete }) => {
  const { API_BASE_URL } = useAuth();
  const [isRecording, setIsRecording]         = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [analysisResult, setAnalysisResult]   = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const timerRef         = useRef(null);

  // Clean up on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startRecording = async () => {
    setError('');
    setAnalysisResult(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await uploadAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch {
      setError('Microphone access denied. Please allow mic permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const uploadAudio = async (blob) => {
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', blob, 'symptoms.webm');
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/voice-symptoms`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAnalysisResult(res.data);
      onAnalysisComplete(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze voice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setAnalysisResult(null);
    setError('');
    setRecordingDuration(0);
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      textAlign: 'center',
      border: '1px solid rgba(6,182,212,0.25)',
      background: 'linear-gradient(145deg, rgba(6,182,212,0.03), rgba(19,27,46,0.7))'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>AI Voice Symptom Checker</h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.5 }}>
        Press the mic and speak your symptoms aloud. Our AI will recommend the right medical department.
      </p>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: 'var(--color-danger)', fontSize: '0.82rem', maxWidth: 380, textAlign: 'left' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Result display */}
      {analysisResult && !loading && (
        <div style={{ width: '100%', maxWidth: 380, padding: '14px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, textAlign: 'left' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Analysis Complete</p>
          {analysisResult.transcription && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 8 }}>"{analysisResult.transcription}"</p>
          )}
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recommended: <span style={{ color: 'var(--color-accent)' }}>{analysisResult.recommended_specialty}</span>
          </p>
          {analysisResult.reason && (
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 6 }}>{analysisResult.reason}</p>
          )}
          <button onClick={handleRetry} className="btn-secondary" style={{ marginTop: 10, fontSize: '0.75rem', padding: '5px 12px', border: 'none' }}>
            <RefreshCw size={12} /> Record Again
          </button>
        </div>
      )}

      {/* Recording UI */}
      {!analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {isRecording && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block', animation: 'pulse-glow 1s infinite' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-danger)' }}>Recording {fmt(recordingDuration)}</span>
              </div>
              <Waveform />
            </div>
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            style={{
              width: 80, height: 80, borderRadius: '50%', border: 'none',
              background: loading
                ? 'rgba(30,41,66,0.5)'
                : isRecording
                  ? 'linear-gradient(135deg, var(--color-danger) 0%, #b91c1c 100%)'
                  : 'linear-gradient(135deg, var(--color-accent) 0%, #0284c7 100%)',
              color: '#fff',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: isRecording
                ? '0 0 24px rgba(239,68,68,0.5)'
                : '0 4px 18px rgba(6,182,212,0.35)',
              transition: 'all 0.25s ease',
              position: 'relative'
            }}
          >
            {loading
              ? <Loader2 size={30} className="animate-spin" />
              : isRecording
                ? <Square size={28} fill="#fff" />
                : <Mic size={30} />
            }
            {isRecording && (
              <div style={{ position: 'absolute', width: 96, height: 96, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.4)', animation: 'pulse-glow 1.5s infinite', pointerEvents: 'none' }} />
            )}
          </button>

          {loading && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              AI is analyzing your voice...
            </p>
          )}

          {!isRecording && !loading && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tap to start recording</p>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
