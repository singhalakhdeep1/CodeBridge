"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Editor, { OnMount, Monaco, loader } from "@monaco-editor/react";
import * as monacoApi from "monaco-editor";
import type { editor } from "monaco-editor";

// Use local monaco-editor instead of the jsDelivr CDN (CDN is blocked by CSP)
loader.config({ monaco: monacoApi });
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useCollaboration } from "@/lib/hooks/use-collaboration";
import { CURSOR_COLORS, LANGUAGE_MONACO_MAP } from "@/lib/constants";
import { CollaboratorCursors } from "./collaborator-cursors";
import type { Document, WorkspaceRole } from "@/types";
import { bus } from "@/lib/events/event-bus";
import { bootstrapEventSystem } from "@/lib/events";
import type { DocumentChangedEvent, CursorMovedEvent, FileOpenedEvent } from "@/lib/events/event-types";

interface Props {
    document: Document;
    userRole: WorkspaceRole;
    onContentChange?: (content: string) => void;
    onLiveChange?: (content: string) => void;
    onEditorReady?: (getContent: () => string) => void;
}

export function MonacoEditor({ document, userRole, onContentChange, onLiveChange, onEditorReady }: Props) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { fontSize, tabSize, wordWrap, minimap, markDirty, markClean } = useEditorStore();
    const { doc: ydoc, provider, awareness, collaborators, isConnected, isSynced } = useCollaboration(document.id);

    // Once Yjs syncs, push the current content into liveCodeRef via onLiveChange
    useEffect(() => {
        if (isSynced && ydoc) {
            onLiveChange?.(ydoc.getText("content").toString());
        }
    }, [isSynced, ydoc, onLiveChange]);

    const isReadOnly = userRole === "viewer";

    // ── Bootstrap event system for this editor session ─────────────────────────
    // All handlers (save, AI, analytics, presence, sync) register here.
    // They automatically unregister when the component unmounts.
    useEffect(() => {
        if (!awareness) return;
        const cleanup = bootstrapEventSystem({
            awareness,
            getProvider: () => provider ?? null,
        });
        return cleanup;
    }, [awareness, provider]);

    // ── Notify event bus when this file is opened ──────────────────────────────
    useEffect(() => {
        bus.emit<FileOpenedEvent>("file.opened", {
            documentId: document.id,
            path: document.path,
            language: document.language,
            workspaceId: (document as any).workspace_id ?? "",
            userId: "",  // filled by auth context in production
        });
    }, [document.id]);

    const handleEditorDidMount: OnMount = useCallback(
        (editorInstance, monacoInstance) => {
            editorRef.current = editorInstance;
            monacoRef.current = monacoInstance;

            // Expose a stable getter so parents can read live content from the
            // Monaco model directly — always current, Yjs keeps it in sync
            onEditorReady?.(() => editorRef.current?.getModel()?.getValue() ?? "");
            if (!ydoc) return;

            // Get or create the shared text type for this document
            const yText = ydoc.getText("content");

            // Fire initial content immediately so liveCodeRef is populated before any edit
            onLiveChange?.(yText.toString());

            // Bind Yjs text to Monaco model via y-monaco
            // This replaces the normal onChange handler — Yjs handles all changes
            if (provider?.awareness) {
                bindingRef.current = new MonacoBinding(
                    yText,
                    editorInstance.getModel()!,
                    new Set([editorInstance]),
                    provider.awareness
                );
            }

            // ── Cursor → Event Bus ─────────────────────────────────────────────
            // Instead of calling updatePresenceCursor directly, emit an event.
            // The presence handler subscribes to this and updates Yjs awareness.
            // This decouples the editor from presence logic.
            editorInstance.onDidChangeCursorPosition((e) => {
                bus.emitSync<CursorMovedEvent>("cursor.moved", {
                    userId: "",  // filled in by auth context
                    documentId: document.id,
                    line: e.position.lineNumber,
                    column: e.position.column,
                });
            });

            // ── Document Changes → Event Bus ───────────────────────────────────
            // Instead of calling onContentChange directly, emit an event.
            // The save handler subscribes and debounces the actual Supabase write.
            // The AI handler subscribes and triggers completions.
            // The analytics handler subscribes and tracks editing sessions.
            yText.observe((evt) => {
                const isRemote = evt.transaction.origin !== null;
                markDirty(document.id);
                onLiveChange?.(yText.toString());

                bus.emit<DocumentChangedEvent>("document.changed", {
                    documentId: document.id,
                    workspaceId: (document as any).workspace_id ?? "",
                    userId: "",
                    origin: isRemote ? "remote" : "local",
                    updateSize: yText.length,
                });
            });
        },
        [ydoc, provider, awareness, document.id, markDirty]
    );

    // ── Wire event bus save → call onContentChange prop ───────────────────────
    // The parent (EditorLayout) passes onContentChange to handle actual Supabase writes.
    // We subscribe to "document.saved" so EditorLayout doesn't need to know about the bus.
    useEffect(() => {
        if (!onContentChange || !ydoc) return;

        return bus.on("document.saved", (event: any) => {
            if (event.documentId !== document.id) return;
            const yText = ydoc.getText("content");
            onContentChange(yText.toString());
            markClean(document.id);
        });
    }, [document.id, ydoc, onContentChange, markClean]);

    // Cleanup binding on unmount
    useEffect(() => {
        return () => {
            bindingRef.current?.destroy();
            if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        };
    }, []);

    return (
        <div className="relative flex-1 overflow-hidden">
            <Editor
                language={LANGUAGE_MONACO_MAP[document.language] ?? "typescript"}
                defaultValue={document.content}
                theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                    fontSize,
                    tabSize,
                    wordWrap: wordWrap ? "on" : "off",
                    minimap: { enabled: minimap },
                    readOnly: isReadOnly,
                    scrollBeyondLastLine: false,
                    fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
                    fontLigatures: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true,
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indentation: true },
                    renderLineHighlight: "all",
                    padding: { top: 8, bottom: 8 },
                    suggest: {
                        preview: true,
                        showMethods: true,
                        showFunctions: true,
                        showConstructors: true,
                        showClasses: true,
                    },
                    quickSuggestions: { other: true, comments: false, strings: false },
                }}
                loading={
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        {!isSynced ? "Connecting to collaboration server…" : "Loading editor…"}
                    </div>
                }
            />

            {/* Collaborator cursor overlays */}
            {collaborators.length > 0 && (
                <CollaboratorCursors collaborators={collaborators} editor={editorRef.current} />
            )}

            {/* Connection status indicator */}
            <div className="absolute bottom-2 right-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                    className={`w-1.5 h-1.5 rounded-full ${isConnected ? (isSynced ? "bg-green-400" : "bg-yellow-400") : "bg-red-400"
                        }`}
                />
                {isConnected ? (isSynced ? "Synced" : "Syncing…") : "Offline"}
            </div>
        </div>
    );
}
