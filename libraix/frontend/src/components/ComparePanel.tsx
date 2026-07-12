import { useEffect, useState } from "react";
import { advancedApi, pickCompareModels, type CompareResult } from "../lib/advanced";
import type { ModelInfo } from "../lib/api";

interface ComparePanelProps {
  models: ModelInfo[];
  onClose: () => void;
}

export function ComparePanel({ models, onClose }: ComparePanelProps) {
  const [prompt, setPrompt] = useState("");
  const [selected, setSelected] = useState<string[]>(() => pickCompareModels(models, 2));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (models.length >= 2 && selected.length < 2) {
      setSelected(pickCompareModels(models, 2));
    }
  }, [models, selected.length]);

  const toggleModel = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const runCompare = async () => {
    if (selected.length < 2 || !prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await advancedApi.compare(prompt.trim(), selected);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="compare-panel">
      <div className="compare-header">
        <h3>Compare Models</h3>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>

      <p className="compare-sub">Submit one prompt to 2–4 models side by side.</p>

      <div className="compare-model-picks">
        {models.filter((m) => m.capabilities.chat).map((m) => (
          <button
            key={m.id}
            className={`compare-pick ${selected.includes(m.id) ? "active" : ""}`}
            onClick={() => toggleModel(m.id)}
          >
            {m.displayName}
          </button>
        ))}
      </div>

      <textarea
        className="input compare-input"
        rows={3}
        placeholder="Enter your prompt…"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {error && <div className="error-banner">{error}</div>}

      <button className="btn btn-primary btn-sm" disabled={loading || selected.length < 2} onClick={runCompare}>
        {loading ? "Comparing…" : "Compare"}
      </button>

      {result && (
        <div className="compare-results">
          {result.results.map((r) => (
            <div key={r.modelId} className="compare-result-card">
              <div className="compare-result-head">
                <strong>{r.displayName}</strong>
                <span>{r.responseTimeMs}ms · ~{r.estimatedCostCents}c</span>
              </div>
              {r.error ? (
                <p className="compare-error">{r.error}</p>
              ) : (
                <p className="compare-content">{r.content}</p>
              )}
            </div>
          ))}
          {result.judgeSummary && (
            <div className="compare-judge">
              <strong>Libraix Judge</strong>
              <p>{result.judgeSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
