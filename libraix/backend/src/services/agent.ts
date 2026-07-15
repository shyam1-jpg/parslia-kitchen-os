/**
 * Agent mode: plan → tools → answer.
 * Tool pass only — orchestrator merges context and runs the model (avoids circular imports).
 */

import type { SafeUser } from "./users.js";
import type { AiRequest } from "./ai.js";
import {
  formatToolResultsForPrompt,
  invokeMcpTool,
  selectToolsForMessage,
  type McpToolResult,
} from "./mcpTools.js";
import { wantsLiveSources } from "./liveSources.js";

export const AGENT_SYSTEM = `You are Libraix in Agent mode. You may receive a short plan and tool results.
- Follow the plan, then produce a clear final answer for the user.
- Use tool results and live sources when present; never invent private connector data.
- Prefer structured Markdown: short plan (optional), then the answer, then next steps when useful.
- Be decisive. Do not ask the user to run tools themselves.`;

export interface AgentPlan {
  steps: string[];
  tools: string[];
}

export function buildAgentPlan(message: string, tools: string[], wantsWeb: boolean): AgentPlan {
  const steps: string[] = ["Understand the request"];
  if (tools.includes("memory.recall")) steps.push("Recall relevant memory");
  if (tools.includes("project.search")) steps.push("Search project documents");
  if (tools.some((t) => /^(drive|gmail|calendar|github)\./.test(t))) {
    steps.push("Consult connected apps");
  }
  if (wantsWeb) steps.push("Gather live web/Wikipedia sources");
  steps.push("Synthesize a final answer");
  return { steps, tools };
}

export async function runAgentToolPass(
  user: SafeUser,
  req: AiRequest
): Promise<{ plan: AgentPlan; toolResults: McpToolResult[]; toolContext: string }> {
  const tools = selectToolsForMessage(user.id, req.message, req.projectId);
  const wantsWeb = wantsLiveSources(req.message, "agent");
  const plan = buildAgentPlan(req.message, tools, wantsWeb);

  const toolResults: McpToolResult[] = [];
  for (const tool of tools) {
    const result = await invokeMcpTool(user.id, tool, {
      query: req.message,
      projectId: req.projectId,
      brief: req.message,
    });
    toolResults.push(result);
  }

  return {
    plan,
    toolResults,
    toolContext: formatToolResultsForPrompt(toolResults),
  };
}

export function formatAgentStatus(plan: AgentPlan): string {
  return `*Agent plan:* ${plan.steps.join(" → ")}\n\n`;
}

export function formatAgentPlanBlock(plan: AgentPlan): string {
  return "Agent plan:\n" + plan.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
}
