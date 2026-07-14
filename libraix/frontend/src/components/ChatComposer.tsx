import { useEffect, useRef, type ReactNode, type KeyboardEvent } from "react";
import { IconAttach, IconMic, IconMicOff, IconSearch, IconSend } from "../components/Layout";
import { useSpeechInput } from "../lib/useSpeechInput";

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
  extraAbove,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speech = useSpeechInput(onChange);

  // Stop mic when a reply starts so it doesn't keep typing over the chat
  useEffect(() => {
    if (streaming || loading) speech.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to stream/load edges
  }, [streaming, loading]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && value.trim() && !loading) {
        speech.stop();
        onSend();
      }
    }
  };

  return (
    <div className="composer-wrap">
      {extraAbove}
      {speech.error && (
        <div className="error-banner composer-banner">{speech.error}</div>
      )}
      {speech.listening && (
        <div className="voice-listening-bar composer-banner">
          <span className="voice-pulse" aria-hidden />
          Listening — speak clearly. Tap mic to stop, then Send.
        </div>
      )}
      <div className={`composer composer-chatgpt ${speech.listening ? "composer-listening" : ""} ${imageMode ? "composer-image-mode" : ""}`}>
        <div className="composer-toolbar">
          {onToggleImageMode && (
            <button
              type="button"
              className={`composer-tool-btn composer-image-btn ${imageMode ? "active" : ""}`}
              title={imageMode ? "Image mode on — quick render" : "Quick image creation (DALL·E 2 fast)"}
              disabled={loading || streaming}
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
              disabled={loading || streaming || attachLoading}
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
              disabled={loading || streaming}
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
              disabled={loading || streaming}
              onClick={onCamera}
            >
              📷
            </button>
          )}
        </div>

        <textarea
          rows={1}
          className="composer-field"
          placeholder={speech.listening ? "Listening… speak or type here" : placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            speech.syncBase(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={loading && !streaming}
          aria-label="Message input"
        />

        <div className="composer-end">
          <button
            type="button"
            className={`composer-mic-btn ${speech.listening ? "listening" : ""} ${!speech.supported ? "mic-unsupported" : ""}`}
            title={
              !speech.supported
                ? "Voice input needs Chrome or Edge"
                : speech.listening
                  ? "Stop listening"
                  : "Speak your message"
            }
            disabled={loading || streaming || !speech.supported}
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
              disabled={!value.trim() || loading}
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
