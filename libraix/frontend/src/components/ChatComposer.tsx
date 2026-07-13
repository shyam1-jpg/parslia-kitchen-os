import { useRef, type ReactNode, type KeyboardEvent } from "react";
import { IconAttach, IconMic, IconSearch, IconSend } from "../components/Layout";
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
  onFileSelect?: (file: File) => void;
  onDeepResearch?: () => void;
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
  onFileSelect,
  onDeepResearch,
  extraAbove,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speech = useSpeechInput(onChange);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!streaming && value.trim() && !loading) onSend();
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
          Listening — speak now. You can also type. Tap mic to stop.
        </div>
      )}
      <div className={`composer composer-chatgpt ${speech.listening ? "composer-listening" : ""}`}>
        <div className="composer-toolbar">
          {onFileSelect && (
            <button
              type="button"
              className="composer-tool-btn"
              title="Attach PDF or text file"
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
            className={`composer-mic-btn ${speech.listening ? "listening" : ""}`}
            title={
              speech.supported
                ? speech.listening
                  ? "Stop listening"
                  : "Speak your message (voice + typing)"
                : "Voice input — use Chrome or Edge"
            }
            disabled={loading || streaming}
            onClick={() => {
              speech.clearError();
              speech.toggle(value);
            }}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
          >
            <IconMic />
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
              onClick={onSend}
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
          accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown"
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
