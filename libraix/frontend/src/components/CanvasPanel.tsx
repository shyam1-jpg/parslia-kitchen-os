import { useEffect, useState } from "react";

interface CanvasPanelProps {
  open: boolean;
  title?: string;
  content: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onInsertToChat?: (value: string) => void;
}

/** Side-panel document editor for long AI drafts (Canvas). */
export function CanvasPanel({ open, title = "Canvas", content, onChange, onClose, onInsertToChat }: CanvasPanelProps) {
  const [local, setLocal] = useState(content);

  useEffect(() => {
    if (open) setLocal(content);
  }, [open, content]);

  if (!open) return null;

  return (
    <aside className="canvas-panel" aria-label="Canvas editor">
      <div className="canvas-panel-header">
        <div>
          <div className="canvas-kicker">Canvas</div>
          <h3>{title}</h3>
        </div>
        <div className="canvas-panel-actions">
          {onInsertToChat && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onInsertToChat(local)}
              title="Copy canvas text into the composer"
            >
              Use in chat
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void navigator.clipboard.writeText(local);
            }}
          >
            Copy
          </button>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close canvas">
            ×
          </button>
        </div>
      </div>
      <textarea
        className="canvas-editor"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        spellCheck
        placeholder="Edit your document here…"
      />
    </aside>
  );
}
