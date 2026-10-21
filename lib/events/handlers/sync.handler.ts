// ─── Sync Handler ─────────────────────────────────────────────────────────────
// Bridges the editor's local Yjs document with the y-websocket server.
// When the Yjs document changes, this handler ensures the update is forwarded
// to connected peers in the same workspace.
//
// Architecture:
//   Monaco Editor
//     ↓ (Yjs binding — y-monaco)
//   Yjs Document (in-memory CRDT)
//     ↓ (observeDeep)
//   EventBus.emit("document.changed")
//     ↓
//   SyncHandler (this file)
//     ↓ (WebSocketProvider from y-websocket)
//   WebSocket Server
//     ↓ (broadcast to peers)
//   Remote Yjs Documents (in other browsers)

import { bus } from "@/lib/events/event-bus";
import type { DocumentChangedEvent } from "@/lib/events/event-types";

/** Minimal provider interface — supports both y-websocket and Hocuspocus */
interface CollabProvider {
    connect(): void;
    disconnect(): void;
    readonly wsconnected?: boolean;
    readonly isConnected?: boolean;
    on(event: "status", handler: (event: { status: string }) => void): void;
}

let statusListeners: Array<(connected: boolean) => void> = [];

export function registerSyncHandler(getProvider: () => CollabProvider | null) {
    // When we receive a local document change, ensure we're connected
    const unsub = bus.on<DocumentChangedEvent>("document.changed", (event) => {
        if (event.origin !== "local") return;

        const provider = getProvider();
        if (!provider) return;

        const connected = provider.wsconnected ?? provider.isConnected ?? false;
        if (!connected) {
            console.warn("[SyncHandler] Not connected, reconnecting...");
            provider.connect();
        }

        // Yjs y-websocket automatically handles syncing the update to the server
        // via the WebSocketProvider — no manual send needed.
        // This handler is here to:
        //   1. Monitor connection health
        //   2. Add retry logic if needed
        //   3. Queue updates for offline mode (future)
    });

    return unsub;
}

/** Subscribe to connection status changes */
export function onSyncStatusChange(listener: (connected: boolean) => void): () => void {
    statusListeners.push(listener);
    return () => {
        statusListeners = statusListeners.filter(l => l !== listener);
    };
}

export function broadcastSyncStatus(connected: boolean) {
    statusListeners.forEach(l => l(connected));
}
