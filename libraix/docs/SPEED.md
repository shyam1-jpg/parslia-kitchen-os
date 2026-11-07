# Libraix stream speed

Perceived latency work in this slice — no visual redesign, same chat chrome.

## Before (PR #115 baseline)

| Step | What happened |
|------|----------------|
| First SSE byte | After memory + tools + provider connect |
| Model label | After the full reply finished (`yield { model }` at end of stream) |
| Gateway | `healthCheck()` awaited on every complete/stream call |
| First token paint | Batched behind `requestAnimationFrame` |
| Failure | One shot, then a slow non-stream `respond` fallback |
| Loading copy | Generic “Thinking…” |

Typical wait the user felt: **context gather + provider TTFB** with a blank/generic bubble.

## After

| Change | Effect |
|--------|--------|
| Immediate `status: routing` SSE + `X-Accel-Buffering: no` | First byte as soon as the route is known |
| `yield { model }` **before** `prepareContextForRequest` | Label + “gathering context…” while tools run |
| Skip gateway `healthCheck` on the hot path | Removes a redundant await (keys still fail fast in the adapter) |
| Flush first token immediately (skip rAF) | Snappier first paint |
| One automatic stream retry on timeout/502/network **if no tokens yet** | Wakes cold hosts without a second click |
| Loading copy | “Libraix is choosing a model…” → “Libraix Fast is gathering context…” → writing |

## How to measure

1. Chrome DevTools → Network → the `ai/stream` request.
2. Compare **Waiting (TTFB)** on a simple “say hi” with Auto routing.
3. Optional server log:

```bash
LIBRAIX_STREAM_TIMING=1 npm run dev
```

Logs `{ preludeMs, firstTokenMs, totalMs }`. Prelude should be tens of milliseconds (route + headers), not the whole tool/memory wait.

## What still needs a live API key

First-token times against OpenAI/Anthropic cannot be reproduced in CI without `OPENAI_API_KEY` (and `ANTHROPIC_API_KEY` for Claude). Local unit tests cover SSE encoding, artifact parse, and the JS sandbox only.
