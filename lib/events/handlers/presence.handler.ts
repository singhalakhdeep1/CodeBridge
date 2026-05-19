// ─── Presence Handler ─────────────────────────────────────────────────────────
// Bridges the local event bus with Yjs awareness for real-time presence.
//
// When a user moves their cursor:
//   1. Editor emits "cursor.moved" to local bus
//   2. This handler updates the Yjs awareness state
//   3. Yjs awareness broadcasts to all connected peers via WebSocket
//   4. Remote peers receive the update and emit "cursor.moved" on THEIR local buses
//   5. Remote users' cursors appear in the editor
//
// This is a clean, decoupled bridge between local events and distributed state.

import { bus } from "@/lib/events/event-bus";
import type { CursorMovedEvent, UserPresenceChangedEvent } from "@/lib/events/event-types";

// Interface matching Yjs Awareness API (imported lazily to avoid SSR issues)
interface YAwareness {
    setLocalState(state: Record<string, unknown> | null): void;
    getLocalState(): Record<string, unknown> | null;
    on(event: string, handler: (update: unknown, origin: unknown) => void): void;
    off(event: string, handler: (update: unknown, origin: unknown) => void): void;
}

// Throttle cursor updates to avoid flooding the Yjs WebSocket
const CURSOR_THROTTLE_MS = 50;
const lastEmitTime = new Map<string, number>();

export function registerPresenceHandler(awareness: YAwareness | null) {
    // ── Outgoing: local cursor → Yjs awareness ─────────────────────────────────
    const unsubCursor = bus.on<CursorMovedEvent>("cursor.moved", (event) => {
        if (!awareness) return;

        // Throttle: only update Yjs awareness every 50ms per document
        const key = event.userId + ":" + event.documentId;
        const now = Date.now();
        const lastEmit = lastEmitTime.get(key) ?? 0;

        if (now - lastEmit < CURSOR_THROTTLE_MS) return;
        lastEmitTime.set(key, now);

        // Merge cursor position into existing local state
        const current = awareness.getLocalState() ?? {};
        awareness.setLocalState({
            ...current,
            cursor: { line: event.line, column: event.column, documentId: event.documentId },
        });
    });

    // ── Outgoing: presence join/leave → Yjs awareness ─────────────────────────
    const unsubPresence = bus.on<UserPresenceChangedEvent>("user.presence.changed", (event) => {
        if (!awareness) return;

        if (event.status === "joined") {
            const current = awareness.getLocalState() ?? {};
            awareness.setLocalState({
                ...current,
                user: {
                    id: event.userId,
                    name: event.username,
                    avatarUrl: event.avatarUrl,
                    documentId: event.documentId,
                },
            });
        } else {
            // User left — clear their state
            awareness.setLocalState(null);
        }
    });

    return () => {
        unsubCursor();
        unsubPresence();
    };
}
