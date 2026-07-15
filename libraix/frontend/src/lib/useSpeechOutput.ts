import { useCallback, useEffect, useRef, useState } from "react";

export type TtsVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface VoiceOption {
  id: TtsVoice;
  label: string;
  description: string;
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

async function fetchTts(text: string, voice?: TtsVoice): Promise<ArrayBuffer> {
  const res = await fetch("/api/tools/tts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 4096), voice }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `TTS_HTTP_${res.status}`);
  }
  return res.arrayBuffer();
}

/** HTMLAudioElement playback — most reliable on iOS / Android browsers. */
function playViaElement(
  buffer: ArrayBuffer,
  signal: AbortSignal
): { done: Promise<void>; stop: () => void } {
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  audio.volume = 1;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      /* ignore */
    }
    URL.revokeObjectURL(url);
  };

  const stop = () => {
    cleanup();
  };

  const done = new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });

    audio.onended = () => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      reject(new Error("AUDIO_PLAY_FAILED"));
    };

    void audio.play().catch((e) => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      reject(e);
    });
  });

  return { done, stop };
}

export function useSpeechOutput() {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported] = useState(true);
  const [voice, setVoiceState] = useState<TtsVoice>("nova");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [speechLocale, setSpeechLocale] = useState(navigator.language || "en-GB");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stopElRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/tools/tts/voices", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { voices: VoiceOption[]; current: TtsVoice } | null) => {
        if (!data) return;
        setVoices(data.voices);
        setVoiceState(data.current ?? "nova");
      })
      .catch(() => {});
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    try {
      sourceRef.current?.stop();
    } catch {
      /* ignore */
    }
    sourceRef.current = null;
    stopElRef.current?.();
    stopElRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    setSpeaking(false);
    setLoading(false);
  }, []);

  const speak = useCallback(
    async (text: string, overrideVoice?: TtsVoice) => {
      if (!text.trim()) return;
      stop();

      setLoading(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const buffer = await fetchTts(text, overrideVoice ?? voice);
        if (ctrl.signal.aborted) return;

        // Mobile: prefer <audio> — AudioContext is often blocked / silent on iOS
        if (isMobile()) {
          setLoading(false);
          setSpeaking(true);
          const { done, stop: stopAudio } = playViaElement(buffer, ctrl.signal);
          stopElRef.current = stopAudio;
          await done;
          if (!ctrl.signal.aborted) setSpeaking(false);
          return;
        }

        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) throw new Error("NO_AUDIO_CONTEXT");
        const ctx = audioCtxRef.current ?? new AC();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();

        const decoded = await ctx.decodeAudioData(buffer.slice(0));
        if (ctrl.signal.aborted) return;

        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => {
          if (!ctrl.signal.aborted) setSpeaking(false);
        };
        sourceRef.current = source;
        setLoading(false);
        setSpeaking(true);
        source.start();
      } catch (e) {
        if (ctrl.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        console.warn("TTS failed, falling back to browser synthesis:", e);
        setLoading(false);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            /* ignore */
          }
          const utt = new SpeechSynthesisUtterance(text.slice(0, 4000));
          utt.lang = speechLocale || navigator.language || "en-GB";
          utt.onend = () => setSpeaking(false);
          utt.onerror = () => setSpeaking(false);
          setSpeaking(true);
          window.speechSynthesis.speak(utt);
        } else {
          setSpeaking(false);
        }
      }
    },
    [voice, stop, speechLocale]
  );

  const toggle = useCallback(
    (text: string) => {
      if (speaking || loading) stop();
      else void speak(text);
    },
    [speaking, loading, speak, stop]
  );

  const saveVoice = useCallback(async (v: TtsVoice) => {
    setVoiceState(v);
    await fetch("/api/tools/tts/voice", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice: v }),
    }).catch(() => {});
  }, []);

  return {
    speaking,
    loading,
    supported,
    voice,
    voices,
    speechLocale,
    setSpeechLocale,
    speak,
    stop,
    toggle,
    saveVoice,
  };
}
