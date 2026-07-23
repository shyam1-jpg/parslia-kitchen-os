import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
import type { ProjectAnalysis } from "../agent/types";
import { getWorkspaceRoot, readTextFile, shouldIgnore, toRelPath, walkFiles } from "./workspace";

const HOSPITALITY_KEYWORDS = [
  "menu",
  "recipe",
  "allergen",
  "stock",
  "inventory",
  "supplier",
  "invoice",
  "rota",
  "kitchen",
  "fridge",
  "temperature",
  "catering",
  "hospitality",
  "ingredient",
  "portion"
];

async function safeRead(rel: string, max = 8000): Promise<string | null> {
  try {
    const text = await readTextFile(rel);
    return text.length > max ? text.slice(0, max) : text;
  } catch {
    return null;
  }
}

function detectStack(files: string[], pkg?: any): string[] {
  const stack = new Set<string>();
  if (pkg?.dependencies || pkg?.devDependencies) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.react || deps["react-dom"]) stack.add("React");
    if (deps.vue) stack.add("Vue");
    if (deps.next) stack.add("Next.js");
    if (deps.express) stack.add("Express");
    if (deps.vite) stack.add("Vite");
    if (deps.typescript || files.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) stack.add("TypeScript");
    if (deps.stripe) stack.add("Stripe");
    if (deps["@supabase/supabase-js"]) stack.add("Supabase");
    if (deps["drizzle-orm"] || deps.prisma) stack.add(deps.prisma ? "Prisma" : "Drizzle");
  }
  if (files.some((f) => f.endsWith(".py"))) stack.add("Python");
  if (files.includes("Cargo.toml")) stack.add("Rust");
  if (files.includes("go.mod")) stack.add("Go");
  return [...stack];
}

function detectPackageManagers(root: string): string[] {
  const managers: string[] = [];
  if (existsSync(path.join(root, "pnpm-lock.yaml"))) managers.push("pnpm");
  if (existsSync(path.join(root, "yarn.lock"))) managers.push("yarn");
  if (existsSync(path.join(root, "package-lock.json"))) managers.push("npm");
  if (existsSync(path.join(root, "bun.lockb"))) managers.push("bun");
  if (existsSync(path.join(root, "requirements.txt")) || existsSync(path.join(root, "pyproject.toml"))) {
    managers.push("pip/poetry");
  }
  return managers;
}

export async function analyseProject(): Promise<ProjectAnalysis> {
  const root = getWorkspaceRoot();
  const name = path.basename(root);
  const files = await walkFiles(".", { maxDepth: 5, limit: 500 });

  let pkg: any = null;
  if (files.includes("package.json")) {
    try {
      pkg = JSON.parse(await readTextFile("package.json"));
    } catch {
      pkg = null;
    }
  }

  const stack = detectStack(files, pkg);
  const frameworks = stack.filter((s) =>
    ["React", "Vue", "Next.js", "Express", "Vite", "Django", "Flask"].includes(s)
  );
  const packageManagers = detectPackageManagers(root);

  const entryCandidates = [
    "index.html",
    "src/main.tsx",
    "src/main.ts",
    "src/App.tsx",
    "src/index.ts",
    "app/page.tsx",
    "server.js",
    "src/server.ts",
    "libraix/frontend/src/main.tsx",
    "libraix/backend/src/index.ts"
  ].filter((p) => files.includes(p) || existsSync(path.join(root, p)));

  const designHints: string[] = [];
  for (const candidate of [
    "styles.css",
    "src/styles/global.css",
    "src/index.css",
    "tailwind.config.js",
    "tailwind.config.ts"
  ]) {
    if (files.includes(candidate) || existsSync(path.join(root, candidate))) {
      designHints.push(candidate);
    }
  }

  const dataHints: string[] = [];
  for (const candidate of [
    "prisma/schema.prisma",
    "src/db/schema.ts",
    "libraix/backend/src/db/schema.ts",
    "supabase/migrations",
    ".env.example",
    "libraix/backend/.env.example"
  ]) {
    if (files.includes(candidate) || existsSync(path.join(root, candidate))) {
      dataHints.push(candidate);
    }
  }

  const hospitalitySignals: string[] = [];
  const lowerJoined = files.join("\n").toLowerCase();
  for (const kw of HOSPITALITY_KEYWORDS) {
    if (lowerJoined.includes(kw)) hospitalitySignals.push(kw);
  }

  // Scan a few text files for hospitality terms
  for (const file of files.slice(0, 80)) {
    if (!/\.(ts|tsx|js|jsx|md|html|css|json|sql)$/i.test(file)) continue;
    if (shouldIgnore(path.basename(file))) continue;
    const text = await safeRead(file, 3000);
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const kw of HOSPITALITY_KEYWORDS) {
      if (lower.includes(kw) && !hospitalitySignals.includes(kw)) hospitalitySignals.push(kw);
    }
  }

  const keyFiles: Array<{ path: string; note: string }> = [];
  if (pkg?.name) keyFiles.push({ path: "package.json", note: `Package: ${pkg.name}` });
  for (const p of entryCandidates.slice(0, 6)) keyFiles.push({ path: p, note: "Entry / bootstrap" });
  for (const p of designHints.slice(0, 4)) keyFiles.push({ path: p, note: "Design / styling" });
  for (const p of dataHints.slice(0, 4)) keyFiles.push({ path: p, note: "Data / schema" });

  const summaryParts = [
    `${name} looks like a ${stack.join(", ") || "mixed"} project.`,
    packageManagers.length ? `Package managers: ${packageManagers.join(", ")}.` : "",
    hospitalitySignals.length
      ? `Hospitality signals detected: ${hospitalitySignals.slice(0, 8).join(", ")}.`
      : "No strong hospitality domain signals found yet — agent will still follow existing design patterns.",
    designHints.length ? `Design anchors: ${designHints.join(", ")}.` : "",
    dataHints.length ? `Data anchors: ${dataHints.join(", ")}.` : ""
  ].filter(Boolean);

  return {
    root,
    name,
    summary: summaryParts.join(" "),
    stack,
    frameworks,
    packageManagers,
    entryPoints: entryCandidates,
    designHints,
    dataHints,
    hospitalitySignals,
    keyFiles,
    fileCount: files.length,
    analysedAt: new Date().toISOString()
  };
}

export function formatAnalysisForPrompt(analysis: ProjectAnalysis): string {
  return [
    `Project: ${analysis.name}`,
    `Root: ${analysis.root}`,
    `Files scanned: ${analysis.fileCount}`,
    `Stack: ${analysis.stack.join(", ") || "unknown"}`,
    `Frameworks: ${analysis.frameworks.join(", ") || "none detected"}`,
    `Package managers: ${analysis.packageManagers.join(", ") || "none"}`,
    `Entry points: ${analysis.entryPoints.join(", ") || "none"}`,
    `Design hints: ${analysis.designHints.join(", ") || "none"}`,
    `Data hints: ${analysis.dataHints.join(", ") || "none"}`,
    `Hospitality signals: ${analysis.hospitalitySignals.join(", ") || "none"}`,
    `Key files:`,
    ...analysis.keyFiles.map((k) => `- ${k.path} (${k.note})`),
    `Summary: ${analysis.summary}`
  ].join("\n");
}
