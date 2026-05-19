# ADR 0002 — Why Judge0 CE for Code Execution

**Date**: 2025-01-15  
**Status**: Accepted  
**Deciders**: Engineering team

---

## Context

CodeSync needs sandboxed code execution — users write code and want to run it. We need to choose between running code in the browser vs. a remote execution API vs. self-hosted sandbox.

## Options Considered

### Option A — WebAssembly (browser-local)

Run Python/JS in the browser via Pyodide/QuickJS.

| Pros            | Cons                                          |
| --------------- | --------------------------------------------- |
| No server cost  | Limited language support (no C++, Java, Rust) |
| Zero latency    | WASM module sizes 15–80 MB                    |
| Offline capable | Can access DOM, no real isolation             |

### Option B — Judge0 CE (self-hosted / SaaS)

Open-source execution API using Linux namespaces + cgroups for sandboxing.

| Pros                                          | Cons                             |
| --------------------------------------------- | -------------------------------- |
| 60+ languages                                 | Requires Docker/VM to self-host  |
| Strong isolation (ptrace, seccomp)            | Cold start ~500ms per submission |
| Time + memory limits per run                  | Rate limits on free tier         |
| Widely used (Codeforces, LeetCode-style apps) |                                  |

### Option C — AWS Lambda custom runtime

Execute code in ephemeral Lambda functions.

| Pros           | Cons                                  |
| -------------- | ------------------------------------- |
| Any language   | Complex infra, cold starts 200–2000ms |
| True isolation | High cost at volume                   |

## Decision

**Use Judge0 CE** (Community Edition) for remote sandboxed execution.

Rationale:

1. **Language breadth** — 60+ languages vs. WebAssembly's 5–10 supported
2. **Security** — Linux namespaces + cgroups + `ptrace` prevents file system access, network access, and fork bombs
3. **Simplicity** — Single REST API (`POST /submissions?wait=true`), returns stdout/stderr/exit code/time/memory
4. **Self-hostable** — Can run on a $6/month VPS via Docker Compose (included in `docker-compose.judge0.yml`)
5. **WebContainers as complement** — For JavaScript/TypeScript, WebContainers runs code locally (zero server cost); Judge0 handles all other languages

## Consequences

- **Good**: Broad language support without managing runtimes ourselves
- **Good**: Execution is isolated — a malicious `rm -rf /` won't affect the host
- **Bad**: Network round-trip adds ~200–500ms per run — acceptable for interactive coding but not tight loops
- **Bad**: Judge0 CE requires self-hosting or using their SaaS (RapidAPI), which has request limits

## Mitigation

- Use WebContainers for JS/TS/Node execution (no Judge0 call needed)
- Cache Judge0 responses for identical code+language pairs in Upstash Redis (TTL 1h)
- Display a spinner with estimated run time to set correct expectations

## Related

- `app/api/execute/route.ts` — Server-side proxy to Judge0 API (hides API key)
- `lib/webcontainers/index.ts` — Client-side Node.js execution via WebContainers
