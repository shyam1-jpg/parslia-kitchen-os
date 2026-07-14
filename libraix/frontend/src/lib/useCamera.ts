import { useCallback, useRef, useState } from "react";

export interface CaptureResult {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

async function analyseWithVision(base64: string, mimeType: string, question: string): Promise<string> {
  const res = await fetch("/api/tools/vision", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `VISION_HTTP_${res.status}`);
  }
  const data = await res.json() as { content: string };
  return data.content;
}

export function useCamera() {
  const [open, setOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [capture, setCapture] = useState<CaptureResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const openCamera = useCallback(async () => {
    setError("");
    setCapture(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStreaming(true);
      setOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/denied|not allowed/i.test(msg)) {
        setError("Camera blocked — allow camera in your browser address bar.");
      } else {
        setError("Could not open camera. Make sure your device has one.");
      }
    }
  }, []);

  const attachStream = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
    }
  }, []);

  const takePhoto = useCallback((): CaptureResult | null => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1] ?? "";
    const result: CaptureResult = { base64, mimeType: "image/jpeg", dataUrl };
    setCapture(result);
    return result;
  }, []);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
    setOpen(false);
    setCapture(null);
    setError("");
  }, []);

  const analyse = useCallback(async (question: string, result?: CaptureResult | null): Promise<string> => {
    const img = result ?? capture;
    if (!img) throw new Error("No image captured");
    setAnalysing(true);
    try {
      return await analyseWithVision(img.base64, img.mimeType, question);
    } finally {
      setAnalysing(false);
    }
  }, [capture]);

  return { open, streaming, capture, analysing, error, openCamera, attachStream, takePhoto, closeCamera, analyse, setError };
}
