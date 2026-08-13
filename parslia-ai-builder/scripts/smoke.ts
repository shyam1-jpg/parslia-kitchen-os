/**
 * Lightweight smoke checks that do not require the VS Code runtime.
 * Run: npx tsx scripts/smoke.ts  (or node after build)
 */
import assert from "assert";
import { modeInstruction, TOOL_DEFINITIONS, SYSTEM_PROMPT } from "../src/agent/prompts";

assert.ok(SYSTEM_PROMPT.includes("Parslia AI Builder"));
assert.ok(!SYSTEM_PROMPT.toLowerCase().includes("you are cursor"));
assert.equal(modeInstruction("build").includes("propose_changes"), true);
assert.ok(TOOL_DEFINITIONS.some((t) => t.function.name === "propose_changes"));
assert.ok(TOOL_DEFINITIONS.some((t) => t.function.name === "run_tests"));
assert.ok(TOOL_DEFINITIONS.some((t) => t.function.name === "restore_changes"));

const names = TOOL_DEFINITIONS.map((t) => t.function.name);
for (const required of [
  "list_files",
  "search_code",
  "read_file",
  "create_file",
  "edit_file",
  "delete_file",
  "run_terminal",
  "run_tests",
  "view_errors",
  "git_diff",
  "restore_changes",
  "propose_changes"
]) {
  assert.ok(names.includes(required), `missing tool ${required}`);
}

console.log("parslia-ai-builder smoke checks passed:", names.length, "tools");
