import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiMic, FiPlay, FiPause, FiSquare, FiRotateCcw, FiVolumeX, FiVolume2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';

const API_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';

const LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'te-IN', label: 'Telugu' },
];

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

const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 3, display: 'flex', color: '#9ca3af' };

function Message({ msg, index, synth, onPlay }) {
  const isBot = msg.role === 'assistant';
  const isCurrent = synth?.currentId === index;
  const isPausedHere = isCurrent && synth?.paused;
  const isPlayingHere = isCurrent && synth?.speaking && !synth?.paused;
  const canPlay = isBot && !msg.streaming && msg.content;

  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      flexDirection: isBot ? 'row' : 'row-reverse',
      marginBottom: 16,
    }}>
      {isBot ? BOT_AVATAR : USER_AVATAR}
      <div style={{ maxWidth: '75%' }}>
        <div style={{
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

        {canPlay && synth?.supported && (
          <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
            {isPlayingHere ? (
              <button style={iconBtnStyle} title="Pause" aria-label="Pause reading response" onClick={synth.pause}><FiPause size={13} /></button>
            ) : (
              <button style={iconBtnStyle} title={isPausedHere ? 'Resume' : 'Play'} aria-label={isPausedHere ? 'Resume reading response' : 'Read response aloud'} onClick={() => (isPausedHere ? synth.resume() : onPlay(index, msg.content, msg.language))}><FiPlay size={13} /></button>
            )}
            {isCurrent && (synth.speaking || synth.paused) && (
              <button style={iconBtnStyle} title="Stop" aria-label="Stop reading response" onClick={synth.stop}><FiSquare size={13} /></button>
            )}
            <button style={iconBtnStyle} title="Replay" aria-label="Replay response" onClick={() => onPlay(index, msg.content, msg.language)}><FiRotateCcw size={13} /></button>
          </div>
        )}
        {canPlay && !synth?.supported && (
          <div style={{ marginTop: 4 }} title="Voice output isn't supported in this browser">
            <FiVolumeX size={13} color="#d1d5db" />
          </div>
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
  const [language, setLanguage] = useState('en-IN');
  const [muted, setMuted] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  // Set by the mic handler, read once the in-flight response finishes
  // streaming — auto-speak only fires for voice-initiated turns, not typed
  // ones (avoids surprise audio on an otherwise silent text chat).
  const voiceInitiatedRef = useRef(false);
  const mutedRef = useRef(false);

  const synth = useSpeechSynthesis();
  const { speak: speakResponse } = synth;
  // sendMessage is defined further below via useCallback; referencing it
  // here is safe because this callback only ever fires later (async, on a
  // real speech event) — by then the render below it has already run.
  const recognition = useSpeechRecognition({
    lang: language,
    onFinalResult: (text) => {
      voiceInitiatedRef.current = true;
      sendMessage(text);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Surface mic permission/other recognition errors once, when they occur.
  useEffect(() => {
    if (!recognition.error) return;
    if (recognition.error === 'not-allowed' || recognition.error === 'permission-denied') {
      toast.error('Microphone access denied — allow it in your browser settings to use voice input.');
    } else if (recognition.error !== 'no-speech' && recognition.error !== 'aborted') {
      toast.error('Voice input failed. Please try again.');
    }
  }, [recognition.error]);

  // Ctrl+M toggles listening while the chat panel is open. recognitionStart
  // is rebound to a new `language` every time the selector changes — must be
  // a real dependency here, otherwise this closure goes stale after a
  // language switch and Ctrl+M would keep starting recognition in the
  // previously-selected language. Destructured (rather than depending on
  // `recognition.start` directly) so ESLint can track each piece precisely
  // instead of asking for the whole object, which is a fresh reference every
  // render and would re-subscribe the listener on every keystroke.
  const { listening: recognitionListening, supported: recognitionSupported, start: recognitionStart, stop: recognitionStop } = recognition;
  useEffect(() => {
    if (!open || !recognitionSupported) return;
    const handler = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        recognitionListening ? recognitionStop() : recognitionStart();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, recognitionListening, recognitionSupported, recognitionStart, recognitionStop]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    const history = [...messages, { role: 'user', content: userText }];
    setMessages(history);
    setLoading(true);

    const placeholderIdx = history.length;
    // Tag the reply with the language it's generated in so Replay always
    // uses the right voice/locale later, even if the user switches the
    // language selector before clicking Replay on an older message.
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, language }]);

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
        body: JSON.stringify({ messages: apiMessages, language }),
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
          updated[placeholderIdx] = { ...updated[placeholderIdx], content: text, streaming };
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
              if (voiceInitiatedRef.current) {
                voiceInitiatedRef.current = false;
                if (!mutedRef.current) speakResponse(placeholderIdx, accumulated, language);
              }
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
  }, [input, loading, messages, speakResponse, language]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort();
    recognition.stop();
    synth.stop();
    setOpen(false);
  };

  // lang defaults to 'en-IN' (not the current selector value) for messages
  // with no stored language — currently only the hardcoded English welcome
  // bubble, which should always read in English regardless of whatever
  // language is selected when it's replayed.
  const handlePlay = (index, text, lang) => { if (!muted) synth.speak(index, text, lang || 'en-IN'); };
  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    if (next) synth.stop(); // muting mid-speech stops the current utterance immediately
    setMuted(next);
  };

  const voiceStatus = recognition.listening ? 'Listening…' : loading ? 'Processing…' : synth.speaking ? 'Speaking…' : 'Ready';

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes aiGlow { 0%,100% { box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 0 rgba(255,255,255,0.08); } 50% { box-shadow: 0 4px 32px rgba(0,0,0,0.6), 0 0 0 6px rgba(255,255,255,0.04); } }
        .ai-chat-panel { animation: slideUp 0.22s cubic-bezier(0.16,1,0.3,1); }
        .ai-send-btn:hover { background: #1e40af !important; }
        .ai-toggle-btn {
          animation: aiGlow 3s ease-in-out infinite;
        }
        .ai-toggle-btn:hover {
          transform: scale(1.08) !important;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.15) !important;
        }
        .ai-toggle-btn:active { transform: scale(0.96) !important; }
        .ai-suggest-btn:hover { background: #dbeafe !important; color: #1a56db !important; }
        @keyframes micPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
        .ai-mic-btn.listening { animation: micPulse 1.2s ease-in-out infinite; }
        .ai-mic-btn:not(:disabled):hover { background: #e5e7eb !important; }
        .ai-mic-btn.listening:hover { background: #dc2626 !important; }
        @media (max-width: 480px) {
          .ai-toggle-btn { bottom: 110px !important; right: 20px !important; }
          .ai-chat-panel-wrap { bottom: 178px !important; right: 8px !important; width: calc(100vw - 16px) !important; }
        }
      `}</style>

      {/* Floating toggle button — positioned 22px above WhatsApp (bottom:32 + height:60 + gap:22 = 114) */}
      <button
        className="ai-toggle-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI Assistant"
        style={{
          position: 'fixed',
          bottom: 114,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #1e1e1e, #111111)',
          border: '1px solid rgba(255,255,255,0.10)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset',
          zIndex: 9999,
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
          color: 'white',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {open ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2a2 2 0 0 1 2 2v1h1a3 3 0 0 1 3 3v1.17A3 3 0 0 1 20 12a3 3 0 0 1-2 2.83V16a3 3 0 0 1-3 3h-1v1a2 2 0 0 1-4 0v-1H9a3 3 0 0 1-3-3v-1.17A3 3 0 0 1 4 12a3 3 0 0 1 2-2.83V8a3 3 0 0 1 3-3h1V4a2 2 0 0 1 2-2zm0 2a.5.5 0 0 0-.5.5V6h1V4.5A.5.5 0 0 0 12 4zM9 7a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H9zm1.5 2.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm3 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM9.5 13h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zm2 3h1v1h-1v-1zm-.5 1v1a.5.5 0 0 0 1 0v-1h-1z"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="ai-chat-panel ai-chat-panel-wrap"
          style={{
            position: 'fixed',
            bottom: 184,
            right: 32,
            width: 380,
            maxWidth: 'calc(100vw - 48px)',
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
              <Message key={i} msg={msg} index={i} synth={synth} onPlay={handlePlay} />
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

          {/* Voice toolbar */}
          <div style={{
            borderTop: '1px solid #f1f5f9',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexShrink: 0,
            background: '#fafafa',
          }}>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              aria-label="Voice language"
              style={{ border: 'none', background: 'none', fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer' }}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>🌐 {l.label}</option>)}
            </select>

            <span aria-live="polite" style={{ fontSize: '0.7rem', color: '#9ca3af', flex: 1, textAlign: 'center' }}>
              {voiceStatus}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={toggleMute}
                aria-label={muted ? 'Unmute voice output' : 'Mute voice output'}
                title={muted ? 'Unmute' : 'Mute'}
                style={iconBtnStyle}
              >
                {muted ? <FiVolumeX size={14} /> : <FiVolume2 size={14} />}
              </button>
              {recognition.supported ? (
                <span style={{ fontSize: '0.7rem', color: '#d1d5db' }}>Ctrl+M to talk</span>
              ) : (
                <span style={{ fontSize: '0.68rem', color: '#ef4444' }}>Voice assistant is supported in Chrome and Edge.</span>
              )}
            </div>
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
              value={recognition.listening ? recognition.interimTranscript : input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={handleKey}
              placeholder={recognition.listening ? 'Listening…' : 'Ask about properties, lease, payments...'}
              disabled={loading || recognition.listening}
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
              className={recognition.listening ? 'ai-mic-btn listening' : 'ai-mic-btn'}
              onClick={() => (recognition.listening ? recognition.stop() : recognition.start())}
              disabled={!recognition.supported || loading}
              title={recognition.supported ? (recognition.listening ? 'Stop listening' : 'Talk to AI (Ctrl+M)') : 'Voice assistant is supported in Chrome and Edge.'}
              aria-label={recognition.listening ? 'Stop voice input' : 'Start voice input'}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: recognition.listening ? '#ef4444' : '#f1f5f9',
                border: 'none',
                cursor: !recognition.supported || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: !recognition.supported ? 0.4 : 1,
                transition: 'background 0.15s',
              }}
            >
              <FiMic size={16} color={recognition.listening ? 'white' : '#6b7280'} />
            </button>
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
