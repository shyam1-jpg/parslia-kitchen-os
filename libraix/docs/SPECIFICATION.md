# Libraix Platform Specification

Full product specification for the Libraix rebuild. See `README.md` for setup instructions.

## Phase 1 — Foundations (implemented)

- Separate routes: `/`, `/login`, `/pricing`, `/app`, `/account`, `/settings`, `/privacy`, `/terms`
- Single session-based authentication (email/password; OAuth structure ready)
- Secure OpenAI backend proxy (`POST /api/ai/respond`, `POST /api/ai/stream`)
- Central model catalog (`backend/src/config/models.ts`)
- Clean ChatGPT-style workspace UI
- Usage tracking from database
- Feature flags (`backend/src/config/featureFlags.ts`)
- Multi-provider gateway interface (`backend/src/providers/`)
- Smart Model Router (`POST /api/router/preview`)
- Personal Memory with user controls (`/api/memory`)
- Projects scaffold (`/api/projects`)
- Model Comparison Lab (`POST /api/ai/compare`) — Pro/beta
- SSE streaming responses
- No browser OpenAI API keys
- No unverified SOC 2 / GDPR badges on public pages

## Phase 2 — Advanced workspace (next)

- Deep Research mode
- Document canvas / editable outputs
- Code sandbox (isolated execution)
- Image studio
- Voice conversation (realtime)
- Custom agent builder
- Google Drive + GitHub connectors
- File upload with OCR and citations
- Stripe subscription webhooks

## Phase 3 — Agentic platform

- Multi-agent orchestration
- Automations and scheduled tasks
- Team workspaces
- Collaboration (shared chats, comments)
- Admin command centre
- Developer API + SDKs

## Phase 4 — Controlled experimental

- ChatGPT Apps SDK integration
- Computer-use agents
- Phone agents
- Agent marketplace

## Super-advanced features status (items 11–43)

| Feature | Status |
|---------|--------|
| Intelligent model router | Beta — implemented |
| Model comparison laboratory | Beta — implemented |
| Deep Research mode | Internal — not started |
| Personal memory | Beta — implemented |
| Projects & knowledge workspaces | Beta — scaffold only |
| Document canvas | Disabled |
| Code sandbox | Disabled |
| Custom agent builder | Internal |
| Multi-agent orchestration | Disabled |
| Connected apps / MCP | Internal |
| ChatGPT integration | Disabled |
| Realtime voice | Disabled |
| Feature flags | Implemented |

See the full product brief in the project issue/PR description for items 16–43.
