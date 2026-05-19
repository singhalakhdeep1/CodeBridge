// ─── Save Handler ─────────────────────────────────────────────────────────────
// Subscribes to "document.changed" events and debounces saves to Supabase.
//
// The editor component knows NOTHING about saving.
// The save handler knows NOTHING about the editor.
// They are completely decoupled through the event bus.
//
// This is exactly how VS Code auto-save works internally.

import { bus } from "@/lib/events/event-bus";
import type { DocumentChangedEvent, DocumentSavedEvent } from "@/lib/events/event-types";

const SAVE_DEBOUNCE_MS = 1500;  // wait 1.5s after last change before saving
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function registerSaveHandler() {
    return bus.on<DocumentChangedEvent>("document.changed", (event) => {
        // Only save local changes — remote changes are already persisted by the sender
        if (event.origin === "remote") return;

        // Clear any pending save for this document
        const existing = saveTimers.get(event.documentId);
        if (existing) clearTimeout(existing);

        // Schedule a new save
        const timer = setTimeout(async () => {
            saveTimers.delete(event.documentId);

            try {
                // In a real implementation, read the current Yjs doc state and save:
                // const ydoc = getYjsDoc(event.documentId);
                // const content = ydoc.getText("content").toString();
                // await fetch(`/api/documents/${event.documentId}`, {
                //     method: "PATCH",
                //     body: JSON.stringify({ content }),
                // });

                // Emit the saved event so other handlers (analytics, version) react
                await bus.emit<DocumentSavedEvent>("document.saved", {
                    documentId: event.documentId,
                    workspaceId: event.workspaceId,
                    userId: event.userId,
                    savedAt: new Date(),
                });
            } catch (err) {
                console.error("[SaveHandler] Failed to save document:", err);
            }
        }, SAVE_DEBOUNCE_MS);

        saveTimers.set(event.documentId, timer);
    });
}
