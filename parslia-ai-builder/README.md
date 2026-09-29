# Parslia AI Builder

VS Code extension MVP: a hospitality-focused AI coding agent. Start here instead of forking a full editor.

**Product focus:** kitchen / catering / hotel apps — menus, allergens, stock, suppliers, fridge logs, invoices.

## MVP capabilities

1. **Open and analyse a project** — stack, design anchors, data layer, hospitality signals  
2. **Chat with the project code** — codebase-aware Q&A via controlled tools  
3. **Select code and request an edit** — editor context menu + command  
4. **Generate multi-file changes** — agent proposes creates/edits/deletes  
5. **Review and approve a visual diff** — webview before/after review  
6. **Run tests and attempt to correct failures** — gated terminal + fix loop  

## Controlled tools

`list_files` · `search_code` · `read_file` · `create_file` · `edit_file` · `delete_file` · `run_terminal` · `run_tests` · `view_errors` · `git_diff` · `restore_changes` · `propose_changes`

Destructive terminal commands, deletions, and applying proposals require user approval. The model never gets unrestricted computer access.

## Agent flow

```
User instruction
  → AI planning
  → Search / read project files
  → Generate file changes
  → Visual diff review
  → User approves
  → Write files (+ optional tests)
  → Report results
```

## Setup

```bash
cd parslia-ai-builder
npm install
npm run build
```

In VS Code / Cursor:

1. **Run → Start Debugging** with the provided launch config, or  
   `Extensions: Install from VSIX…` after `npm run package`
2. Open a hospitality (or any) workspace folder
3. Set **Parslia AI Builder → OpenAI Api Key** (or export `OPENAI_API_KEY`)
4. Open the **Parslia AI Builder** activity-bar view

## Commands

| Command | Purpose |
|---------|---------|
| `Parslia: Open AI Builder Chat` | Focus the chat panel |
| `Parslia: Analyse Project` | Scan stack / design / data |
| `Parslia: Build This Feature` | Multi-file agent build |
| `Parslia: Edit Selection` | Edit selected code |
| `Parslia: Run Tests and Fix Failures` | Test + repair loop |
| `Parslia: Undo Last Applied Changes` | Restore last snapshot |

## Settings

| Setting | Default | Notes |
|---------|---------|-------|
| `parslia.openaiApiKey` | `""` | Prefer env `OPENAI_API_KEY` |
| `parslia.model` | `gpt-4.1` | OpenAI chat model |
| `parslia.baseUrl` | `https://api.openai.com/v1` | OpenAI-compatible APIs |
| `parslia.maxToolRounds` | `12` | Cap per request |
| `parslia.testCommand` | `""` | Override auto-detect |
| `parslia.requireApprovalForTerminal` | `true` | Gate shell / tests |

## Example prompts

- Create a stock-management page with products, quantities, low-stock alerts and supplier information. Use the existing design and database structure.
- Add allergen automation to the menu planner.
- Create fridge temperature records.
- Check the app for broken pages and fix routing.

## Layout

```
parslia-ai-builder/
├── src/                 # Extension host (TypeScript)
│   ├── agent/           # Planning loop + OpenAI client
│   ├── tools/           # Controlled tool runners
│   ├── project/         # Analyse + snapshots
│   └── webview/         # Sidebar host
└── webview-ui/          # React chat + diff UI
```

## Stage roadmap

| Stage | Scope |
|-------|--------|
| **1 (this repo)** | VS Code extension agent MVP |
| **2** | Auth, Stripe usage metering, GitHub connect, semantic search |
| **3** | Optional branded desktop via Code – OSS fork (MIT) — not a Cursor clone |

Do not copy Cursor’s name, branding, icons, or proprietary code.

## Tech

TypeScript · VS Code Extension API · React webview · OpenAI Chat Completions (tool calling) · ripgrep when available · local snapshots for undo
