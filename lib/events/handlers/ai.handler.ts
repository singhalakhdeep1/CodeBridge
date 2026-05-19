// ─── AI Completion Handler ────────────────────────────────────────────────────
// Subscribes to "document.changed" and triggers AI completions.
//
// Uses two levels of throttling:
//   1. Debounce: wait for user to stop typing (no point suggesting mid-word)
//   2. Min size: ignore tiny changes (single backspace, space)
//
// Emits "ai.completion.ready" when a suggestion is available.
// Emits "ai.completion.requested" so analytics can track request latency.

import { bus } from "@/lib/events/event-bus";
import type { DocumentChangedEvent, AICompletionRequestedEvent, AICompletionReadyEvent } from "@/lib/events/event-types";

const AI_DEBOUNCE_MS = 800;   // wait 800ms after last change
const MIN_UPDATE_SIZE = 5;     // ignore tiny changes
const aiTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingRequests = new Map<string, string>();  // documentId → requestId

let requestCounter = 0;

export function registerAIHandler() {
    return bus.on<DocumentChangedEvent>("document.changed", (event) => {
        // Ignore remote changes and tiny updates
        if (event.origin === "remote") return;
        if (event.updateSize < MIN_UPDATE_SIZE) return;

        // Cancel existing scheduled AI call for this document
        const existing = aiTimers.get(event.documentId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
            aiTimers.delete(event.documentId);

            const requestId = `ai-req-${++requestCounter}`;
            pendingRequests.set(event.documentId, requestId);

            try {
                // Notify analytics that an AI request was triggered
                await bus.emit<AICompletionRequestedEvent>("ai.completion.requested", {
                    documentId: event.documentId,
                    language: "typescript",  // In reality: detected from file extension
                    prefix: "",            // In reality: text before cursor from Yjs doc
                    suffix: "",            // In reality: text after cursor
                    userId: event.userId,
                });

                // Call the AI completions endpoint
                const response = await fetch("/api/ai/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        documentId: event.documentId,
                        requestId,
                    }),
                });

                if (!response.ok) return;

                const { suggestion } = await response.json() as { suggestion: string };

                // Only emit if this request is still the latest for this document
                if (pendingRequests.get(event.documentId) !== requestId) return;

                await bus.emit<AICompletionReadyEvent>("ai.completion.ready", {
                    documentId: event.documentId,
                    suggestion,
                    requestId,
                });
            } catch (err) {
                console.error("[AIHandler] Completion request failed:", err);
            }
        }, AI_DEBOUNCE_MS);

        aiTimers.set(event.documentId, timer);
    });
}
