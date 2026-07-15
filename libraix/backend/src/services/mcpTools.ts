/**
 * MCP-style connector tool adapters.
 * Connected/pending connectors expose invokeable tools for Agent mode.
 * Live OAuth sync is optional — tools return useful local/stub context so the loop always works.
 */

import { db } from "../db/schema.js";
import { listConnectors } from "./workspaceExtras.js";
import { searchProjectChunks } from "./documentSearch.js";
import { listMemories } from "./memory.js";

export interface McpToolDef {
  name: string;
  provider: string;
  description: string;
  requiresConnection: boolean;
}

export interface McpToolResult {
  tool: string;
  provider: string;
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
}

const TOOL_CATALOG: McpToolDef[] = [
  {
    name: "drive.search",
    provider: "google-drive",
    description: "Search linked Drive docs by keyword (local index / stub until OAuth sync)",
    requiresConnection: true,
  },
  {
    name: "gmail.draft",
    provider: "gmail",
    description: "Draft a short email reply from a brief",
    requiresConnection: true,
  },
  {
    name: "calendar.upcoming",
    provider: "google-calendar",
    description: "List upcoming calendar placeholders for planning",
    requiresConnection: true,
  },
  {
    name: "github.repos",
    provider: "github",
    description: "List linked GitHub repos from connector metadata",
    requiresConnection: true,
  },
  {
    name: "project.search",
    provider: "libraix",
    description: "Semantic/keyword search over project files",
    requiresConnection: false,
  },
  {
    name: "memory.recall",
    provider: "libraix",
    description: "Recall saved user memories matching a query",
    requiresConnection: false,
  },
];

function connectorStatus(userId: string, provider: string): string {
  const row = db
    .prepare("SELECT status FROM connectors WHERE user_id = ? AND provider = ?")
    .get(userId, provider) as { status: string } | undefined;
  return row?.status ?? "disconnected";
}

function isUsable(status: string): boolean {
  return status === "connected" || status === "pending";
}

export function listMcpTools(userId: string): Array<McpToolDef & { available: boolean; status: string }> {
  const connectors = listConnectors(userId);
  const byId = new Map<string, (typeof connectors)[number]>(connectors.map((c) => [c.id, c]));
  return TOOL_CATALOG.map((t) => {
    if (!t.requiresConnection) {
      return { ...t, available: true, status: "builtin" };
    }
    const c = byId.get(t.provider);
    const status = c?.status ?? "disconnected";
    return { ...t, available: isUsable(status), status };
  });
}

export async function invokeMcpTool(
  userId: string,
  toolName: string,
  args: { query?: string; projectId?: string; brief?: string } = {}
): Promise<McpToolResult> {
  const def = TOOL_CATALOG.find((t) => t.name === toolName);
  if (!def) {
    return { tool: toolName, provider: "unknown", ok: false, summary: `Unknown tool: ${toolName}` };
  }

  if (def.requiresConnection && !isUsable(connectorStatus(userId, def.provider))) {
    return {
      tool: toolName,
      provider: def.provider,
      ok: false,
      summary: `Connect ${def.provider} first (Settings → Connectors).`,
    };
  }

  switch (toolName) {
    case "project.search": {
      if (!args.projectId || !args.query) {
        return {
          tool: toolName,
          provider: def.provider,
          ok: false,
          summary: "projectId and query required",
        };
      }
      const hits = await searchProjectChunks(args.projectId, args.query, 4);
      if (!hits.length) {
        return { tool: toolName, provider: def.provider, ok: true, summary: "No matching project excerpts." };
      }
      return {
        tool: toolName,
        provider: def.provider,
        ok: true,
        summary: `Found ${hits.length} excerpts`,
        data: {
          excerpts: hits.map((h) => ({
            filename: h.filename,
            score: Math.round(h.score * 100) / 100,
            text: h.content.slice(0, 400),
          })),
        },
      };
    }
    case "memory.recall": {
      const q = (args.query ?? "").toLowerCase();
      const memories = listMemories(userId, args.projectId).filter((m) => {
        if (!q) return true;
        return m.content.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      });
      const top = memories.slice(0, 8);
      return {
        tool: toolName,
        provider: def.provider,
        ok: true,
        summary: top.length ? `Recalled ${top.length} memories` : "No matching memories",
        data: { memories: top.map((m) => ({ category: m.category, content: m.content })) },
      };
    }
    case "drive.search": {
      const q = args.query?.trim() || "documents";
      return {
        tool: toolName,
        provider: def.provider,
        ok: true,
        summary: `Drive search staged for “${q}” (OAuth sync pending — use project files for live excerpts).`,
        data: {
          query: q,
          note: "When Google Drive OAuth scopes are approved, live file titles appear here.",
          suggestedAction: "Upload key docs to a Libraix project for indexed RAG today.",
        },
      };
    }
    case "gmail.draft": {
      const brief = args.brief?.trim() || args.query?.trim() || "Follow up politely.";
      const draft = [
        "Subject: Quick follow-up",
        "",
        "Hi,",
        "",
        brief.slice(0, 500),
        "",
        "Best regards",
      ].join("\n");
      return {
        tool: toolName,
        provider: def.provider,
        ok: true,
        summary: "Draft prepared from brief (not sent).",
        data: { draft, sent: false },
      };
    }
    case "calendar.upcoming": {
      const now = new Date();
      const slots = [1, 2, 3].map((d) => {
        const t = new Date(now.getTime() + d * 86400000);
        t.setUTCHours(14 + d, 0, 0, 0);
        return {
          title: d === 1 ? "Focus block" : d === 14 ? "Team sync" : "Planning",
          when: t.toISOString(),
        };
      });
      // fix titles
      slots[0].title = "Focus block";
      slots[1].title = "Team sync";
      slots[2].title = "Planning";
      return {
        tool: toolName,
        provider: def.provider,
        ok: true,
        summary: "Placeholder upcoming slots (live Calendar needs OAuth).",
        data: { events: slots },
      };
    }
    case "github.repos": {
      const meta = db
        .prepare("SELECT meta_json FROM connectors WHERE user_id = ? AND provider = 'github'")
        .get(userId) as { meta_json: string } | undefined;
      let repos: string[] = [];
      try {
        const parsed = meta?.meta_json ? (JSON.parse(meta.meta_json) as { repos?: string[] }) : {};
        repos = parsed.repos ?? [];
      } catch {
        repos = [];
      }
      if (!repos.length) repos = ["(link repos via connector meta when OAuth is ready)"];
      return {
        tool: toolName,
        provider: def.provider,
        ok: true,
        summary: `GitHub context: ${repos.length} repo(s)`,
        data: { repos },
      };
    }
    default:
      return { tool: toolName, provider: def.provider, ok: false, summary: "Not implemented" };
  }
}

/** Pick tools an agent should run for this user message. */
export function selectToolsForMessage(userId: string, message: string, projectId?: string): string[] {
  const lower = message.toLowerCase();
  const available = listMcpTools(userId).filter((t) => t.available);
  const names = new Set(available.map((t) => t.name));
  const picked: string[] = [];

  if (projectId && names.has("project.search")) picked.push("project.search");
  if (names.has("memory.recall") && /\b(remember|my |prefer|usually|last time)\b/i.test(lower)) {
    picked.push("memory.recall");
  }
  if (names.has("drive.search") && /\b(drive|google doc|spreadsheet|sheet)\b/i.test(lower)) {
    picked.push("drive.search");
  }
  if (names.has("gmail.draft") && /\b(email|gmail|draft.*(mail|reply)|reply to)\b/i.test(lower)) {
    picked.push("gmail.draft");
  }
  if (names.has("calendar.upcoming") && /\b(calendar|schedule|meeting|agenda|availability)\b/i.test(lower)) {
    picked.push("calendar.upcoming");
  }
  if (names.has("github.repos") && /\b(github|repo|pull request|\bpr\b|commit)\b/i.test(lower)) {
    picked.push("github.repos");
  }

  // Agent mode default: always try memory + project when available
  if (names.has("memory.recall") && !picked.includes("memory.recall")) picked.push("memory.recall");
  if (projectId && names.has("project.search") && !picked.includes("project.search")) {
    picked.push("project.search");
  }

  return picked.slice(0, 5);
}

export function formatToolResultsForPrompt(results: McpToolResult[]): string {
  if (!results.length) return "";
  const lines = results.map((r) => {
    const payload = r.data ? `\n${JSON.stringify(r.data, null, 2)}` : "";
    return `- ${r.tool} (${r.ok ? "ok" : "fail"}): ${r.summary}${payload}`;
  });
  return (
    "Agent tool results (use when relevant; do not invent connector data beyond this):\n" + lines.join("\n")
  );
}
