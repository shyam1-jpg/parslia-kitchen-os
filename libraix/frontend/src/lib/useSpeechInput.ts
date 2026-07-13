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
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechInput(onUpdate: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTextRef = useRef("");

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
    return () => recognitionRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    setError("");
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-GB";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const combined = baseTextRef.current + transcript;
      onUpdate(combined.trimStart());
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Allow mic permission in your browser settings.");
      } else if (event.error !== "aborted") {
        setError("Could not capture speech. Try again.");
      }
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Could not start microphone.");
      setListening(false);
    }
  }, [onUpdate]);

  const toggle = useCallback(
    (currentText: string) => {
      if (listening) {
        stop();
        return;
      }
      baseTextRef.current = currentText.trim() ? `${currentText.trim()} ` : "";
      start();
    },
    [listening, start, stop]
  );

  return { listening, supported, error, toggle, stop, clearError: () => setError("") };
}
