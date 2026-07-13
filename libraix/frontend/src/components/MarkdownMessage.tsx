import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ImageGenerating } from "./ImageGenerating";

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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {streaming && <span className="stream-cursor">▍</span>}
    </div>
  );
}
