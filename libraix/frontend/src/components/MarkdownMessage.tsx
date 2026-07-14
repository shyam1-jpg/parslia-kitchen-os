import { useDeferredValue } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { ImageGenerating } from "./ImageGenerating";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface MarkdownMessageProps {
  content: string;
  streaming?: boolean;
  imageGenerating?: boolean;
}

/** While streaming, render light markdown; full KaTeX/highlight after idle for speed. */
export function MarkdownMessage({ content, streaming, imageGenerating }: MarkdownMessageProps) {
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

  if (streaming) {
    return (
      <div className="markdown-body is-streaming">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        <span className="stream-cursor">▍</span>
      </div>
    );
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
        {deferred}
      </ReactMarkdown>
    </div>
  );
}
