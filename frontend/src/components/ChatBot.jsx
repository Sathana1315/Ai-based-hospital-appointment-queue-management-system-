import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';

const ChatBot = () => {
  const { token, API_BASE_URL, user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am Q-Med, your Personal Healthcare Assistant. I can help you book appointments, track request approval status, find specialists, guide health queries, or check hospital details!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  if (user?.role === 'guest') {
    return null; // Do not show AI ChatBot for guest users
  }

  const suggestions = [
    "What's my appointment status?",
    "Where is the hospital?",
    "Find another specialist",
    "Explain my symptoms",
    "General health guidance",
    "Show my prescriptions & history"
  ];

  // Listen to WebSocket events for real-time proactive assistant notifications
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'APPOINTMENT_APPROVED') {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ **Great News!** Doctor approved your appointment request!\n\n• **Queue Token:** #${lastMessage.queue_number}\n• **Est. Wait Time:** ~${lastMessage.estimated_wait_minutes || (lastMessage.queue_number * 15)} mins\n\nYou can track live queue position on your dashboard.`
        }
      ]);
    } else if (lastMessage.type === 'APPOINTMENT_REJECTED') {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ **Appointment Request Declined**\n\nThe doctor was unable to confirm your requested slot.\n**Reason:** ${lastMessage.reason || 'Doctor unavailable'}.\n\nWould you like me to find another available specialist for you?`
        }
      ]);
    } else if (lastMessage.type === 'DOCTOR_SUGGESTED_TIME') {
      const slotFormatted = new Date(lastMessage.suggested_slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `🗓️ **Doctor Proposed a New Time**\n\nThe doctor suggested an alternate slot:\n**${slotFormatted}**\n\nPlease check your dashboard to accept or decline this proposed slot.`
        }
      ]);
    }
  }, [lastMessage]);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-chatbot', handleOpenChat);
    return () => window.removeEventListener('open-chatbot', handleOpenChat);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e, customText = null) => {
    if (e) e.preventDefault();
    const text = customText || inputValue;
    if (!text.trim() || loading) return;

    const userMessage = text.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    if (!customText) setInputValue('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/chatbot`, {
        message: userMessage,
      });
      
      setMessages((prev) => [
        ...prev, 
        { 
          role: 'assistant', 
          content: response.data.reply, 
          ui_actions: response.data.ui_actions || [] 
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000, fontFamily: 'var(--font-body)' }}>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
            transition: 'all 0.3s ease',
          }}
          className="glow-active chatbot-fab"
        >
          <MessageSquare size={26} />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="glass-panel chatbot-panel" style={{
          width: 360,
          height: 480,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(3, 105, 161, 0.2) 100%)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Bot size={22} style={{ color: 'var(--color-accent)' }} />
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Q-Med AI Assistant</h4>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }}></span>
                  Online
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant' || msg.role === 'system';
              return (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: isAssistant ? 'flex-start' : 'flex-end',
                  alignItems: 'flex-start',
                  gap: 8
                }}>
                  {isAssistant && (
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0
                    }}>
                      <Bot size={14} style={{ color: 'var(--color-accent)' }} />
                    </div>
                  )}

                  <div style={{
                    padding: '10px 14px',
                    borderRadius: isAssistant ? '0px 12px 12px 12px' : '12px 0px 12px 12px',
                    maxWidth: '80%',
                    fontSize: '0.85rem',
                    lineHeight: 1.4,
                    background: isAssistant ? 'rgba(30, 41, 66, 0.5)' : 'var(--color-accent)',
                    color: isAssistant ? 'var(--text-primary)' : '#fff',
                    border: isAssistant ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div>{msg.content}</div>
                    
                    {/* Render UI Actions if any */}
                    {msg.ui_actions && msg.ui_actions.map((action, aIdx) => (
                      <div key={aIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        
                        {action.type === 'HOSPITAL_LIST' && action.data.map((hosp, hIdx) => (
                          <div key={hIdx} onClick={() => handleSendMessage(null, `I select hospital: ${hosp.name} (ID: ${hosp.id})`)}
                               className="glass-panel hover-bg"
                               style={{ padding: '8px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: '4px' }}>{hosp.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>District: {hosp.district}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>★ {hosp.rating}</div>
                          </div>
                        ))}
                        
                        {action.type === 'DOCTOR_LIST' && action.data.map((doc, dIdx) => (
                          <div key={dIdx} onClick={() => handleSendMessage(null, `I select doctor: ${doc.name} (ID: ${doc.id})`)}
                               className="glass-panel hover-bg"
                               style={{ padding: '8px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: '4px' }}>Dr. {doc.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.department}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Exp: {doc.experience} years</div>
                          </div>
                        ))}

                        {action.type === 'SLOT_LIST' && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {action.data.map((slot, sIdx) => {
                              const d = new Date(slot);
                              const formatted = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                              return (
                                <button key={sIdx} onClick={() => handleSendMessage(null, `I select slot: ${slot}`)}
                                        className="hover-bg"
                                        style={{ 
                                          fontSize: '0.75rem', padding: '6px 10px', background: 'rgba(6, 182, 212, 0.1)', 
                                          border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: 20, color: '#fff',
                                          cursor: 'pointer'
                                        }}>
                                  {formatted}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {action.type === 'APPOINTMENT_SUMMARY' && (
                           <div className="glass-panel" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #f97316', background: 'rgba(249, 115, 22, 0.1)' }}>
                             <div style={{ fontWeight: 700, color: '#f97316', marginBottom: '6px' }}>⏳ Request Submitted — Pending Doctor Approval</div>
                             <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}><strong>Dr.</strong> {action.data.doctor_name}</div>
                             <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}><strong>Hospital:</strong> {action.data.hospital_name}</div>
                             <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                               <strong>Requested Time:</strong> {new Date(action.data.requested_slot).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                             </div>
                             <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>The doctor will review your request shortly.</div>
                           </div>
                        )}
                        
                      </div>
                    ))}
                  </div>

                  {!isAssistant && (
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0
                    }}>
                      <User size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Bot size={14} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div style={{ padding: '8px 12px', borderRadius: '0 12px 12px 12px', backgroundColor: 'rgba(30, 41, 66, 0.5)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 4 }}>
                  <span className="typing-dot" style={{ animationDelay: '0s' }}>.</span>
                  <span className="typing-dot" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="typing-dot" style={{ animationDelay: '0.4s' }}>.</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef}></div>
          </div>

          {messages.length < 3 && !loading && (
            <div style={{ padding: '0 16px 10px 16px', display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'wrap' }}>
              {suggestions.map((sug, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSendMessage(null, sug)}
                  style={{ 
                    fontSize: '0.7rem', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: 'var(--text-secondary)',
                    cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                  className="hover-bg"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Form Input */}
          <form onSubmit={handleSendMessage} style={{
            padding: '12px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: 8,
            background: 'rgba(15, 23, 42, 0.4)'
          }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                color: '#fff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                opacity: inputValue.trim() ? 1 : 0.6
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
