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

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function transcribeAudio(blob: Blob, locale: string): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const res = await fetch("/api/tools/stt", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || "audio/webm",
      language: locale || undefined,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
    throw new Error(err.hint || err.error || `STT_HTTP_${res.status}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

/**
 * Dictate into the composer.
 * - Desktop Chrome/Edge: Web Speech API (live captions)
 * - iPhone / Safari / others: tap-to-record → Whisper STT (works on mobile)
 */
export function useSpeechInput(
  onUpdate: (text: string) => void,
  options?: { speechLocale?: string }
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [mode, setMode] = useState<"webspeech" | "whisper" | "none">("none");
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
    const secure = isSecureEnough();
    const hasWebSpeech = Boolean(getSpeechRecognition());
    const hasRecorder =
      typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (!secure) {
      setSupported(false);
      setMode("none");
    } else if (hasWebSpeech && !isIos()) {
      // iOS Chrome/Safari share WebKit — SpeechRecognition is unreliable/missing there
      setSupported(true);
      setMode("webspeech");
    } else if (hasRecorder) {
      setSupported(true);
      setMode("whisper");
    } else {
      setSupported(false);
      setMode("none");
    }
    return () => {
      listeningRef.current = false;
      recognitionRef.current?.abort();
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      mediaRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);
    if (msg) {
      errorTimerRef.current = setTimeout(() => setError(""), 9000);
    }
  }, []);

  const stopWhisper = useCallback(async () => {
    const recorder = recorderRef.current;
    listeningRef.current = false;
    setListening(false);

    if (!recorder || recorder.state === "inactive") {
      mediaRef.current?.getTracks().forEach((t) => t.stop());
      mediaRef.current = null;
      return;
    }

    const blobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const mime = recorder.mimeType || "audio/webm";
        resolve(new Blob(chunksRef.current, { type: mime }));
        chunksRef.current = [];
      };
    });

    try {
      recorder.stop();
    } catch {
      /* ignore */
    }
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    recorderRef.current = null;

    const blob = await blobPromise;
    if (blob.size < 400) {
      showError("That was too short — hold the mic a second longer and speak.");
      return;
    }

    try {
      showError("");
      setListening(false);
      // Brief “transcribing” cue via error banner style? Use listening false + soft message
      const text = await transcribeAudio(blob, localeRef.current);
      if (!text) {
        showError("Didn’t catch that — try again closer to the mic.");
        return;
      }
      const combined = `${baseTextRef.current}${text}`.replace(/\s+/g, " ").trimStart();
      baseTextRef.current = combined.endsWith(" ") ? combined : `${combined} `;
      onUpdateRef.current(combined.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "STT_FAILED";
      if (/STT_NOT_CONFIGURED/i.test(msg)) {
        showError("Voice typing isn’t configured on the server yet (needs OpenAI key).");
      } else if (/NotAllowed|Permission/i.test(msg)) {
        showError(
          isIos()
            ? "Mic blocked. Settings → Safari → Microphone → Allow, then try again."
            : "Mic blocked — allow Microphone for libraix.ai, then try again."
        );
      } else {
        showError("Couldn’t transcribe speech. Check your connection and try again.");
      }
    }
  }, [showError]);

  const stop = useCallback(() => {
    if (mode === "whisper" && listeningRef.current) {
      void stopWhisper();
      return;
    }
    listeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, [mode, stopWhisper]);

  const startWebSpeech = useCallback(() => {
    if (!isSecureEnough()) {
      showError("Microphone needs HTTPS. Open https://libraix.ai (not http).");
      return;
    }

    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      showError("Voice needs Chrome or Edge on desktop — or tap mic on phone for record mode.");
      return;
    }

    showError("");
    listeningRef.current = true;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
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
      if (code === "aborted" || code === "no-speech" || code === "network") {
        listeningRef.current = false;
        setListening(false);
        return;
      }
      listeningRef.current = false;
      setListening(false);
      if (code === "not-allowed" || code === "service-not-allowed") {
        showError(
          isIos()
            ? "Mic blocked. Settings → Safari → Microphone → Allow, then try again."
            : "Microphone blocked — allow Microphone for libraix.ai, then try again."
        );
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
      showError("Could not start microphone. Allow mic access when prompted.");
      setListening(false);
    }
  }, [showError]);

  const startWhisper = useCallback(async () => {
    if (!isSecureEnough()) {
      showError("Microphone needs HTTPS. Open https://libraix.ai (not http).");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showError("This browser can’t access the microphone.");
      return;
    }

    showError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      mediaRef.current = stream;
      const mime = pickRecorderMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      listeningRef.current = true;
      setListening(true);
      recorder.start(250);
    } catch (e) {
      listeningRef.current = false;
      setListening(false);
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        showError(
          isIos()
            ? "Mic blocked. Settings → Safari → Microphone → Allow, then try again."
            : "Mic blocked — allow Microphone for libraix.ai, then try again."
        );
      } else {
        showError("Could not start microphone. Allow mic access when prompted.");
      }
    }
  }, [showError]);

  const start = useCallback(() => {
    if (mode === "whisper") void startWhisper();
    else startWebSpeech();
  }, [mode, startWhisper, startWebSpeech]);

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

  return {
    listening,
    supported,
    /** whisper = tap to record (phones); webspeech = live captions */
    mode,
    error,
    toggle,
    stop,
    syncBase,
    clearError: () => setError(""),
  };
}
