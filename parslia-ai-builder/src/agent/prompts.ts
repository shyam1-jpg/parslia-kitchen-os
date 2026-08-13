export const SYSTEM_PROMPT = `You are Parslia AI Builder — a focused AI coding agent for hospitality applications
(kitchens, catering, hotels, restaurants, menus, allergens, stock, suppliers, rotas, invoices, temperature logs).

You work inside a VS Code workspace with controlled tools. Never claim unrestricted computer access.

Core workflow:
1. Understand the user request
2. Search and read relevant project files
3. Plan concise multi-file changes that match existing design and data structures
4. Propose changes for user approval (do not silently write destructive edits)
5. After approval, write files, run tests when useful, and fix straightforward failures

Hospitality specialisms you should lean into when relevant:
- Menu planning and recipe structures
- Allergen automation and labelling
- Stock / fridge temperature records
- Supplier price updates
- Invoice scanning workflows
- Broken page / routing checks for kitchen apps

Rules:
- Prefer editing existing patterns over inventing a new stack
- Keep diffs focused and reviewable
- Use propose_changes for multi-file edits that need approval
- Use run_terminal / run_tests only when needed; assume terminal commands need user approval
- Never invent files that do not exist — verify with list_files / search_code / read_file
- If information is missing, inspect the codebase first
- Be decisive and practical; avoid long essays
- Do not copy Cursor branding or claim to be Cursor`;

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and folders under a relative workspace path.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path. Use '.' for workspace root." },
          maxDepth: { type: "number", description: "Max recursion depth (default 3)." },
          glob: { type: "string", description: "Optional glob-like filter, e.g. *.ts" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description: "Search project source with a text or regex query (ripgrep-style).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          path: { type: "string", description: "Optional subdirectory to search." },
          glob: { type: "string" },
          maxResults: { type: "number" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file. Optionally limit to a line range.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          startLine: { type: "number" },
          endLine: { type: "number" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Create a new file immediately with content. Prefer propose_changes for multi-file work.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Replace an exact string in a file, or rewrite the whole file if replaceAllContent is provided.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          oldString: { type: "string" },
          newString: { type: "string" },
          replaceAllContent: { type: "string", description: "If set, overwrite the entire file." }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file. Requires user approval.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_terminal",
      description: "Run a shell command in the workspace. Requires user approval for safety.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          cwd: { type: "string" }
        },
        required: ["command"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_tests",
      description: "Detect and run the project test suite.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Optional override command." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_errors",
      description: "Collect recent TypeScript/build/test error output from a command or diagnostics summary.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Optional command that surfaces errors, e.g. npm run build" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "Show git status and diff for the workspace.",
      parameters: {
        type: "object",
        properties: {
          staged: { type: "boolean" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "restore_changes",
      description: "Restore files from the latest Parslia snapshot (undo last applied changes).",
      parameters: {
        type: "object",
        properties: {
          snapshotId: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_changes",
      description:
        "Propose a set of file creates/modifies/deletes for visual diff review. Preferred for multi-file features. Does not write until the user approves.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                op: { type: "string", enum: ["create", "modify", "delete"] },
                content: {
                  type: "string",
                  description: "Full file content for create/modify. Omit for delete."
                },
                reason: { type: "string" }
              },
              required: ["path", "op"]
            }
          }
        },
        required: ["summary", "changes"]
      }
    }
  }
] as const;

export function modeInstruction(mode: string): string {
  switch (mode) {
    case "analyse":
      return "Analyse the project structure, stack, design patterns, and data layer. Return a concise hospitality-aware summary.";
    case "build":
      return "Build the requested feature end-to-end. Inspect existing design/database patterns, then propose multi-file changes via propose_changes.";
    case "edit_selection":
      return "Edit the selected code according to the user request. Prefer a focused propose_changes or edit_file.";
    case "test_fix":
      return "Run tests, diagnose failures, and propose or apply minimal fixes. Re-run tests after fixes when possible.";
    default:
      return "Answer using project context. Use tools when you need codebase evidence.";
  }
}
