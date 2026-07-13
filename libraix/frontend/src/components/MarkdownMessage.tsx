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

export function MarkdownMessage({ content, streaming, imageGenerating }: MarkdownMessageProps) {
  if (imageGenerating) {
    return <ImageGenerating />;
  }

  if (!content) {
    return streaming ? <span className="stream-cursor">▍</span> : null;
  }

  return (
    <div className={`markdown-body${streaming ? " is-streaming" : ""}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
        {content}
      </ReactMarkdown>
      {streaming && <span className="stream-cursor">▍</span>}
    </div>
  );
}
