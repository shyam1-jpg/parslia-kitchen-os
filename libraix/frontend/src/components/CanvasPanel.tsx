import { useEffect, useState } from "react";
import { canPreviewHtml, canRunJavaScript } from "../lib/codeArtifacts";
import { htmlPreviewDocument, runJavaScript } from "../lib/codeSandbox";

interface CanvasPanelProps {
  open: boolean;
  title?: string;
  content: string;
  language?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onInsertToChat?: (value: string) => void;
  onOpenSandbox?: (value: string, language: string, title: string) => void;
}

type CanvasView = "edit" | "preview" | "output";

/** Side-panel document / code editor (Libraix Canvas). */
export function CanvasPanel({
  open,
  title = "Canvas",
  content,
  language = "",
  onChange,
  onClose,
  onInsertToChat,
  onOpenSandbox,
}: CanvasPanelProps) {
  const [local, setLocal] = useState(content);
  const [view, setView] = useState<CanvasView>("edit");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const isCode = Boolean(language);
  const runnable = canRunJavaScript(language);
  const previewable = canPreviewHtml(language);

  useEffect(() => {
    if (open) {
      setLocal(content);
      setView("edit");
      setOutput("");
    }
  }, [open, content, language]);

  if (!open) return null;

  const run = () => {
    const result = runJavaScript(local);
    setOutput(result.output);
    setView("output");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(local);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <aside className={`canvas-panel${isCode ? " is-code" : ""}`} aria-label="Libraix Canvas">
      <div className="canvas-panel-header">
        <div>
          <div className="canvas-kicker">{isCode ? "Libraix Code" : "Libraix Canvas"}</div>
          <h3>{title}</h3>
        </div>
        <div className="canvas-panel-actions">
          {runnable && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={run} title="Run JavaScript in the browser">
              Run
            </button>
          )}
          {previewable && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setView(view === "preview" ? "edit" : "preview")}
            >
              {view === "preview" ? "Edit" : "Preview"}
            </button>
          )}
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
          {onOpenSandbox && isCode && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onOpenSandbox(local, language, title)}
              title="Open the full Libraix Code sandbox"
            >
              Sandbox
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close canvas">
            ×
          </button>
        </div>
      </div>
      {(runnable || previewable || output) && (
        <div className="canvas-view-tabs" role="tablist">
          <button type="button" className={view === "edit" ? "active" : ""} onClick={() => setView("edit")}>
            Edit
          </button>
          {previewable && (
            <button type="button" className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>
              Preview
            </button>
          )}
          {(runnable || output) && (
            <button type="button" className={view === "output" ? "active" : ""} onClick={() => setView("output")}>
              Output
            </button>
          )}
        </div>
      )}
      {view === "edit" && (
        <textarea
          className={`canvas-editor${isCode ? " code-editor" : ""}`}
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
            onChange(e.target.value);
          }}
          spellCheck={!isCode}
          placeholder={isCode ? "Edit this program…" : "Edit your document here…"}
        />
      )}
      {view === "preview" && previewable && (
        <iframe
          className="canvas-preview"
          title="Libraix preview"
          sandbox="allow-scripts"
          srcDoc={htmlPreviewDocument(local, language)}
        />
      )}
      {view === "output" && (
        <pre className="code-output canvas-output">{output || (runnable ? "Run to see output." : "No output.")}</pre>
      )}
      {isCode && !runnable && !previewable && (
        <p className="canvas-hint">Copy this {language || "file"} and run it locally — browser run is JavaScript or HTML.</p>
      )}
    </aside>
  );
}
