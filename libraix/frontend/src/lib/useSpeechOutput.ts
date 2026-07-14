import { useCallback, useEffect, useRef, useState } from "react";

export type TtsVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface VoiceOption {
  id: TtsVoice;
  label: string;
  description: string;
}

async function fetchTts(text: string, voice?: TtsVoice): Promise<ArrayBuffer> {
  const res = await fetch("/api/tools/tts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 4096), voice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `TTS_HTTP_${res.status}`);
  }
  return res.arrayBuffer();
}

export function useSpeechOutput() {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported] = useState(true); // always available via API
  const [voice, setVoiceState] = useState<TtsVoice>("nova");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load voice preference + options on mount
  useEffect(() => {
    fetch("/api/tools/tts/voices", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { voices: VoiceOption[]; current: TtsVoice } | null) => {
        if (!data) return;
        setVoices(data.voices);
        setVoiceState(data.current ?? "nova");
      })
      .catch(() => {});
    return () => { stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sourceRef.current?.stop();
    sourceRef.current = null;
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

        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();

        const decoded = await ctx.decodeAudioData(buffer);
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
        if (ctrl.signal.aborted) return;
        console.warn("TTS failed, falling back to browser synthesis:", e);
        // Graceful fallback to browser voice if API fails
        setLoading(false);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utt = new SpeechSynthesisUtterance(text.slice(0, 4000));
          utt.lang = navigator.language || "en-GB";
          utt.onend = () => setSpeaking(false);
          utt.onerror = () => setSpeaking(false);
          setSpeaking(true);
          window.speechSynthesis.speak(utt);
        }
      }
    },
    [voice, stop]
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

  return { speaking, loading, supported, voice, voices, speak, stop, toggle, saveVoice };
}
