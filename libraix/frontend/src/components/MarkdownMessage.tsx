import { Children, isValidElement, useDeferredValue, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { ImageGenerating } from "./ImageGenerating";
import { ChatGeneratedImage } from "./ChatGeneratedImage";
import type { CodeArtifact } from "../lib/codeArtifacts";
import { normalizeLanguage } from "../lib/codeArtifacts";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface MarkdownMessageProps {
  content: string;
  streaming?: boolean;
  imageGenerating?: boolean;
  /** When true, skip markdown images (already shown via ChatGeneratedImage). */
  suppressImages?: boolean;
  /** Premium status while waiting for the first token. */
  thinkingLabel?: string;
  onOpenArtifact?: (artifact: CodeArtifact) => void;
}

function textFromNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}

function languageFromClassName(className?: string): string {
  const match = (className ?? "").match(/language-([A-Za-z0-9_+-]+)/);
  return normalizeLanguage(match?.[1] ?? "");
}

function CodeFence({
  children,
  onOpen,
}: {
  children?: ReactNode;
  onOpen?: (artifact: CodeArtifact) => void;
}) {
  const [copied, setCopied] = useState(false);
  const child = Children.toArray(children)[0];
  const className = isValidElement<{ className?: string; children?: ReactNode }>(child)
    ? child.props.className
    : undefined;
  const language = languageFromClassName(className);
  const code = textFromNode(children).replace(/\n$/, "");
  const inner = isValidElement<{ children?: ReactNode }>(child) ? child.props.children : children;
  const filename =
    language === "html" ? "index.html" : language ? `snippet.${language}` : "snippet.txt";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="code-fence">
      <div className="code-fence-bar">
        <span className="code-fence-lang">{language || "code"}</span>
        <div className="code-fence-actions">
          <button type="button" className="code-fence-btn" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </button>
          {onOpen && (
            <button
              type="button"
              className="code-fence-btn"
              onClick={() =>
                onOpen({
                  id: `fence-${language}-${code.length}`,
                  language,
                  filename,
                  code,
                })
              }
            >
              Open in Code
            </button>
          )}
        </div>
      </div>
      <pre>
        <code className={className}>{inner}</code>
      </pre>
    </div>
  );
}

/** While streaming, render light markdown; full KaTeX/highlight after idle for speed. */
export function MarkdownMessage({
  content,
  streaming,
  imageGenerating,
  suppressImages,
  thinkingLabel,
  onOpenArtifact,
}: MarkdownMessageProps) {
  const deferred = useDeferredValue(content);

  if (imageGenerating) {
    return <ImageGenerating />;
  }

  if (!content || content === "Thinking…") {
    return streaming ? (
      <div className="thinking-line">
        <span className="voice-pulse" aria-hidden />
        {thinkingLabel || "Libraix is thinking…"}
      </div>
    ) : null;
  }

  const imgComponent = suppressImages
    ? () => null
    : ({ src, alt }: { src?: string; alt?: string }) =>
        src ? <ChatGeneratedImage src={src} alt={alt || "Image"} /> : null;

  if (streaming) {
    return (
      <div className="markdown-body is-streaming">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{ img: imgComponent }}
        >
          {content}
        </ReactMarkdown>
        <span className="stream-cursor">▍</span>
      </div>
    );
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          img: imgComponent,
          pre: ({ children }) => <CodeFence onOpen={onOpenArtifact}>{children}</CodeFence>,
        }}
      >
        {deferred}
      </ReactMarkdown>
    </div>
  );
}
