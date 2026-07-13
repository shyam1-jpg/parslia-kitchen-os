import { useEffect, useRef, useState } from "react";
import { advancedApi, type Project } from "../lib/advanced";
import { friendlyError } from "../lib/errors";

interface ProjectPanelProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelect: (projectId: string | null) => void;
  onProjectsChange: () => void;
  onError: (msg: string) => void;
  onClearError?: () => void;
}

export function ProjectPanel({ projects, activeProjectId, onSelect, onProjectsChange, onError, onClearError }: ProjectPanelProps) {
  const [expanded, setExpanded] = useState(Boolean(activeProjectId));
  const [files, setFiles] = useState<Array<{ id: string; filename: string; chunkCount?: number; indexStatus?: string; indexError?: string | null }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const active = projects.find((p) => p.id === activeProjectId);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadFiles = async (projectId: string) => {
    try {
      const data = await advancedApi.getProject(projectId);
      setFiles(
        data.files.map((f) => ({
          id: f.id,
          filename: f.filename,
          chunkCount: f.chunkCount,
          indexStatus: f.indexStatus,
          indexError: f.indexError,
        }))
      );
      return data.files;
    } catch {
      setFiles([]);
      return [];
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (projectId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const list = await loadFiles(projectId);
      const pending = list.some((f) => f.indexStatus === "pending" || f.indexStatus === "indexing");
      if (!pending && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2000);
  };

  const handleSelect = async (projectId: string | null) => {
    onSelect(projectId);
    if (projectId) {
      setExpanded(true);
      await loadFiles(projectId);
    } else {
      setFiles([]);
    }
  };

  const createProject = async () => {
    const name = window.prompt("Project name");
    if (!name?.trim()) return;
    const instructions = window.prompt("Custom instructions for this project (optional)") ?? undefined;
    try {
      const project = await advancedApi.createProject(name.trim(), undefined, instructions || undefined);
      onProjectsChange();
      await handleSelect(project.id);
    } catch (e) {
      onError(friendlyError(e instanceof Error ? e.message : "FAILED", "Could not create project"));
    }
  };

  const editInstructions = async () => {
    if (!active) return;
    const instructions = window.prompt("Project instructions", active.instructions ?? "");
    if (instructions === null) return;
    try {
      await advancedApi.updateProject(active.id, { instructions });
      onProjectsChange();
    } catch (e) {
      onError(friendlyError(e instanceof Error ? e.message : "FAILED", "Could not update project"));
    }
  };

  const uploadFile = async (file: File) => {
    if (!activeProjectId) return;
    if (file.size > 5_000_000) {
      onError("File too large (max 5MB for project indexing).");
      return;
    }
    setUploading(true);
    try {
      const result = await advancedApi.uploadProjectFile(activeProjectId, file);
      onClearError?.();
      await loadFiles(activeProjectId);
      if (result.status === "indexing") {
        startPolling(activeProjectId);
      } else if ((result.chunkCount ?? 0) === 0) {
        onError("File saved but no text could be indexed. Try PDF, DOCX, TXT, or CSV.");
      }
    } catch (e) {
      onError(friendlyError(e instanceof Error ? e.message : "UPLOAD_FAILED", "Could not upload file"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="project-panel">
      <div className="sidebar-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Projects</span>
        <button type="button" className="icon-btn" title="New project" onClick={createProject}>+</button>
      </div>
      <select
        className="input project-select"
        value={activeProjectId ?? ""}
        onChange={(e) => handleSelect(e.target.value || null)}
      >
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.fileCount} files)</option>
        ))}
      </select>
      {active && (
        <>
          <button type="button" className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8 }} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide project files" : "Show project files"}
          </button>
          {expanded && (
            <div className="project-files">
              <p className="project-hint">Files are indexed for Q&amp;A with citations when this project is active.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={editInstructions}>Edit instructions</button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Indexing…" : "Upload file"}
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                  e.target.value = "";
                }}
              />
              {files.length === 0 ? (
                <p className="project-hint">No indexed files yet.</p>
              ) : (
                <ul className="project-file-list">
                  {files.map((f) => (
                    <li key={f.id}>
                      📄 {f.filename}
                      {f.indexStatus === "pending" || f.indexStatus === "indexing" ? (
                        <span className="project-chunks">indexing…</span>
                      ) : f.indexStatus === "failed" ? (
                        <span className="project-chunks" title={f.indexError ?? undefined}>failed</span>
                      ) : f.chunkCount ? (
                        <span className="project-chunks">{f.chunkCount} chunks</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
