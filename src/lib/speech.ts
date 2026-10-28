import { useEffect, useRef, useState } from 'preact/hooks';

/** Minimal typing for the Web Speech API (not in lib.dom for all browsers). */
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Browser speech-to-text. `supported` is false where the API is missing: the mic button hides. */
export function useSpeech(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => typeof window !== 'undefined' && Boolean(ctor()));
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  function toggle() {
    if (listening) return rec.current?.stop();
    const Ctor = ctor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || 'en-US';
    r.interimResults = false;
    r.onresult = (e) => {
      const text = Array.from(e.results, (res) => res[0]?.transcript ?? '').join(' ');
      if (text.trim()) onText(text.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  return { supported, listening, toggle };
}
