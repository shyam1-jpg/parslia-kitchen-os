import type { ProjectAnalysis } from "../types";

export function ProjectSummary({ analysis }: { analysis: ProjectAnalysis }) {
  return (
    <section className="project-summary">
      <h2>{analysis.name}</h2>
      <p>{analysis.summary}</p>
      <div className="tags">
        {analysis.stack?.slice(0, 6).map((s) => (
          <span key={s}>{s}</span>
        ))}
        {analysis.hospitalitySignals?.slice(0, 6).map((s) => (
          <span key={s} className="hosp">
            {s}
          </span>
        ))}
        <span>{analysis.fileCount} files scanned</span>
      </div>
    </section>
  );
}
