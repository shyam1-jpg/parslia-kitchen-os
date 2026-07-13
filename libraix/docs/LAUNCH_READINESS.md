# Libraix Production Readiness — Honest Assessment

Last updated: July 2026  
Live: https://libraix.ai · API: https://libraix-api.onrender.com

This document maps an external production audit (ChatGPT review, July 2026) to **what is actually built in code** vs **what you must test manually** before taking payments.

---

## Verdict (matches external audit)

| Layer | Status |
|-------|--------|
| Public website | **Working** — branding, pricing, legal pages |
| `/app` route | **Working** — requires login; JS SPA |
| Product concept | **Correctly represented** — multi-model workspace |
| Full functional verification | **Still required** — automated crawlers cannot test authenticated AI |
| Ready for paid customers | **Not yet** — until Stripe, email, backups, and manual QA pass |

**ChatGPT was right:** the site being online does not prove every model, upload, payment flow, and admin control works end-to-end. You must run the manual tests below yourself.

---

## 1. Login and account access

| Test | Code status | Manual test |
|------|-------------|-------------|
| Signup | Implemented (`POST /api/auth/signup`) | ☐ Create account |
| Email verification | Tokens + UI; **not enforced** on API | ☐ Verify email; confirm chat still works unverified |
| Login / logout | Implemented | ☐ Login, refresh page, still signed in |
| Forgot password | Implemented; needs `RESEND_API_KEY` or SMTP | ☐ Reset flow (live: `email: false` today) |
| Wrong password message | Implemented | ☐ Try bad password |
| `/app` when logged out | `ProtectedRoute` → `/login` | ☐ Open `/app` in incognito |
| Admin separate from customer | `/admin/login`, separate session | ☐ Customer login must not show admin |
| OAuth Google/Microsoft | Wired when env keys set | ☐ Live today: all `false` on `/api/auth/config` |
| User data isolation | Conversations scoped by `userId` | ☐ Two accounts — no cross-chat leak |

**Recent fixes:** suspended users blocked on all API calls; workspace routes (`/app/search`, etc.) now behind login; verification URLs not returned in production JSON.

---

## 2. AI response system

| Test | Code status | Manual test |
|------|-------------|-------------|
| Libraix Fast (OpenAI) | Live when `OPENAI_API_KEY` set | ☐ Send message, real reply |
| Smart / Advanced | OpenAI models; Pro tier | ☐ Pro account or admin override |
| DeepSeek, Gemini, Grok, Claude | Real adapters; hidden if no API key | ☐ Set keys on Render, test each |
| Model switching | Dropdown + router modes | ☐ Switch model, confirm different behaviour |
| Streaming | SSE `/api/ai/stream` | ☐ Watch tokens arrive |
| Stop generation | Client abort only | ☐ Stop mid-stream |
| Retry / regenerate | **Not in UI** | ☐ N/A — roadmap |
| Usage recording | Server `usage_daily` | ☐ Check billing/settings after sends |
| Placeholder mode | Without OpenAI key, dev echo | ☐ Confirm production has real key |

**Live check (July 2026):** `/api/auth/config` → `providers: ["openai"]` only — other providers need keys on Render.

---

## 3. Chat history

| Test | Code status | Manual test |
|------|-------------|-------------|
| New chats appear | SQLite persistence | ☐ New chat in sidebar |
| Rename | API + sidebar ✎ button | ☐ Rename conversation |
| Delete | API + sidebar × button | ☐ Delete conversation |
| Search | Client-side title filter | ☐ Search by title |
| Refresh persistence | DB-backed | ☐ Reload page |
| Markdown | `react-markdown` + GFM | ☐ Tables, code blocks |
| Copy | Per-message copy button | ☐ Copy assistant reply |
| Auto title | First ~40 chars of message | ☐ Send first message |

---

## 4. File tools

| Tool | Code status | Manual test |
|------|-------------|-------------|
| PDF | Text extracted → pasted into composer | ☐ Attach PDF, ask about content |
| Word/Excel | **Not supported** — PDF/txt/md/csv/json only | ☐ Confirm clear error |
| Large file | 5MB limit | ☐ Try 6MB file |
| Link analyser | Jina + cheerio | ☐ Paste URL, Analyse link |
| YouTube | Transcript summariser | ☐ Paste YouTube URL |

**Honest label:** PDF chat is **text injection**, not persistent document RAG.

---

## 5. Web search and citations

| Test | Code status | Manual test |
|------|-------------|-------------|
| Deep Research mode | Serper or DuckDuckGo fallback | ☐ Enable deep-research router |
| Citations in UI | Sources in prompt only — **no footnotes UI** | ☐ Check if sources visible |
| Dedicated search workspace | Placeholder `/app/search` | ☐ Shows coming soon |
| `POST /api/tools/research` | Implemented; **not in chat UI** | ☐ API test only |

---

## 6. Image generation

| Test | Code status | Manual test |
|------|-------------|-------------|
| In-chat `/i`, 🎨 mode | DALL·E 2 fast / DALL·E 3 quality | ☐ Generate image in chat |
| Image Studio `/app/images` | Full page | ☐ Sizes, download |
| Stuck processing | Shimmer + timeout handling | ☐ Slow prompt |
| Usage limits | Server `canGenerateImage` | ☐ Hit free image cap |

---

## 7. Model comparison

| Test | Code status | Manual test |
|------|-------------|-------------|
| Compare panel | Pro feature; 2–4 models parallel | ☐ Same prompt, side by side |
| Unavailable models filtered | `available === true` only | ☐ No MODEL_NOT_FOUND |
| Save comparison | **Not implemented** | ☐ N/A |

---

## 8. Projects and memory

| Feature | Code status |
|---------|-------------|
| Memory CRUD + inject into chat | **Beta** — Settings page |
| Memory edit UI | **Missing** — delete only |
| Projects API | **Scaffold** — sidebar list, no selection |
| Privacy mode toggle | **UI only** — not enforced on retention |

---

## 9. Pricing and credits

| Test | Code status | Live (July 2026) |
|------|-------------|------------------|
| Free limit | **30 messages/day** (catalog) | Enforced server-side |
| Pro £9/mo | Stripe Checkout when configured | `stripe: false` on live |
| Usage in app | Messages shown in chat + billing | ☐ Verify after chat |
| Premium quota UI | **Hidden** | Only messages/images shown |
| VAT / annual | **Not built** | Monthly only |
| Enterprise features | Marketing lists SSO/teams | **Not implemented** |

---

## 10. Owner admin dashboard

| Feature | Status |
|---------|--------|
| URL | https://libraix.ai/admin |
| Metrics | Users, usage, estimated revenue, provider health |
| User suspend / plan override | Yes |
| Stripe MRR | **Estimated** from plan counts, not Stripe API |
| System errors panel | Table exists; logger **not wired** |
| 2FA for admin | Optional TOTP |

**Setup:** Run `npm run seed:owner` once on Render (password no longer reset on every deploy).

---

## High-priority before paid launch

| # | Item | Status |
|---|------|--------|
| 1 | Secure auth + role separation | **Mostly done** — OAuth needs keys |
| 2 | Stripe + webhook verification | **Code ready** — not configured live |
| 3 | Server-side usage limits | **Done** |
| 4 | API keys server-only | **Done** |
| 5 | Legal pages | **Done** — counsel review advised |
| 6 | Account deletion | **Done** — Stripe cancel not auto |
| 7 | Failed AI monitoring | **Partial** — admin panel stub |
| 8 | Rate limiting | **Partial** — auth/AI/admin only |
| 9 | Database backups | **Critical gap** — disk on Render, no automated backup |
| 10 | Support contact | hello@libraix.ai, /support |

---

## What to configure on Render now

```bash
# Required for real chat
OPENAI_API_KEY=sk-...

# Required for password reset / verification emails
RESEND_API_KEY=re_...

# Required for Pro payments
STRIPE_SECRET_KEY=sk_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional — unlock more models
DEEPSEEK_API_KEY=...
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...
XAI_API_KEY=...

# Optional — social login
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

After env changes: **Manual Deploy** on Render + **Netlify redeploy** + hard refresh.

---

## Quick production smoke test (15 minutes)

1. Incognito → `/login?mode=signup` → create account  
2. `/app` → send chat → confirm real AI reply (not echo)  
3. Attach PDF → ask question about content  
4. `/i sunset over ocean` → image appears  
5. Settings → Memory on → add fact → ask in new chat  
6. Sign out → `/app` redirects to login  
7. `/admin/login` → owner dashboard (after seed)  
8. `curl https://libraix.ai/api/health` → `{"ok":true}`  

---

## Classification

- **Free public beta:** OK after `OPENAI_API_KEY` + owner seed + manual smoke test  
- **Paid Pro launch:** Needs Stripe, email, backups, full checklist above, legal sign-off  
- **Enterprise sales:** Do not sell until team/SSO/API features exist or copy is softened  
