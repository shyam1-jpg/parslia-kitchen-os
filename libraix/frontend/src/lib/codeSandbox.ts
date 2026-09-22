/** Browser-only JS runner used by Libraix Code (chat canvas + /app/code). */

export interface SandboxResult {
  ok: boolean;
  output: string;
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function runJavaScript(code: string): SandboxResult {
  const logs: string[] = [];
  const fakeConsole = {
    log: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
    warn: (...args: unknown[]) => logs.push("Warn: " + args.map(stringify).join(" ")),
    error: (...args: unknown[]) => logs.push("Error: " + args.map(stringify).join(" ")),
  };
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("console", `"use strict";\n${code}`);
    const result = fn(fakeConsole);
    if (result !== undefined) logs.push("→ " + stringify(result));
    return { ok: true, output: logs.join("\n") || "(no output)" };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

export function htmlPreviewDocument(source: string, language: string): string {
  if (language === "svg" && !/<svg/i.test(source)) {
    return `<!DOCTYPE html><html><body style="margin:0;background:#111">${source}</body></html>`;
  }
  if (language === "svg") {
    return `<!DOCTYPE html><html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#111">${source}</body></html>`;
  }
  if (/<html[\s>]/i.test(source)) return source;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;margin:16px;background:#111;color:#eee}</style></head><body>${source}</body></html>`;
}
