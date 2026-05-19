# ADR 0001 — Why Yjs (CRDT) over Operational Transform (OT)

**Date**: 2025-01-15  
**Status**: Accepted  
**Deciders**: Engineering team

---

## Context

CodeSync needs real-time collaborative text editing where multiple users simultaneously edit the same file. Two main algorithms exist: Operational Transform (OT) and Conflict-free Replicated Data Types (CRDTs).

## Decision Drivers

- **Correctness** — Must converge to the same state on all clients without a central server serializing operations (Google Docs' OT approach requires a server coordinator)
- **Offline-first** — Users must be able to edit offline and merge cleanly on reconnect
- **P2P-capable** — Durable Objects give us per-room compute; we don't want a monolithic OT server
- **Ecosystem** — Need Monaco Editor binding out of the box

## Options Considered

|                         | OT (e.g. ShareDB)      | Yjs (CRDT)              |
| ----------------------- | ---------------------- | ----------------------- |
| Central server required | ✅ Yes (serialize ops) | ❌ No (peers are equal) |
| Offline merge           | ❌ Complex             | ✅ Native               |
| Monaco binding          | ❌ Manual              | ✅ `y-monaco`           |
| Bundle size             | ~80 KB                 | ~30 KB                  |
| Proven at scale         | Google Docs            | Figma, Linear, Notion   |

## Decision

**Use Yjs** with `y-monaco` for Monaco binding and `@hocuspocus/provider` over WebSocket.

Yjs uses a **CRDT algorithm (YATA — Yet Another Transformation Approach)** that:

1. Assigns a unique `(clientId, clock)` lamport timestamp to every character insertion
2. Resolves concurrent insertions deterministically by total order on `(clock, clientId)`
3. Deleted characters become **tombstones** — kept in the document to resolve future conflicts, then GC'd after all clients acknowledge the deletion

## Consequences

- **Good**: No central operation serializer; Durable Objects just relay Yjs update messages
- **Good**: Offline edits merge automatically when the socket reconnects
- **Bad**: Document size grows with tombstones until GC runs — mitigated by snapshotting to R2 on idle
- **Bad**: CRDT Y.Doc cannot represent undo history as simply as OT — mitigated by `UndoManager` from Yjs

## Related

- `src/worker.ts` — Cloudflare Durable Object that stores Y.Doc snapshots in DO storage
- `components/editor/monaco-editor.tsx` — `MonacoBinding` from `y-monaco`
- `lib/webcontainers/index.ts` — WebContainers for running code locally without a server
