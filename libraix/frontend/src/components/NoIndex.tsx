import { useEffect } from "react";

/** Prevent search engines from indexing authenticated app and admin routes. */
export function NoIndex() {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const meta = existing ?? document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow");
    if (!existing) document.head.appendChild(meta);
    return () => {
      if (!existing && meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, []);
  return null;
}
