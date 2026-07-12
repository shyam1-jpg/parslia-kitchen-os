import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
  streaming?: boolean;
}

export function MarkdownMessage({ content, streaming }: MarkdownMessageProps) {
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
