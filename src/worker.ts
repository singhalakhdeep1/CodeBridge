/**
 * CodeSync — Cloudflare Durable Object: CollabRoom
 *
 * Each collaborative document room maps to ONE Durable Object instance.
 * The DO:
 *   1. Accepts WebSocket upgrades from clients
 *   2. Broadcasts Yjs update ops to all peers in the room
 *   3. Persists the latest Yjs document state to Durable Object storage
 *      so new joiners can catch up without fetching all ops
 *
 * Skill coverage: Edge computing, Durable Objects, WebSocket hibernation API
 *
 * Deploy: `wrangler deploy`
 * Bindings: See wrangler.toml → COLLAB_ROOM
 */

export interface Env {
    COLLAB_ROOM: DurableObjectNamespace;
    SESSION_KV: KVNamespace;
    DOC_SNAPSHOTS: R2Bucket;
    SUPABASE_URL: string;
}

// ─── Durable Object class ─────────────────────────────────────────────────────

export class CollabRoom {
    private state: DurableObjectState;
    private sessions: Map<WebSocket, { userId: string; connectedAt: number }> = new Map();

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        // WebSocket hibernation: restore session map after hibernation
        for (const ws of state.getWebSockets()) {
            const meta = ws.deserializeAttachment() as { userId: string; connectedAt: number };
            this.sessions.set(ws, meta);
        }
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Only accept WebSocket upgrade requests
        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("Expected WebSocket", { status: 426 });
        }

        const userId = url.searchParams.get("userId") ?? "anonymous";
        const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];

        // Use hibernation API — DO sleeps between messages, saving CPU costs
        this.state.acceptWebSocket(server);

        const meta = { userId, connectedAt: Date.now() };
        server.serializeAttachment(meta);
        this.sessions.set(server, meta);

        // Send the current document snapshot to the new joiner
        const snapshot = await this.state.storage.get<Uint8Array>("yjsState");
        if (snapshot) {
            server.send(JSON.stringify({ type: "sync", data: Array.from(snapshot) }));
        }

        // Broadcast presence: new user joined
        this.broadcast(server, JSON.stringify({ type: "join", userId }));

        return new Response(null, { status: 101, webSocket: client });
    }

    /** Called by the Hibernation API when a WebSocket message arrives */
    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        const data = typeof message === "string" ? JSON.parse(message) : message;

        if (data?.type === "update" && data.data) {
            // Merge Yjs update into stored state
            const incoming = new Uint8Array(data.data);
            const current = await this.state.storage.get<Uint8Array>("yjsState");

            // Persist merged state (simplified — in production use Y.mergeUpdates)
            const merged = current ? mergeUint8Arrays(current, incoming) : incoming;
            await this.state.storage.put("yjsState", merged);

            // Broadcast to all other peers
            this.broadcast(ws, JSON.stringify({ type: "update", data: Array.from(incoming) }));
        }
    }

    /** Called by the Hibernation API on WebSocket close */
    async webSocketClose(ws: WebSocket): Promise<void> {
        const meta = this.sessions.get(ws);
        this.sessions.delete(ws);
        if (meta) {
            this.broadcast(ws, JSON.stringify({ type: "leave", userId: meta.userId }));
        }
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        this.sessions.delete(ws);
    }

    /** Broadcast a message to all sessions except the sender */
    private broadcast(sender: WebSocket, message: string): void {
        for (const ws of this.state.getWebSockets()) {
            if (ws !== sender && ws.readyState === 1 /* OPEN */) {
                ws.send(message);
            }
        }
    }
}

function mergeUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const merged = new Uint8Array(a.length + b.length);
    merged.set(a, 0);
    merged.set(b, a.length);
    return merged;
}

// ─── Worker entry point ───────────────────────────────────────────────────────

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname.startsWith("/collab/")) {
            const roomId = url.pathname.split("/collab/")[1];
            if (!roomId) return new Response("Room ID required", { status: 400 });

            // Each room maps to a unique DO instance via roomId
            const doId = env.COLLAB_ROOM.idFromName(roomId);
            const room = env.COLLAB_ROOM.get(doId);
            return room.fetch(request);
        }

        return new Response("CodeSync Collab Worker", { status: 200 });
    },
};
