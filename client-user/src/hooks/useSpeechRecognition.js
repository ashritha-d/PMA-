import { useState, useRef, useCallback, useEffect } from 'react';

// Speech-to-Text via the browser's native SpeechRecognition API — no server
// involvement. Not supported in Firefox, and only partially in Safari; the
// `supported` flag lets callers render a graceful fallback instead.
export default function useSpeechRecognition({ lang = 'en-US', onFinalResult } = {}) {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const supported = !!SpeechRecognitionCtor;

  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const start = useCallback(() => {
    if (!supported || listening) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = true;
    // continuous:false lets the browser's own silence detection stop
    // recognition automatically after a pause — no custom timer needed.
    recognition.continuous = false;

    recognition.onstart = () => { setListening(true); setError(null); setInterimTranscript(''); };
    recognition.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) setInterimTranscript(interim);
      if (final.trim()) onFinalResultRef.current?.(final.trim());
    };
    recognition.onerror = (e) => setError(e.error);
    recognition.onend = () => { setListening(false); setInterimTranscript(''); };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws if called while already active (rare race) — safe to ignore
    }
  }, [SpeechRecognitionCtor, lang, listening, supported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Stop any in-progress recognition if the consuming component unmounts
  // (e.g. the chat panel closes) so the mic doesn't keep listening silently.
  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, interimTranscript, error, start, stop };
}
