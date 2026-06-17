import React, { useState, useRef, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';

const BOT_AVATAR = (
  <div style={{
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: 14, color: 'white', fontWeight: 700,
  }}>P</div>
);

const USER_AVATAR = (
  <div style={{
    width: 32, height: 32, borderRadius: '50%',
    background: '#f59e0b',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: 14, color: 'white', fontWeight: 700,
  }}>U</div>
);

function Message({ msg }) {
  const isBot = msg.role === 'assistant';
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      flexDirection: isBot ? 'row' : 'row-reverse',
      marginBottom: 16,
    }}>
      {isBot ? BOT_AVATAR : USER_AVATAR}
      <div style={{
        maxWidth: '75%',
        background: isBot ? '#f1f5f9' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
        color: isBot ? '#111827' : 'white',
        borderRadius: isBot ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
        padding: '10px 14px',
        fontSize: '0.875rem',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.streaming && (
          <span style={{ display: 'inline-block', animation: 'blink 1s step-end infinite', marginLeft: 2 }}>▍</span>
        )}
      </div>
    </div>
  );
}

const SUGGESTED = [
  'Show available properties for rent',
  'Find 2BHK under ₹20,000/month',
  'What is the booking process?',
  'Show my lease details',
];

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m PMA Smart AI Assistant. I can help you search properties, view your lease details, answer questions, and guide you around the platform. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    const history = [...messages, { role: 'user', content: userText }];
    setMessages(history);
    setLoading(true);

    const placeholderIdx = history.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    // Build messages array (exclude the streaming placeholder)
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }));

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      const updateMsg = (text, streaming) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[placeholderIdx] = { role: 'assistant', content: text, streaming };
          return updated;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === 'delta') {
              accumulated += payload.text;
              updateMsg(accumulated, true);
            } else if (payload.type === 'done') {
              updateMsg(accumulated, false);
            } else if (payload.type === 'error') {
              updateMsg(payload.message, false);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[placeholderIdx] = {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            streaming: false,
          };
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort();
    setOpen(false);
  };

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ai-chat-panel { animation: slideUp 0.2s ease; }
        .ai-send-btn:hover { background: #1e40af !important; }
        .ai-toggle-btn:hover { transform: scale(1.1); box-shadow: 0 8px 32px rgba(26,86,219,0.4) !important; }
        .ai-suggest-btn:hover { background: #dbeafe !important; color: #1a56db !important; }
      `}</style>

      {/* Floating toggle button */}
      <button
        className="ai-toggle-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI Assistant"
        style={{
          position: 'fixed',
          bottom: 160,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(26,86,219,0.35)',
          zIndex: 9998,
          transition: 'transform 0.2s, box-shadow 0.2s',
          color: 'white',
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="ai-chat-panel"
          style={{
            position: 'fixed',
            bottom: 224,
            right: 24,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            height: 520,
            maxHeight: 'calc(100vh - 250px)',
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a, #1a56db)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'white',
            }}>P</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>PMA Smart Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                Online
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}
            >×</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}

            {/* Suggested prompts — show only at start */}
            {messages.length === 1 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 8, fontWeight: 500 }}>SUGGESTIONS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SUGGESTED.map(s => (
                    <button
                      key={s}
                      className="ai-suggest-btn"
                      onClick={() => sendMessage(s)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #e5e7eb',
                        borderRadius: 20,
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: '1px solid #f1f5f9',
            padding: '12px 14px',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            flexShrink: 0,
            background: '#fafafa',
          }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={handleKey}
              placeholder="Ask about properties, lease, payments..."
              disabled={loading}
              style={{
                flex: 1,
                resize: 'none',
                border: '1.5px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                color: '#111827',
                outline: 'none',
                background: 'white',
                lineHeight: 1.5,
                overflowY: 'hidden',
                transition: 'border-color 0.2s',
                minHeight: 40,
              }}
              onFocus={e => e.target.style.borderColor = '#1a56db'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <button
              className="ai-send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: loading || !input.trim() ? '#e5e7eb' : '#1a56db',
                border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              {loading ? (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: '2px solid #9ca3af',
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite',
                }}/>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
