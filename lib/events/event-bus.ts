// ─── Event Bus ────────────────────────────────────────────────────────────────
// The core of CodeSync's Event-Driven Architecture.
//
// Every user action in the editor emits a typed event here.
// Handlers subscribe to events they care about — they never call each other.
// This means:
//   - The editor component doesn't know about saving
//   - The save handler doesn't know about AI
//   - AI doesn't know about analytics
//   - All are completely decoupled
//
// This is the same pattern used in VS Code's extension system and Figma's plugin API.

type Handler<T = unknown> = (event: T) => void | Promise<void>;

interface Subscription {
    eventType: string;
    handler: Handler<unknown>;
}

class EventBus {
    private readonly listeners = new Map<string, Handler<unknown>[]>();
    private readonly history: Array<{ eventType: string; payload: unknown; at: Date }> = [];
    private readonly maxHistory = 100;

    // ── Subscribe ─────────────────────────────────────────────────────────────

    /** Subscribe to an event type. Returns an unsubscribe function. */
    on<T>(eventType: string, handler: Handler<T>): () => void {
        const existing = this.listeners.get(eventType) ?? [];
        this.listeners.set(eventType, [...existing, handler as Handler<unknown>]);

        return () => {
            const current = this.listeners.get(eventType) ?? [];
            this.listeners.set(eventType, current.filter(h => h !== handler));
        };
    }

    /** Subscribe to multiple events with one handler */
    onAny(eventTypes: string[], handler: Handler<unknown>): () => void {
        const unsubs = eventTypes.map(type => this.on(type, handler));
        return () => unsubs.forEach(fn => fn());
    }

    /** Subscribe once — automatically unsubscribes after first event */
    once<T>(eventType: string, handler: Handler<T>): void {
        const unsub = this.on<T>(eventType, (payload) => {
            handler(payload);
            unsub();
        });
    }

    // ── Emit ──────────────────────────────────────────────────────────────────

    /** Emit an event — all handlers are called concurrently */
    async emit<T>(eventType: string, payload: T): Promise<void> {
        // Record in history for debugging
        this.history.push({ eventType, payload, at: new Date() });
        if (this.history.length > this.maxHistory) this.history.shift();

        const handlers = this.listeners.get(eventType) ?? [];
        if (handlers.length === 0) return;

        // Use allSettled so one failing handler doesn't break others
        const results = await Promise.allSettled(handlers.map(h => h(payload)));

        // Log failures but do not throw
        results.forEach((result, i) => {
            if (result.status === "rejected") {
                console.error(`[EventBus] Handler ${i} for "${eventType}" failed:`, result.reason);
            }
        });
    }

    /** Emit synchronously — use for time-critical UI events (cursor moves) */
    emitSync<T>(eventType: string, payload: T): void {
        this.history.push({ eventType, payload, at: new Date() });
        if (this.history.length > this.maxHistory) this.history.shift();

        const handlers = this.listeners.get(eventType) ?? [];
        handlers.forEach(h => {
            try { h(payload); } catch (err) {
                console.error(`[EventBus] Sync handler for "${eventType}" failed:`, err);
            }
        });
    }

    // ── Debug ─────────────────────────────────────────────────────────────────

    getHistory() { return [...this.history]; }
    getListenerCount(eventType: string) { return (this.listeners.get(eventType) ?? []).length; }
    getAllEventTypes() { return Array.from(this.listeners.keys()); }
}

// Singleton — one bus for the entire browser session
export const bus = new EventBus();
