import { useCallback, useEffect, useRef, useState } from "react";

export type LiveVoiceStatus = "idle" | "connecting" | "live" | "error";

export interface LiveTranscript {
  role: "user" | "assistant";
  text: string;
}

interface UseLiveVoiceOptions {
  /** Preferred Realtime / TTS voice id */
  voice?: string;
  onTranscript?: (entry: LiveTranscript) => void;
}

function friendlyLiveError(raw: string): string {
  if (/REALTIME_NOT_CONFIGURED|TTS_NOT_CONFIGURED/i.test(raw)) {
    return "Live Voice isn’t configured yet (needs OpenAI API key on the server).";
  }
  if (/REALTIME_NOT_ENABLED|REALTIME_UNAUTHORIZED/i.test(raw)) {
    return "Live Voice needs OpenAI Realtime enabled on the API key. Mic + speak-back still work.";
  }
  if (/USAGE_LIMIT/i.test(raw)) return "Daily message limit reached — try again tomorrow or upgrade.";
  if (/NotAllowedError|Permission/i.test(raw)) return "Microphone permission blocked. Allow mic for Live Voice.";
  if (/getUserMedia|NotFoundError/i.test(raw)) return "No microphone found. Plug one in and try again.";
  return raw.slice(0, 160) || "Couldn’t start Live Voice.";
}

/**
 * ChatGPT-style Advanced Voice via OpenAI Realtime WebRTC.
 * SDP offer → our `/api/tools/realtime/session` → play remote audio.
 */
export function useLiveVoice(opts: UseLiveVoiceOptions = {}) {
  const [status, setStatus] = useState<LiveVoiceStatus>("idle");
  const [error, setError] = useState("");
  const [partialUser, setPartialUser] = useState("");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const onTranscriptRef = useRef(opts.onTranscript);
  onTranscriptRef.current = opts.onTranscript;
  const voiceRef = useRef(opts.voice);
  voiceRef.current = opts.voice;

  const cleanup = useCallback(() => {
    try {
      dcRef.current?.close();
    } catch {
      /* ignore */
    }
    dcRef.current = null;
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setPartialUser("");
    setStatus("idle");
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleServerEvent = useCallback((raw: string) => {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = String(event.type ?? "");

    if (
      type === "conversation.item.input_audio_transcription.delta" ||
      type === "conversation.item.input_audio_transcription.completed"
    ) {
      const transcript = String(event.transcript ?? event.delta ?? "");
      if (type.endsWith(".delta") && transcript) {
        setPartialUser((prev) => prev + transcript);
      }
      if (type.endsWith(".completed") && transcript.trim()) {
        setPartialUser("");
        onTranscriptRef.current?.({ role: "user", text: transcript.trim() });
      }
      return;
    }

    if (
      type === "response.output_audio_transcript.done" ||
      type === "response.audio_transcript.done" ||
      type === "response.output_audio_transcript.delta"
    ) {
      const transcript = String(event.transcript ?? event.delta ?? "");
      if (type.endsWith(".delta")) return;
      if (transcript.trim()) {
        onTranscriptRef.current?.({ role: "assistant", text: transcript.trim() });
      }
    }
  }, []);

  const start = useCallback(async () => {
    if (status === "connecting" || status === "live") return;
    setError("");
    setPartialUser("");
    setStatus("connecting");
    cleanup();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Live Voice needs a modern browser with microphone support.");
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "true");
      document.body.appendChild(audioEl);
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0] ?? null;
        void audioEl.play().catch(() => {
          /* autoplay may need a prior user gesture — start() is from a click */
        });
      };

      const ms = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = ms;
      for (const track of ms.getTracks()) {
        pc.addTrack(track, ms);
      }

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", (e) => {
        if (typeof e.data === "string") handleServerEvent(e.data);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait briefly for ICE gathering so the offer is more complete
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
          return;
        }
        const t = window.setTimeout(() => resolve(), 1500);
        pc.addEventListener(
          "icegatheringstatechange",
          () => {
            if (pc.iceGatheringState === "complete") {
              window.clearTimeout(t);
              resolve();
            }
          },
          { once: true }
        );
      });

      const localSdp = pc.localDescription?.sdp ?? offer.sdp;
      if (!localSdp) throw new Error("Couldn’t build WebRTC offer.");

      const res = await fetch("/api/tools/realtime/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: localSdp, voice: voiceRef.current }),
      });

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string; hint?: string; detail?: string };
          detail = j.hint || j.error || j.detail || detail;
        } catch {
          detail = (await res.text().catch(() => detail)).slice(0, 200);
        }
        throw new Error(detail);
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.onconnectionstatechange = () => {
        if (
          pcRef.current === pc &&
          (pc.connectionState === "failed" || pc.connectionState === "closed")
        ) {
          cleanup();
          setStatus("idle");
        }
      };

      setStatus("live");
    } catch (e) {
      cleanup();
      const msg = friendlyLiveError(e instanceof Error ? e.message : String(e));
      setError(msg);
      setStatus("error");
    }
  }, [cleanup, handleServerEvent, status]);

  const toggle = useCallback(async () => {
    if (status === "live" || status === "connecting") {
      stop();
      return;
    }
    await start();
  }, [start, status, stop]);

  const clearError = useCallback(() => setError(""), []);

  return {
    status,
    active: status === "live" || status === "connecting",
    connecting: status === "connecting",
    live: status === "live",
    error,
    partialUser,
    supported: typeof RTCPeerConnection !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    start,
    stop,
    toggle,
    clearError,
  };
}
