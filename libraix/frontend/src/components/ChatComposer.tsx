import { useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { IconAttach, IconMic, IconMicOff, IconSearch, IconSend } from "../components/Layout";
import { useSpeechInput } from "../lib/useSpeechInput";
import { useLiveVoice, type LiveTranscript } from "../lib/useLiveVoice";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  placeholder?: string;
  loading?: boolean;
  streaming?: boolean;
  attachLoading?: boolean;
  imageMode?: boolean;
  onToggleImageMode?: () => void;
  onFileSelect?: (file: File) => void;
  onDeepResearch?: () => void;
  onCamera?: () => void;
  /** BCP-47 locale for speech recognition (hi-IN, ta-IN, …). */
  speechLocale?: string;
  /** Preferred TTS / Realtime voice */
  liveVoiceId?: string;
  /** Append Live Voice transcripts into the chat thread */
  onLiveTranscript?: (entry: LiveTranscript) => void;
  /** Refresh daily usage after a Live Voice session reports seconds */
  onLiveUsageReported?: () => void;
  /** Remaining Live Voice seconds today (−1 / undefined = unlimited) */
  voiceSecondsRemaining?: number | null;
  voiceUnlimited?: boolean;
  extraAbove?: ReactNode;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  placeholder = "Message Libraix…",
  loading = false,
  streaming = false,
  attachLoading = false,
  imageMode = false,
  onToggleImageMode,
  onFileSelect,
  onDeepResearch,
  onCamera,
  speechLocale,
  liveVoiceId,
  onLiveTranscript,
  onLiveUsageReported,
  voiceSecondsRemaining,
  voiceUnlimited = false,
  extraAbove,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speech = useSpeechInput(onChange, { speechLocale });
  const live = useLiveVoice({
    voice: liveVoiceId,
    onTranscript: onLiveTranscript,
    onUsageReported: onLiveUsageReported,
  });
  const voiceBlocked =
    !voiceUnlimited && typeof voiceSecondsRemaining === "number" && voiceSecondsRemaining >= 0 && voiceSecondsRemaining < 15;

  // Stop dictation mic when a reply starts so it doesn't keep typing over the chat
  useEffect(() => {
    if (streaming || loading) speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to stream/load edges
  }, [streaming, loading]);

  // Don't run dictation and Live Voice at the same time
  useEffect(() => {
    if (live.active) speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.active]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && !live.active && value.trim() && !loading) {
        speech.stop();
        onSend();
      }
    }
  };

  return (
    <div className="composer-wrap">
      {extraAbove}
      {(speech.error || live.error) && (
        <div
          className={`composer-banner ${/Mic blocked|lock icon|Settings →/i.test(speech.error || live.error) ? "info-banner" : "error-banner"}`}
          role="status"
        >
          {speech.error || live.error}
        </div>
      )}
      {live.live && (
        <div className="voice-live-bar composer-banner">
          <span className="voice-pulse" aria-hidden />
          Live Voice — speak naturally. Tap 🎙 again to hang up.
          {live.secondsLeft != null ? (
            <em className="voice-partial">
              {" "}
              · {Math.floor(live.secondsLeft / 60)}:{String(live.secondsLeft % 60).padStart(2, "0")} left
            </em>
          ) : null}
          {live.partialUser ? <em className="voice-partial"> Hearing: {live.partialUser}</em> : null}
        </div>
      )}
      {!live.active && !voiceUnlimited && typeof voiceSecondsRemaining === "number" && voiceSecondsRemaining >= 0 && (
        <div className="info-banner composer-banner">
          Free Live Voice: {Math.max(0, Math.floor(voiceSecondsRemaining / 60))}m {voiceSecondsRemaining % 60}s left today
          (5 min/day). Pro = unlimited.
        </div>
      )}
      {live.connecting && (
        <div className="info-banner composer-banner">Connecting Live Voice…</div>
      )}
      {speech.listening && !live.active && (
        <div className="voice-listening-bar composer-banner">
          <span className="voice-pulse" aria-hidden />
          Listening — speak clearly. Tap mic to stop, then Send.
        </div>
      )}
      <div
        className={`composer composer-chatgpt ${speech.listening ? "composer-listening" : ""} ${live.active ? "composer-live" : ""} ${imageMode ? "composer-image-mode" : ""}`}
      >
        <div className="composer-toolbar">
          {onToggleImageMode && (
            <button
              type="button"
              className={`composer-tool-btn composer-image-btn ${imageMode ? "active" : ""}`}
              title={imageMode ? "Image mode on — quick render" : "Quick image creation (DALL·E 2 fast)"}
              disabled={loading || streaming || live.active}
              onClick={onToggleImageMode}
              aria-pressed={imageMode}
            >
              🎨
            </button>
          )}
          {onFileSelect && (
            <button
              type="button"
              className="composer-tool-btn"
              title="Attach PDF, DOCX, RTF, or text (contracts & legal files OK)"
              disabled={loading || streaming || attachLoading || live.active}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconAttach />
            </button>
          )}
          {onDeepResearch && (
            <button
              type="button"
              className="composer-tool-btn"
              title="Deep research mode (live web search)"
              disabled={loading || streaming || live.active}
              onClick={onDeepResearch}
            >
              <IconSearch />
            </button>
          )}
          {onCamera && (
            <button
              type="button"
              className="composer-tool-btn"
              title="Open camera — take a photo and ask AI about it"
              disabled={loading || streaming || live.active}
              onClick={onCamera}
            >
              📷
            </button>
          )}
        </div>

        <textarea
          rows={1}
          className="composer-field"
          placeholder={
            live.live
              ? "Live Voice on — just talk…"
              : speech.listening
                ? "Listening… speak or type here"
                : placeholder
          }
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            speech.syncBase(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={(loading && !streaming) || live.active}
          aria-label="Message input"
        />

        <div className="composer-end">
          <button
            type="button"
            className={`composer-live-btn ${live.active ? "active" : ""} ${!live.supported ? "mic-unsupported" : ""}`}
            disabled={loading || streaming || !live.supported || (voiceBlocked && !live.active)}
            title={
              voiceBlocked && !live.active
                ? "Free Live Voice used up for today (5 min). Upgrade for unlimited."
                : !live.supported
                  ? "Live Voice needs Chrome, Edge, or Safari"
                  : live.live
                    ? "End Live Voice"
                    : live.connecting
                      ? "Connecting…"
                      : "Live Voice — talk with Libraix (Realtime)"
            }
            onClick={() => {
              live.clearError();
              speech.stop();
              void live.toggle();
            }}
            aria-pressed={live.active}
            aria-label={live.active ? "End Live Voice" : "Start Live Voice"}
          >
            🎙
          </button>

          <button
            type="button"
            className={`composer-mic-btn ${speech.listening ? "listening" : ""} ${!speech.supported ? "mic-unsupported" : ""}`}
            title={
              !speech.supported
                ? "Voice input needs Chrome or Edge"
                : speech.listening
                  ? "Stop listening"
                  : "Dictate your message"
            }
            disabled={loading || streaming || !speech.supported || live.active}
            onClick={() => {
              speech.clearError();
              speech.toggle(value);
            }}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
          >
            {speech.supported ? <IconMic /> : <IconMicOff />}
          </button>

          {streaming ? (
            <button type="button" className="send-btn" onClick={onStop} title="Stop generating" aria-label="Stop">
              ■
            </button>
          ) : (
            <button
              type="button"
              className="send-btn"
              disabled={!value.trim() || loading || live.active}
              onClick={() => {
                speech.stop();
                onSend();
              }}
              title="Send message"
              aria-label="Send"
            >
              <IconSend />
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.rtf,.txt,.md,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/rtf,text/plain,text/markdown"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && onFileSelect) onFileSelect(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
