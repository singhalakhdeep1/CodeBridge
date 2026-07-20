# CodeSync

A real-time collaborative code editor built with Monaco Editor, Yjs CRDT, and Next.js 15. Features conflict-free collaborative editing for multiple simultaneous users with OpenAI streaming completions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 15 (App Router)               │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Auth   │  │  Editor App  │  │    API Routes       │  │
│  │ Supabase│  │Monaco+Yjs    │  │ AI/Execute/Collab   │  │
│  └─────────┘  └──────────────┘  └────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐
    │Supabase │  │Hocuspocus│  │  Redis   │
    │Postgres │  │WebSocket │  │ (Cache)  │
    │  + RLS  │  │  Server  │  │          │
    └─────────┘  └──────────┘  └──────────┘
```

### Key Technical Decisions

| Problem                   | Solution                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| Concurrent edits conflict | Yjs CRDT — mathematically conflict-free, works offline                   |
| Monaco SSR crash          | webpack alias maps `monaco-editor` → ESM API only in browser             |
| Cursor sync               | `y-awareness` + CSS `data-username` tooltip via `.yRemoteCursor::before` |
| Autosave                  | 1500ms debounce on `yText.observe` — saves to Supabase                   |
| Code execution            | Judge0 CE API — sandboxed, 10+ languages, timeout enforced               |
| AI completions            | OpenAI gpt-4o-mini streaming SSE from `/api/ai/chat`                     |
| Rate limiting             | Upstash Redis slidingWindow(100, "1m") on all API routes                 |

---

## Tech Stack

- **Framework:** Next.js 15.3.1 (App Router, Turbopack, TypeScript strict)
- **Editor:** Monaco Editor (`@monaco-editor/react`) — VS Code in the browser
- **CRDT:** Yjs + `y-monaco` binding + `@hocuspocus/provider` (WebSocket)
- **Database:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Cache:** Upstash Redis
- **AI:** OpenAI gpt-4o-mini (completions + streaming chat)
- **Execution:** Judge0 CE API
- **State:** TanStack Query v5 + Zustand v5
- **Observability:** Sentry + PostHog
- **Testing:** Vitest + Playwright
- **CI/CD:** GitHub Actions → Vercel

---

## Quick Start

```bash
cd codesync
cp .env.example .env.local
# Fill in all required environment variables

npm install
npm run dev
```

### Environment Variables

| Variable                        | Description                     |
| ------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server-only)  |
| `NEXT_PUBLIC_WS_URL`            | Hocuspocus WebSocket server URL |
| `OPENAI_API_KEY`                | OpenAI API key                  |
| `UPSTASH_REDIS_REST_URL`        | Upstash Redis URL               |
| `UPSTASH_REDIS_REST_TOKEN`      | Upstash Redis token             |
| `JUDGE0_URL`                    | Judge0 API base URL             |
| `JUDGE0_API_KEY`                | Judge0 RapidAPI key             |
| `NEXT_PUBLIC_SENTRY_DSN`        | Sentry DSN                      |

### Database Setup

```bash
# Apply schema
supabase db push --db-url <your-db-url> < supabase/schema.sql

# Seed demo data
supabase db push --db-url <your-db-url> < supabase/seed.sql
```

---

## Features

- **Real-time collaboration** — Multiple cursors, live presence, conflict-free edits via CRDT
- **Monaco Editor** — VS Code editing experience: syntax highlighting, IntelliSense stubs, 10+ languages
- **AI Assistant** — Streaming chat sidebar + inline code completions via OpenAI
- **Code Execution** — Run code in 10+ languages (JavaScript, Python, Rust, Go, Java, C++) with Judge0
- **Version History** — Automatic snapshots every 30s + manual saves; restore any version
- **Inline Comments** — Thread comments on specific lines, resolve when done
- **File Tree** — Multi-file workspaces with folder structure
- **Workspaces** — Team workspaces with role-based access (owner/admin/editor/viewer)

---

## Testing

```bash
npm run test           # Unit tests (Vitest)
npm run test:coverage  # With coverage report
npm run test:e2e       # Playwright E2E
```

---

## Deployment

1. Push to `main` → GitHub Actions CI runs (lint → test → build → E2E)
2. On success → Vercel deploy via `amondnet/vercel-action`
3. Set all env vars in Vercel dashboard
4. Deploy a Hocuspocus WebSocket server separately (e.g. Railway, Fly.io)

---

## 📝 License

Proprietary - All rights reserved.
