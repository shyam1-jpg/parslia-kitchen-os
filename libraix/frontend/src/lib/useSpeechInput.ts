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

export function useSpeechInput(
  onUpdate: (text: string) => void,
  options?: { speechLocale?: string }
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");
  const listeningRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localeRef = useRef(options?.speechLocale || "");

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    localeRef.current = options?.speechLocale || "";
  }, [options?.speechLocale]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()) && isSecureEnough());
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);
    if (msg) {
      errorTimerRef.current = setTimeout(() => setError(""), 7000);
    }
  }, []);

  const stop = useCallback(() => {
    listeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!isSecureEnough()) {
      showError("Microphone needs HTTPS. Open https://libraix.ai (not http).");
      return;
    }

    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      showError("Voice needs Chrome or Edge. Safari and Firefox don't support speech input yet.");
      return;
    }

    showError("");
    listeningRef.current = true;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Match mic language to user preference / last detected language (Hindi, Tamil, …)
    recognition.lang = localeRef.current || navigator.language || "en-GB";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          baseTextRef.current += piece + " ";
        } else {
          interim += piece;
        }
      }
      const combined = (baseTextRef.current + interim).replace(/\s+/g, " ").trimStart();
      onUpdateRef.current(combined);
    };

    recognition.onerror = (event) => {
      const code = event.error;
      // These are all non-fatal / expected — just stop silently
      if (code === "aborted" || code === "no-speech" || code === "network") {
        listeningRef.current = false;
        setListening(false);
        return;
      }
      listeningRef.current = false;
      setListening(false);
      if (code === "not-allowed" || code === "service-not-allowed") {
        showError("Microphone blocked — click the lock icon in your address bar → allow Microphone, then try again.");
      } else if (code === "audio-capture") {
        showError("No microphone found — check your device settings.");
      } else {
        showError("Voice stopped. Tap the mic to try again.");
      }
    };

    recognition.onend = () => {
      if (!listeningRef.current) {
        setListening(false);
        return;
      }
      // Auto-restart to keep listening continuously
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
      showError("Could not start microphone. Make sure you allow mic access when prompted.");
      setListening(false);
    }
  }, [showError]);

  const toggle = useCallback(
    (currentText: string) => {
      if (listeningRef.current) {
        stop();
        return;
      }
      baseTextRef.current = currentText.trim() ? `${currentText.trim()} ` : "";
      start();
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
