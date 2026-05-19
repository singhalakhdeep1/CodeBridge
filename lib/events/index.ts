// ─── Event System Bootstrap ───────────────────────────────────────────────────
// Register ALL event handlers in one place.
// Call this ONCE during app initialization (in the editor page component).
//
// Pattern: handlers register themselves and return an unsubscribe function.
// Store all unsubscribe functions and call them on cleanup (useEffect cleanup).

import { registerSaveHandler }      from "./handlers/save.handler";
import { registerAIHandler }        from "./handlers/ai.handler";
import { registerAnalyticsHandler } from "./handlers/analytics.handler";
import { registerSyncHandler }      from "./handlers/sync.handler";
import { registerPresenceHandler }  from "./handlers/presence.handler";

interface BootstrapOptions {
    // Yjs awareness — pass null if not yet initialized (SSR, loading state)
    awareness?: Parameters<typeof registerPresenceHandler>[0];
    // Factory for the y-websocket provider (lazy to avoid import issues)
    getProvider?: Parameters<typeof registerSyncHandler>[0];
}

/**
 * Initialize the event-driven system.
 * Returns a cleanup function — call it in useEffect's return value.
 *
 * @example
 * useEffect(() => {
 *   return bootstrapEventSystem({ awareness, getProvider: () => wsProvider });
 * }, [awareness]);
 */
export function bootstrapEventSystem(options: BootstrapOptions = {}): () => void {
    const unsubs: Array<() => void> = [
        registerSaveHandler(),
        registerAIHandler(),
        registerAnalyticsHandler(),
        registerSyncHandler(options.getProvider ?? (() => null)),
        registerPresenceHandler(options.awareness ?? null),
    ];

    return () => unsubs.forEach(fn => fn());
}
