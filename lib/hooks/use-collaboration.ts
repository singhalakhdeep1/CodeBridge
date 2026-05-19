"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/stores/editor-store";
import { CURSOR_COLORS, WS_URL } from "@/lib/constants";
import type { UserPresence } from "@/types";

export interface CollaborationState {
    doc: Y.Doc | null;
    provider: HocuspocusProvider | null;
    awareness: HocuspocusProvider["awareness"] | null;
    collaborators: UserPresence[];
    isConnected: boolean;
    isSynced: boolean;
}

/**
 * useCollaboration — sets up Yjs + Hocuspocus (or y-websocket) for CRDT-based
 * real-time collaborative editing. Handles:
 * - Yjs document with text type bound to Monaco via y-monaco
 * - Presence (cursor, selection) via awareness protocol
 * - Connection state and reconnect on drop
 */
export function useCollaboration(documentId: string | undefined): CollaborationState {
    const [state, setState] = useState<CollaborationState>({
        doc: null,
        provider: null,
        awareness: null,
        collaborators: [],
        isConnected: false,
        isSynced: false,
    });

    const providerRef = useRef<HocuspocusProvider | null>(null);
    const docRef = useRef<Y.Doc | null>(null);
    const { currentUser } = useAppStore();

    useEffect(() => {
        if (!documentId) return;

        const ydoc = new Y.Doc();
        docRef.current = ydoc;

        const supabase = createClient();

        const provider = new HocuspocusProvider({
            url: WS_URL,
            name: `document:${documentId}`,
            document: ydoc,
            token: async () => {
                const { data: { session } } = await supabase.auth.getSession();
                return session?.access_token ?? "";
            },
            onConnect: () => setState((s) => ({ ...s, isConnected: true })),
            onDisconnect: () => setState((s) => ({ ...s, isConnected: false, isSynced: false })),
            onSynced: () => setState((s) => ({ ...s, isSynced: true })),
            onAwarenessUpdate: () => {
                if (!provider.awareness) return;
                const states = Array.from(provider.awareness.getStates().entries());
                const collaborators: UserPresence[] = states
                    .filter(([clientId]) => clientId !== provider.awareness!.clientID)
                    .map(([, value], idx) => ({
                        userId: (value as Record<string, unknown>).userId as string ?? "",
                        username: (value as Record<string, unknown>).username as string ?? "Anonymous",
                        avatarUrl: (value as Record<string, unknown>).avatarUrl as string | null ?? null,
                        color: CURSOR_COLORS[idx % CURSOR_COLORS.length],
                        cursor: (value as Record<string, unknown>).cursor as UserPresence["cursor"] ?? null,
                        selection: (value as Record<string, unknown>).selection as UserPresence["selection"] ?? null,
                        lastSeen: (value as Record<string, unknown>).lastSeen as string ?? new Date().toISOString(),
                    }));
                setState((s) => ({ ...s, collaborators }));
            },
        });

        providerRef.current = provider;

        // Set local awareness state (our own presence)
        if (provider.awareness && currentUser) {
            provider.awareness.setLocalState({
                userId: currentUser.id,
                username: currentUser.username,
                avatarUrl: currentUser.avatar_url,
                cursor: null,
                selection: null,
                lastSeen: new Date().toISOString(),
            });
        }

        setState((s) => ({ ...s, doc: ydoc, provider, awareness: provider.awareness }));

        return () => {
            provider.destroy();
            ydoc.destroy();
            providerRef.current = null;
            docRef.current = null;
        };
    }, [documentId, currentUser]);

    return state;
}

/**
 * updatePresenceCursor — call this when Monaco fires onDidChangeCursorPosition
 */
export function updatePresenceCursor(
    awareness: HocuspocusProvider["awareness"] | null,
    cursor: { lineNumber: number; column: number },
    selection: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null
) {
    if (!awareness) return;
    const current = awareness.getLocalState() ?? {};
    awareness.setLocalState({
        ...current,
        cursor,
        selection,
        lastSeen: new Date().toISOString(),
    });
}
