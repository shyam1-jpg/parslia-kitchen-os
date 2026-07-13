import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Layout";
import { useAuth } from "../lib/auth";
import { imageApi } from "../lib/api";
import { friendlyError } from "../lib/errors";

export function ImagePage() {
  const { user, logout } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [revisedPrompt, setRevisedPrompt] = useState("");
  const [usage, setUsage] = useState<{ imagesUsed: number; imagesLimit: number; remainingImages: number; canGenerate: boolean } | null>(null);

  useEffect(() => {
    imageApi.usage().then(setUsage).catch(console.error);
  }, []);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setError("");
    setLoading(true);
    setImageUrl("");
    try {
      const result = await imageApi.generate({ prompt: prompt.trim(), size, quality });
      setImageUrl(result.url);
      setRevisedPrompt(result.revisedPrompt ?? "");
      const u = await imageApi.usage();
      setUsage(u);
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "FAILED", "Image generation failed"));
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.displayName?.[0] ?? user?.email[0]?.toUpperCase() ?? "?";

  return (
    <div className="app-shell">
      <aside className="sidebar open" style={{ position: "relative" }}>
        <div className="sidebar-header">
          <Logo to="/app" />
        </div>
        <div className="sidebar-body">
          <Link to="/app" className="conv-item">← Back to Chat</Link>
          <div className="sidebar-section-label">Create</div>
          <button className="conv-item active">Image Studio</button>
        </div>
        <div className="sidebar-footer">
          <div className="user-menu">
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.displayName ?? user?.email}</div>
              <div style={{ fontSize: 11, color: "var(--dim)", textTransform: "capitalize" }}>{user?.plan} plan</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: "100%" }} onClick={() => logout()}>Sign out</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="top-bar">
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Image Studio</h1>
          <Link to="/pricing" className="btn btn-ghost btn-sm">Upgrade</Link>
        </header>

        <div className="image-studio">
          <p className="image-studio-intro">
            Create images with <strong>DALL·E 3</strong> through OpenAI. DeepSeek is for chat only — image generation uses your OpenAI API key.
          </p>

          {usage && (
            <div className={`usage-bar ${!usage.canGenerate ? "usage-limit" : ""}`}>
              {usage.canGenerate
                ? `${usage.remainingImages} of ${usage.imagesLimit} images remaining today`
                : `Daily image limit reached (${usage.imagesUsed}/${usage.imagesLimit}). Upgrade for more.`}
            </div>
          )}

          <textarea
            className="input image-prompt"
            rows={3}
            placeholder="Describe the image you want to create… e.g. A sunset over Lincoln Cathedral in watercolour style"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <div className="image-options">
            <label>
              Size
              <select className="model-select" value={size} onChange={(e) => setSize(e.target.value as typeof size)}>
                <option value="1024x1024">Square (1024×1024)</option>
                <option value="1792x1024">Landscape (1792×1024)</option>
                <option value="1024x1792">Portrait (1024×1792)</option>
              </select>
            </label>
            <label>
              Quality
              <select className="model-select" value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)}>
                <option value="standard">Standard</option>
                <option value="hd">HD</option>
              </select>
            </label>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button
            className="btn btn-primary"
            disabled={loading || !prompt.trim() || usage?.canGenerate === false}
            onClick={generate}
          >
            {loading ? "Generating…" : "Generate Image"}
          </button>

          {imageUrl && (
            <div className="image-result">
              <img src={imageUrl} alt={prompt} />
              <div className="image-result-actions">
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Open full size</a>
                <a href={imageUrl} download="libraix-image.png" className="btn btn-ghost btn-sm">Download</a>
              </div>
              {revisedPrompt && (
                <p className="model-disclosure">Prompt used: {revisedPrompt}</p>
              )}
              <p className="model-disclosure">Generated using Libraix Image (OpenAI DALL·E 3) through Libraix</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
