// ─── Event Type Definitions ───────────────────────────────────────────────────
// All events in CodeSync's event-driven system are defined here.
// Every event is an immutable fact: something that already happened.
// Naming convention: <domain>.<noun>.<past-tense-verb>
//
// These types enforce that:
//   1. Event emitters always pass the correct payload
//   2. Handler functions always receive the correct payload
//   3. TypeScript catches mismatches at compile time

// ── Document Events ───────────────────────────────────────────────────────────

/** Emitted whenever the Yjs document changes (keystroke, paste, delete) */
export interface DocumentChangedEvent {
    documentId: string;
    workspaceId: string;
    userId: string;
    origin: "local" | "remote";  // remote = came from another user
    /** Rough byte-size of the Yjs update — used to throttle AI calls */
    updateSize: number;
}

/** Emitted when a document is saved to Supabase (debounced from document.changed) */
export interface DocumentSavedEvent {
    documentId: string;
    workspaceId: string;
    userId: string;
    savedAt: Date;
}

/** Emitted when a new version snapshot is created */
export interface DocumentVersionCreatedEvent {
    documentId: string;
    versionId: string;
    label: string | null;
    createdBy: string;
}

// ── Cursor / Presence Events ──────────────────────────────────────────────────

/** Emitted on every cursor move in the editor */
export interface CursorMovedEvent {
    userId: string;
    documentId: string;
    line: number;
    column: number;
}

/** Emitted when a user joins or leaves a document session */
export interface UserPresenceChangedEvent {
    userId: string;
    documentId: string;
    username: string;
    avatarUrl: string | null;
    status: "joined" | "left";
}

// ── AI Events ─────────────────────────────────────────────────────────────────

/** Emitted when the AI suggestion pipeline should be triggered */
export interface AICompletionRequestedEvent {
    documentId: string;
    language: string;
    /** Content just before the cursor */
    prefix: string;
    /** Content just after the cursor */
    suffix: string;
    userId: string;
}

/** Emitted when an AI suggestion is ready to display */
export interface AICompletionReadyEvent {
    documentId: string;
    suggestion: string;
    requestId: string;
}

/** Emitted when user accepts an AI suggestion */
export interface AICompletionAcceptedEvent {
    documentId: string;
    requestId: string;
    userId: string;
}

/** Emitted when user dismisses an AI suggestion */
export interface AICompletionDismissedEvent {
    documentId: string;
    requestId: string;
    userId: string;
}

// ── Execution Events (WebContainers) ─────────────────────────────────────────

/** Emitted when user triggers code execution */
export interface CodeExecutionStartedEvent {
    documentId: string;
    workspaceId: string;
    language: string;
    userId: string;
    executionId: string;
}

/** Emitted for each chunk of terminal output */
export interface TerminalOutputEvent {
    executionId: string;
    chunk: string;
    stream: "stdout" | "stderr";
}

/** Emitted when code execution finishes */
export interface CodeExecutionFinishedEvent {
    executionId: string;
    documentId: string;
    exitCode: number;
    durationMs: number;
}

// ── File Tree Events ──────────────────────────────────────────────────────────

export interface FileOpenedEvent {
    documentId: string;
    path: string;
    language: string;
    workspaceId: string;
    userId: string;
}

export interface FileClosedEvent {
    documentId: string;
    workspaceId: string;
    userId: string;
}

// ── Analytics Events ──────────────────────────────────────────────────────────

/** Generic analytics event — emitted by the analytics handler after observing domain events */
export interface AnalyticsEvent {
    name: string;
    properties: Record<string, unknown>;
    userId: string;
}

// ── Event Registry ────────────────────────────────────────────────────────────
// Map of event type string → payload type.
// Use this to get type-safe access to all events.

export interface EventRegistry {
    "document.changed": DocumentChangedEvent;
    "document.saved": DocumentSavedEvent;
    "document.version.created": DocumentVersionCreatedEvent;
    "cursor.moved": CursorMovedEvent;
    "user.presence.changed": UserPresenceChangedEvent;
    "ai.completion.requested": AICompletionRequestedEvent;
    "ai.completion.ready": AICompletionReadyEvent;
    "ai.completion.accepted": AICompletionAcceptedEvent;
    "ai.completion.dismissed": AICompletionDismissedEvent;
    "execution.started": CodeExecutionStartedEvent;
    "terminal.output": TerminalOutputEvent;
    "execution.finished": CodeExecutionFinishedEvent;
    "file.opened": FileOpenedEvent;
    "file.closed": FileClosedEvent;
    "analytics.track": AnalyticsEvent;
}

export type EventType = keyof EventRegistry;
