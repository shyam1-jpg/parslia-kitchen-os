import { useCallback, useRef, useState } from "react";

export interface CaptureResult {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

export interface VisionTurn {
  role: "user" | "assistant";
  text: string;
}

async function analyseWithVision(
  base64: string,
  mimeType: string,
  question: string,
  opts?: { history?: VisionTurn[]; mode?: "snapshot" | "live_assist" }
): Promise<string> {
  const res = await fetch("/api/tools/vision", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
      question,
      mode: opts?.mode ?? "live_assist",
      history: opts?.history?.slice(-8) ?? [],
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
    throw new Error(err.hint || err.error || `VISION_HTTP_${res.status}`);
  }
  const data = (await res.json()) as { content: string };
  return data.content;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function useCamera() {
  const [open, setOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [history, setHistory] = useState<VisionTurn[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(
    async (face: "environment" | "user" = "environment") => {
      setError("");
      setCapture(null);
      stopTracks();
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera needs a modern browser on HTTPS.");
        }
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: face },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        streamRef.current = stream;
        setFacingMode(face);
        setStreaming(true);
        setOpen(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        const msg = e instanceof Error ? e.message : "";
        if (name === "NotAllowedError" || /denied|not allowed/i.test(msg)) {
          setError(
            isIos()
              ? "Camera needs permission. Tap Aa → Website Settings → Camera → Allow, then try again."
              : "Camera blocked — allow Camera for libraix.ai, then try again."
          );
        } else {
          setError("Could not open camera. Make sure your device has one and you’re on HTTPS.");
        }
      }
    },
    [stopTracks]
  );

  const flipCamera = useCallback(async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    await openCamera(next);
  }, [facingMode, openCamera]);

  const attachStream = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => {});
    }
  }, []);

  const takePhoto = useCallback((): CaptureResult | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    // Cap size for faster uploads on mobile while keeping detail for labels/parts
    const maxW = 1280;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    const base64 = dataUrl.split(",")[1] ?? "";
    const result: CaptureResult = { base64, mimeType: "image/jpeg", dataUrl };
    setCapture(result);
    return result;
  }, []);

  const closeCamera = useCallback(() => {
    stopTracks();
    setStreaming(false);
    setOpen(false);
    setCapture(null);
    setError("");
    setHistory([]);
  }, [stopTracks]);

  const analyse = useCallback(
    async (question: string, result?: CaptureResult | null): Promise<string> => {
      const img = result ?? capture;
      if (!img) throw new Error("No image captured");
      setAnalysing(true);
      try {
        const reply = await analyseWithVision(img.base64, img.mimeType, question, {
          history,
          mode: "live_assist",
        });
        setHistory((prev) => [
          ...prev,
          { role: "user", text: question },
          { role: "assistant", text: reply },
        ]);
        return reply;
      } finally {
        setAnalysing(false);
      }
    },
    [capture, history]
  );

  /** Capture current live frame and ask — camera stays open for follow-ups. */
  const askLive = useCallback(
    async (question: string): Promise<{ reply: string; frame: CaptureResult } | null> => {
      const frame = takePhoto();
      if (!frame) {
        setError("Camera isn’t ready yet — wait a moment for the picture, then try again.");
        return null;
      }
      setAnalysing(true);
      try {
        const reply = await analyseWithVision(frame.base64, frame.mimeType, question, {
          history,
          mode: "live_assist",
        });
        setHistory((prev) => [
          ...prev,
          { role: "user", text: question },
          { role: "assistant", text: reply },
        ]);
        return { reply, frame };
      } finally {
        setAnalysing(false);
      }
    },
    [takePhoto, history]
  );

  return {
    open,
    streaming,
    capture,
    analysing,
    error,
    facingMode,
    history,
    openCamera,
    flipCamera,
    attachStream,
    takePhoto,
    closeCamera,
    analyse,
    askLive,
    setError,
  };
}
