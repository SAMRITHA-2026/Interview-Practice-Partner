import React, { useEffect, useState, useRef } from 'react';

/**
 * A simple press-to-talk voice recorder using Web Speech API for STT (browser-based).
 * When a transcript is available it calls onTranscript(transcript).
 */

export default function VoiceRecorder({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser. Use manual text input.');
      return;
    }
    const r = new SpeechRecognition();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      if (onTranscript) onTranscript(t);
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      console.error('Recognition error', e);
      setListening(false);
    };
    recognitionRef.current = r;
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [onTranscript]);

  function start() {
    if (!recognitionRef.current) return alert('SpeechRecognition not available in this browser.');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      console.error(e);
    }
  }
  function stop() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  }

  return (
    <div className="voicerec">
      <button onMouseDown={start} onMouseUp={stop} onTouchStart={start} onTouchEnd={stop} className={listening ? 'listening' : ''}>
        {listening ? 'Listening... (release to send)' : 'Hold to talk'}
      </button>
      <p className="hint">Press & hold (or click) and speak — the transcript will be sent automatically</p>
      <ManualInput onSubmit={onTranscript} />
    </div>
  );
}

function ManualInput({ onSubmit }) {
  const [val, setVal] = useState('');
  return (
    <div className="manual">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Or type your answer..." />
      <button onClick={() => { if (val.trim()) { onSubmit(val.trim()); setVal(''); } }}>Send</button>
    </div>
  );
}
