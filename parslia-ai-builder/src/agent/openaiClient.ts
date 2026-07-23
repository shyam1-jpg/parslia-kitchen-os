import * as vscode from "vscode";
import * as https from "https";
import * as http from "http";
import { URL } from "url";
import type { TokenUsage, ToolCall } from "./types";
import { TOOL_DEFINITIONS } from "./prompts";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface ModelResponse {
  content: string;
  toolCalls: ToolCall[];
  usage: TokenUsage;
  raw: unknown;
}

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("parslia");
  const apiKey =
    (cfg.get<string>("openaiApiKey") || "").trim() ||
    (process.env.OPENAI_API_KEY || "").trim();
  const model = cfg.get<string>("model") || "gpt-4.1";
  const baseUrl = (cfg.get<string>("baseUrl") || "https://api.openai.com/v1").replace(/\/$/, "");
  return { apiKey, model, baseUrl };
}

function requestJson(urlStr: string, apiKey: string, body: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = Buffer.from(JSON.stringify(body), "utf8");
    const lib = url.protocol === "http:" ? http : https;
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "http:" ? 80 : 443),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": payload.length
        }
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json: any;
          try {
            json = JSON.parse(text);
          } catch {
            reject(new Error(`Invalid JSON from model API (${res.statusCode}): ${text.slice(0, 400)}`));
            return;
          }
          if ((res.statusCode || 500) >= 400) {
            const msg = json?.error?.message || text.slice(0, 400);
            reject(new Error(`Model API error ${res.statusCode}: ${msg}`));
            return;
          }
          resolve(json);
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export async function chatWithTools(messages: ChatCompletionMessage[]): Promise<ModelResponse> {
  const { apiKey, model, baseUrl } = getConfig();
  if (!apiKey) {
    throw new Error(
      "No OpenAI API key configured. Set parslia.openaiApiKey in VS Code settings or OPENAI_API_KEY in the environment."
    );
  }

  const json = await requestJson(`${baseUrl}/chat/completions`, apiKey, {
    model,
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: "auto",
    temperature: 0.2
  });

  const choice = json.choices?.[0]?.message || {};
  const toolCalls: ToolCall[] = Array.isArray(choice.tool_calls)
    ? choice.tool_calls.map((tc: any) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments || "{}");
        } catch {
          args = {};
        }
        return {
          id: tc.id,
          name: tc.function?.name,
          arguments: args
        } as ToolCall;
      })
    : [];

  const usage: TokenUsage = {
    promptTokens: json.usage?.prompt_tokens || 0,
    completionTokens: json.usage?.completion_tokens || 0,
    totalTokens: json.usage?.total_tokens || 0
  };

  return {
    content: choice.content || "",
    toolCalls,
    usage,
    raw: choice
  };
}

export function ensureApiKeyConfigured(): string | undefined {
  try {
    const { apiKey } = getConfig();
    return apiKey ? undefined : "Missing OpenAI API key. Open Settings → Parslia AI Builder → OpenAI Api Key.";
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
