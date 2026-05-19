// ─── Analytics Handler ─────────────────────────────────────────────────────────
// Subscribes to ALL domain events and translates them into analytics events.
//
// Nothing else in the codebase knows about PostHog or analytics.
// This handler is the ONLY place that imports analytics libraries.
// If you want to add Mixpanel or Amplitude, you add it here — zero other changes.

import { bus } from "@/lib/events/event-bus";
import type {
    DocumentChangedEvent,
    DocumentSavedEvent,
    FileOpenedEvent,
    AICompletionRequestedEvent,
    AICompletionAcceptedEvent,
    AICompletionDismissedEvent,
    CodeExecutionStartedEvent,
    CodeExecutionFinishedEvent,
    UserPresenceChangedEvent,
} from "@/lib/events/event-types";

// In production: import PostHog or your analytics client
// import posthog from "posthog-js";

function track(eventName: string, userId: string, properties?: Record<string, unknown>) {
    // posthog.capture(eventName, { $user_id: userId, ...properties });
    if (process.env.NODE_ENV === "development") {
        console.debug(`[Analytics] ${eventName}`, { userId, ...properties });
    }
}

export function registerAnalyticsHandler() {
    const unsubs: Array<() => void> = [];

    // Document editing (debounce in production — we only want edit sessions, not keystrokes)
    unsubs.push(bus.on<DocumentChangedEvent>("document.changed", (e) => {
        // Track at the session level (debounced externally) — don't track every keystroke
        // This is called by the analytics event bus subscriber, which has its own debounce
    }));

    // Document saved — reliable signal for "user worked on a document"
    unsubs.push(bus.on<DocumentSavedEvent>("document.saved", (e) => {
        track("Document Saved", e.userId, {
            documentId:  e.documentId,
            workspaceId: e.workspaceId,
        });
    }));

    // File opened
    unsubs.push(bus.on<FileOpenedEvent>("file.opened", (e) => {
        track("File Opened", e.userId, {
            language:    e.language,
            workspaceId: e.workspaceId,
        });
    }));

    // AI suggestion requested
    unsubs.push(bus.on<AICompletionRequestedEvent>("ai.completion.requested", (e) => {
        track("AI Completion Requested", e.userId, {
            documentId: e.documentId,
            language:   e.language,
        });
    }));

    // AI suggestion accepted (key for measuring AI value)
    unsubs.push(bus.on<AICompletionAcceptedEvent>("ai.completion.accepted", (e) => {
        track("AI Completion Accepted", e.userId, {
            documentId: e.documentId,
            requestId:  e.requestId,
        });
    }));

    // AI suggestion dismissed
    unsubs.push(bus.on<AICompletionDismissedEvent>("ai.completion.dismissed", (e) => {
        track("AI Completion Dismissed", e.userId, {
            documentId: e.documentId,
            requestId:  e.requestId,
        });
    }));

    // Code execution started
    unsubs.push(bus.on<CodeExecutionStartedEvent>("execution.started", (e) => {
        track("Code Execution Started", e.userId, {
            language:    e.language,
            workspaceId: e.workspaceId,
        });
    }));

    // Code execution finished
    unsubs.push(bus.on<CodeExecutionFinishedEvent>("execution.finished", (e) => {
        track("Code Execution Finished", e.executionId, {
            exitCode:   e.exitCode,
            durationMs: e.durationMs,
            success:    e.exitCode === 0,
        });
    }));

    // Session tracking
    unsubs.push(bus.on<UserPresenceChangedEvent>("user.presence.changed", (e) => {
        if (e.status === "joined") {
            track("Session Started", e.userId, { documentId: e.documentId });
        } else {
            track("Session Ended", e.userId, { documentId: e.documentId });
        }
    }));

    // Return a cleanup function
    return () => unsubs.forEach(fn => fn());
}
