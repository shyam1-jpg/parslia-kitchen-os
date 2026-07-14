import { useState } from "react";

interface ChatGeneratedImageProps {
  src: string;
  alt?: string;
}

/** ChatGPT-style: show the full generated picture inline — no download/open click required. */
export function ChatGeneratedImage({ src, alt = "Generated image" }: ChatGeneratedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return failed ? <p className="chat-gen-image-error">Could not display image.</p> : null;
  }

  return (
    <div className={`chat-gen-image-wrap ${loaded ? "is-loaded" : "is-loading"}`}>
      {!loaded && <div className="chat-gen-image-skeleton" aria-hidden>Loading image…</div>}
      <img
        className="chat-gen-image"
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
