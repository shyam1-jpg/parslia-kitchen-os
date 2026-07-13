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
    setSupported(Boolean(getSpeechRecognition()));
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Voice input needs Chrome or Edge on desktop, or Chrome on Android.");
      return;
    }

    setError("");
    listeningRef.current = true;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";

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
      if (event.error === "not-allowed") {
        setError("Microphone blocked — allow mic access for libraix.ai in your browser.");
        listeningRef.current = false;
        setListening(false);
      } else if (event.error === "no-speech") {
        /* keep listening */
      } else if (event.error !== "aborted") {
        setError("Could not capture speech. Tap the mic and try again.");
        listeningRef.current = false;
        setListening(false);
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
      setError("Could not start microphone.");
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
