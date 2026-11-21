/** Parse fenced code from chat so Libraix can open a Claude/ChatGPT-style canvas. */

export interface CodeArtifact {
  id: string;
  language: string;
  filename: string;
  code: string;
}

const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g;

const DEFAULT_FILES: Record<string, string> = {
  js: "index.js",
  javascript: "index.js",
  ts: "index.ts",
  typescript: "index.ts",
  jsx: "App.jsx",
  tsx: "App.tsx",
  py: "main.py",
  python: "main.py",
  html: "index.html",
  css: "styles.css",
  json: "data.json",
  bash: "script.sh",
  sh: "script.sh",
  shell: "script.sh",
  zsh: "script.sh",
  sql: "query.sql",
  go: "main.go",
  rust: "main.rs",
  rs: "main.rs",
  java: "Main.java",
  c: "main.c",
  cpp: "main.cpp",
  rb: "main.rb",
  ruby: "main.rb",
  php: "index.php",
  swift: "main.swift",
  kt: "Main.kt",
  kotlin: "Main.kt",
  yaml: "config.yaml",
  yml: "config.yaml",
  md: "notes.md",
  markdown: "notes.md",
  svg: "graphic.svg",
  xml: "data.xml",
  txt: "notes.txt",
};

export function normalizeLanguage(raw: string): string {
  const lang = raw.trim().toLowerCase().split(/[:\s{]/)[0] ?? "";
  if (lang === "js") return "javascript";
  if (lang === "ts") return "typescript";
  if (lang === "py") return "python";
  if (lang === "sh" || lang === "zsh" || lang === "shell") return "bash";
  if (lang === "rs") return "rust";
  return lang;
}

function filenameFromFence(info: string, language: string, code: string, index: number): string {
  const fileInInfo = info.match(/([\w./-]+\.[A-Za-z0-9]{1,8})/);
  if (fileInInfo) return fileInInfo[1].split("/").pop() ?? fileInInfo[1];

  const first = (code.split("\n")[0] ?? "").trim();
  const fileInComment = first.match(/(?:\/\/|#|--|<!--)\s*([\w./-]+\.[A-Za-z0-9]{1,8})/);
  if (fileInComment) return fileInComment[1].split("/").pop() ?? fileInComment[1];

  const base = DEFAULT_FILES[language] ?? (language ? `snippet.${language}` : `snippet-${index + 1}.txt`);
  if (index === 0) return base;
  return base.replace(/(\.[A-Za-z0-9]+)$/, `-${index + 1}$1`);
}

export function extractCodeArtifacts(markdown: string): CodeArtifact[] {
  const out: CodeArtifact[] = [];
  const re = new RegExp(FENCE_RE.source, FENCE_RE.flags);
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(markdown))) {
    const info = (match[1] ?? "").trim();
    const code = (match[2] ?? "").replace(/\n$/, "");
    if (!code.trim()) continue;
    const language = normalizeLanguage(info) || guessLanguage(code);
    out.push({
      id: `art-${index}`,
      language,
      filename: filenameFromFence(info, language, code, index),
      code,
    });
    index += 1;
  }
  return out;
}

export function guessLanguage(code: string): string {
  const trimmed = code.trim();
  if (/^<!DOCTYPE html|<html[\s>]/i.test(trimmed)) return "html";
  if (/^import |^from |def |print\(/m.test(trimmed) && /:\n/.test(trimmed)) return "python";
  if (/^(?:const|let|var|function|import )\b/m.test(trimmed)) return "javascript";
  return "";
}

export function isSubstantialArtifact(artifact: CodeArtifact): boolean {
  const lines = artifact.code.split("\n").length;
  return lines >= 8 || artifact.code.length >= 240;
}

export function pickPrimaryArtifact(artifacts: CodeArtifact[]): CodeArtifact | null {
  if (artifacts.length === 0) return null;
  const ranked = [...artifacts].sort((a, b) => {
    const score = (x: CodeArtifact) => x.code.length + (isSubstantialArtifact(x) ? 500 : 0);
    return score(b) - score(a);
  });
  return ranked[0] ?? null;
}

export function canRunJavaScript(language: string): boolean {
  return language === "javascript" || language === "js";
}

export function canPreviewHtml(language: string): boolean {
  return language === "html" || language === "svg";
}

export const CODE_DRAFT_KEY = "libraix_code_draft";

export function stashCodeDraft(artifact: Pick<CodeArtifact, "filename" | "language" | "code">): void {
  try {
    sessionStorage.setItem(CODE_DRAFT_KEY, JSON.stringify(artifact));
  } catch {
    /* ignore quota */
  }
}

export function readCodeDraft(): Pick<CodeArtifact, "filename" | "language" | "code"> | null {
  try {
    const raw = sessionStorage.getItem(CODE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CodeArtifact>;
    if (typeof parsed.code !== "string") return null;
    return {
      filename: parsed.filename || "index.js",
      language: parsed.language || "javascript",
      code: parsed.code,
    };
  } catch {
    return null;
  }
}

export function clearCodeDraft(): void {
  try {
    sessionStorage.removeItem(CODE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
