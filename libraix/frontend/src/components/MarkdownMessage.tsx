import { useDeferredValue } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { ImageGenerating } from "./ImageGenerating";
import { ChatGeneratedImage } from "./ChatGeneratedImage";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface MarkdownMessageProps {
  content: string;
  streaming?: boolean;
  imageGenerating?: boolean;
  /** When true, skip markdown images (already shown via ChatGeneratedImage). */
  suppressImages?: boolean;
}

/** While streaming, render light markdown; full KaTeX/highlight after idle for speed. */
export function MarkdownMessage({ content, streaming, imageGenerating, suppressImages }: MarkdownMessageProps) {
  const deferred = useDeferredValue(content);

  if (imageGenerating) {
    return <ImageGenerating />;
  }

  if (!content || content === "Thinking…") {
    return streaming ? (
      <div className="thinking-line">
        <span className="voice-pulse" aria-hidden />
        Thinking…
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
        components={{ img: imgComponent }}
      >
        {deferred}
      </ReactMarkdown>
    </div>
  );
}
