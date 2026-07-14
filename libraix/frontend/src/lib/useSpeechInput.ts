import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function isSecureEnough(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || window.location.hostname === "localhost";
}

export function useSpeechInput(onUpdate: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");
  const listeningRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()) && isSecureEnough());
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    listeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!isSecureEnough()) {
      setError("Microphone needs HTTPS. Open https://libraix.ai (not http).");
      return;
    }

    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Voice input works in Chrome or Edge (desktop/Android). Safari and Firefox don’t support it yet.");
      return;
    }

    // Ask for mic permission early so the browser shows a clear prompt
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      setError("Microphone blocked — click the lock icon in the address bar → allow Microphone for libraix.ai, then try again.");
      return;
    }

    setError("");
    listeningRef.current = true;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          baseTextRef.current += piece;
        } else {
          interim += piece;
        }
      }
      const combined = (baseTextRef.current + interim).replace(/\s+/g, " ").trimStart();
      onUpdateRef.current(combined);
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === "aborted") return;
      if (code === "no-speech") return; // keep listening
      listeningRef.current = false;
      setListening(false);
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone blocked — allow mic for libraix.ai (address bar → Site settings).");
      } else if (code === "audio-capture") {
        setError("No microphone found. Plug in a mic or check system sound settings.");
      } else if (code === "network") {
        setError("Voice needs an internet connection (Chrome sends audio to Google for recognition).");
      } else {
        setError(`Voice error (${code}). Tap the mic and try again in Chrome.`);
      }
    };

    recognition.onend = () => {
      if (!listeningRef.current) {
        setListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        listeningRef.current = false;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      listeningRef.current = false;
      setError("Could not start microphone. Try Chrome, then allow mic access.");
      setListening(false);
    }
  }, []);

  const toggle = useCallback(
    (currentText: string) => {
      if (listeningRef.current) {
        stop();
        return;
      }
      baseTextRef.current = currentText.trim() ? `${currentText.trim()} ` : "";
      void start();
    },
    [start, stop]
  );

  const syncBase = useCallback((text: string) => {
    if (listeningRef.current) {
      baseTextRef.current = text.trim() ? `${text.trim()} ` : "";
    }
  }, []);

  return { listening, supported, error, toggle, stop, syncBase, clearError: () => setError("") };
}
