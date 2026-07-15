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
  /** Called after usage is reported so the UI can refresh daily quotas */
  onUsageReported?: () => void;
}

function isSecureEnough(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || window.location.hostname === "localhost";
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

async function micPermissionState(): Promise<PermissionState | "unknown"> {
  try {
    const perms = navigator.permissions;
    if (!perms?.query) return "unknown";
    // Some browsers throw on microphone; others use "microphone"
    const status = await perms.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

function micBlockedHelp(): string {
  if (isIos()) {
    return "Mic blocked. On iPhone: Settings → Safari → Microphone → Allow, then reload libraix.ai and tap 🎙 again.";
  }
  if (isAndroid()) {
    return "Mic blocked. Tap the lock/tune icon left of the URL → Permissions → Microphone → Allow, then tap 🎙 again.";
  }
  return "Mic blocked. Click the lock icon next to the URL → allow Microphone for libraix.ai, then tap 🎙 again.";
}

function friendlyLiveError(raw: string, name?: string): string {
  const blob = `${name ?? ""} ${raw}`;
  if (/REALTIME_NOT_CONFIGURED|TTS_NOT_CONFIGURED/i.test(blob)) {
    return "Live Voice isn’t configured yet (needs OpenAI API key on the server).";
  }
  if (/REALTIME_NOT_ENABLED|REALTIME_UNAUTHORIZED/i.test(blob)) {
    return "Live Voice needs OpenAI Realtime enabled on the API key. Mic + speak-back still work.";
  }
  if (/VOICE_LIMIT/i.test(blob)) {
    return "Free Live Voice is limited to 5 minutes/day. Upgrade to Pro for unlimited Live Voice.";
  }
  if (/USAGE_LIMIT/i.test(blob)) {
    return "Daily message limit reached on Free (30/day). Upgrade to Pro for more messages.";
  }
  if (/NotAllowedError|Permission denied|Permission|NotAllowed/i.test(blob)) return micBlockedHelp();
  if (/NotFoundError|DevicesNotFound/i.test(blob)) return "No microphone found. Plug one in (or check system mic settings) and try again.";
  if (/NotReadableError|TrackStartError|AbortError/i.test(blob)) {
    return "Microphone is in use by another app. Close that app, then tap 🎙 again.";
  }
  if (/insecure|secure context|HTTPS/i.test(blob)) {
    return "Live Voice needs a secure (HTTPS) connection. Open https://libraix.ai directly.";
  }
  if (/getUserMedia/i.test(blob)) return "Couldn’t access the microphone. Check browser mic settings and try again.";
  return raw.slice(0, 180) || "Couldn’t start Live Voice.";
}

/**
 * ChatGPT-style Advanced Voice via OpenAI Realtime WebRTC.
 * SDP offer → our `/api/tools/realtime/session` → play remote audio.
 */
export function useLiveVoice(opts: UseLiveVoiceOptions = {}) {
  const [status, setStatus] = useState<LiveVoiceStatus>("idle");
  const [error, setError] = useState("");
  const [partialUser, setPartialUser] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const maxSecondsRef = useRef(0);
  const reportedRef = useRef(false);
  const onTranscriptRef = useRef(opts.onTranscript);
  onTranscriptRef.current = opts.onTranscript;
  const onUsageReportedRef = useRef(opts.onUsageReported);
  onUsageReportedRef.current = opts.onUsageReported;
  const voiceRef = useRef(opts.voice);
  voiceRef.current = opts.voice;

  const showError = useCallback((msg: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);
    if (msg) {
      // Permission help is longer — keep it visible a bit more
      const ms = /Mic blocked|Settings →|lock icon/i.test(msg) ? 14_000 : 8_000;
      errorTimerRef.current = setTimeout(() => setError(""), ms);
    }
  }, []);

  const reportUsage = useCallback(async () => {
    if (reportedRef.current || !startedAtRef.current) return;
    reportedRef.current = true;
    const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    startedAtRef.current = null;
    try {
      await fetch("/api/tools/realtime/usage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
      });
      onUsageReportedRef.current?.();
    } catch {
      /* ignore */
    }
  }, []);

  const cleanup = useCallback(() => {
    if (limitTimerRef.current) {
      clearInterval(limitTimerRef.current);
      limitTimerRef.current = null;
    }
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
    void reportUsage();
    cleanup();
    setPartialUser("");
    setSecondsLeft(null);
    setStatus("idle");
  }, [cleanup, reportUsage]);

  useEffect(
    () => () => {
      void reportUsage();
      cleanup();
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    },
    [cleanup, reportUsage]
  );

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
    showError("");
    setPartialUser("");
    setStatus("connecting");
    cleanup();

    try {
      if (!isSecureEnough()) {
        throw new Error("Live Voice needs a secure (HTTPS) connection.");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Live Voice needs a modern browser with microphone support.");
      }

      const perm = await micPermissionState();
      if (perm === "denied") {
        throw new Error("NotAllowedError");
      }

      // Request mic first (from the user tap) so permission UI feels instant
      let ms: MediaStream;
      try {
        ms = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (first) {
        // Retry with bare constraints — some mobile browsers reject advanced constraints
        const name = first instanceof DOMException ? first.name : "";
        if (name === "OverconstrainedError" || name === "NotFoundError" || name === "TypeError") {
          ms = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw first;
        }
      }
      streamRef.current = ms;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "true");
      // iOS often needs muted=false after a user gesture
      audioEl.muted = false;
      document.body.appendChild(audioEl);
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0] ?? null;
        void audioEl.play().catch(() => {
          /* autoplay may need a prior user gesture — start() is from a click */
        });
      };

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

      const payload = (await res.json()) as {
        sdp: string;
        maxSessionSeconds?: number;
        remainingVoiceSeconds?: number;
        voiceUnlimited?: boolean;
      };
      if (!payload.sdp) throw new Error("Couldn’t start Live Voice session.");
      await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });

      const maxSec = Math.max(15, payload.maxSessionSeconds ?? 300);
      maxSecondsRef.current = maxSec;
      startedAtRef.current = Date.now();
      reportedRef.current = false;
      setSecondsLeft(payload.voiceUnlimited ? null : maxSec);

      if (limitTimerRef.current) clearInterval(limitTimerRef.current);
      limitTimerRef.current = setInterval(() => {
        if (!startedAtRef.current) return;
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        const left = maxSecondsRef.current - elapsed;
        if (!payload.voiceUnlimited) setSecondsLeft(Math.max(0, left));
        if (left <= 0) {
          showError(
            payload.voiceUnlimited
              ? "Live Voice session ended."
              : "Free Live Voice time used up for today (5 min). Upgrade to Pro for unlimited voice."
          );
          void reportUsage();
          cleanup();
          setSecondsLeft(null);
          setStatus("idle");
        }
      }, 1000);

      pc.onconnectionstatechange = () => {
        if (
          pcRef.current === pc &&
          (pc.connectionState === "failed" || pc.connectionState === "closed")
        ) {
          void reportUsage();
          cleanup();
          setSecondsLeft(null);
          setStatus("idle");
        }
      };

      setStatus("live");
    } catch (e) {
      cleanup();
      const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : "";
      const msg = friendlyLiveError(e instanceof Error ? e.message : String(e), name);
      showError(msg);
      setStatus("error");
    }
  }, [cleanup, handleServerEvent, reportUsage, showError, status]);

  const toggle = useCallback(async () => {
    if (status === "live" || status === "connecting") {
      stop();
      return;
    }
    await start();
  }, [start, status, stop]);

  const clearError = useCallback(() => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError("");
  }, []);

  return {
    status,
    active: status === "live" || status === "connecting",
    connecting: status === "connecting",
    live: status === "live",
    error,
    partialUser,
    /** Seconds left in this free session; null when unlimited / idle */
    secondsLeft,
    supported:
      typeof window !== "undefined" &&
      typeof RTCPeerConnection !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      isSecureEnough(),
    start,
    stop,
    toggle,
    clearError,
  };
}
