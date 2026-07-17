import { useState, useRef, useCallback, useEffect } from 'react';

// Text-to-Speech via the browser's native SpeechSynthesis API — no server
// involvement, no external voice service. Voice availability for non-English
// languages varies a lot by OS/browser; this picks the closest match and
// silently falls back to the browser default if none exists for the
// requested language, since there's no way to guarantee a voice is
// installed client-side.
export default function useSpeechSynthesis() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [voices, setVoices] = useState([]);
  const lastRef = useRef({ id: null, text: '', lang: 'en-US' });
  // Cancelling a previous utterance can fire its onend/onerror *after* the
  // next utterance's onstart (event ordering isn't guaranteed across
  // browsers on speechSynthesis.cancel()) — this generation counter lets
  // each utterance's callbacks ignore themselves if a newer one has since
  // started, so a stale "no longer speaking" update can't clobber state.
  const genRef = useRef(0);

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    // getVoices() is frequently empty on first call — the list loads
    // asynchronously and fires this event once ready (a well-known Web
    // Speech API quirk, not specific to this app).
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [supported]);

  const pickVoice = useCallback((lang) => {
    if (!voices.length) return null;
    return voices.find(v => v.lang === lang)
      || voices.find(v => v.lang.startsWith(lang.split('-')[0]))
      || null;
  }, [voices]);

  const speak = useCallback((id, text, lang = 'en-US') => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    const myGen = ++genRef.current;
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { if (myGen !== genRef.current) return; setSpeaking(true); setPaused(false); setCurrentId(id); };
    utterance.onend = () => { if (myGen !== genRef.current) return; setSpeaking(false); setPaused(false); setCurrentId(null); };
    utterance.onerror = () => { if (myGen !== genRef.current) return; setSpeaking(false); setPaused(false); setCurrentId(null); };
    lastRef.current = { id, text, lang };
    window.speechSynthesis.speak(utterance);
  }, [supported, pickVoice]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setCurrentId(null);
  }, [supported]);

  const replay = useCallback(() => {
    const { id, text, lang } = lastRef.current;
    if (text) speak(id, text, lang);
  }, [speak]);

  // Stop any in-progress speech if the consuming component unmounts (e.g.
  // the chat panel closes) so audio doesn't keep playing after close.
  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { supported, speaking, paused, currentId, speak, pause, resume, stop, replay };
}
