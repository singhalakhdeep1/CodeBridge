import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile, Workspace, Document, Language } from "@/types";

interface AppState {
    currentUser: Profile | null;
    currentWorkspace: Workspace | null;
    setCurrentUser: (user: Profile | null) => void;
    setCurrentWorkspace: (ws: Workspace | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            currentUser: null,
            currentWorkspace: null,
            setCurrentUser: (user) => set({ currentUser: user }),
            setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),
        }),
        { name: "codesync-app-store" }
    )
);

interface EditorState {
    // Open tabs
    openTabs: Document[];
    activeTabId: string | null;
    // Editor settings
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    // Dirty state (unsaved changes, managed by Yjs — just UI tracking)
    dirtyDocIds: Set<string>;
    // AI panel
    aiPanelOpen: boolean;
    aiPanelWidth: number;
    // Terminal panel
    terminalOpen: boolean;
    // Analytics panel
    analyticsOpen: boolean;
    // Sidebar
    sidebarOpen: boolean;
    // File tree
    fileTreeWidth: number;
    // Actions
    openTab: (doc: Document) => void;
    closeTab: (docId: string) => void;
    setActiveTab: (docId: string) => void;
    markDirty: (docId: string) => void;
    markClean: (docId: string) => void;
    setFontSize: (size: number) => void;
    setTabSize: (size: number) => void;
    toggleWordWrap: () => void;
    toggleMinimap: () => void;
    toggleAIPanel: () => void;
    toggleTerminal: () => void;
    toggleAnalytics: () => void;
    toggleSidebar: () => void;
    setFileTreeWidth: (w: number) => void;
}

export const useEditorStore = create<EditorState>()(
    persist(
        (set, get) => ({
            openTabs: [],
            activeTabId: null,
            fontSize: 14,
            tabSize: 2,
            wordWrap: false,
            minimap: true,
            dirtyDocIds: new Set(),
            aiPanelOpen: false,
            aiPanelWidth: 380,
            terminalOpen: false,
            analyticsOpen: false,
            sidebarOpen: true,
            fileTreeWidth: 240,

            openTab: (doc) => {
                const { openTabs } = get();
                if (!openTabs.find((t) => t.id === doc.id)) {
                    set({ openTabs: [...openTabs, doc] });
                }
                set({ activeTabId: doc.id });
            },

            closeTab: (docId) => {
                const { openTabs, activeTabId } = get();
                const newTabs = openTabs.filter((t) => t.id !== docId);
                let newActive = activeTabId;
                if (activeTabId === docId) {
                    const idx = openTabs.findIndex((t) => t.id === docId);
                    newActive = newTabs[idx]?.id ?? newTabs[idx - 1]?.id ?? null;
                }
                set({ openTabs: newTabs, activeTabId: newActive });
            },

            setActiveTab: (docId) => set({ activeTabId: docId }),

            markDirty: (docId) => {
                const s = new Set(get().dirtyDocIds);
                s.add(docId);
                set({ dirtyDocIds: s });
            },

            markClean: (docId) => {
                const s = new Set(get().dirtyDocIds);
                s.delete(docId);
                set({ dirtyDocIds: s });
            },

            setFontSize: (size) => set({ fontSize: size }),
            setTabSize: (size) => set({ tabSize: size }),
            toggleWordWrap: () => set((s) => ({ wordWrap: !s.wordWrap })),
            toggleMinimap: () => set((s) => ({ minimap: !s.minimap })),
            toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
            toggleTerminal: () => set((s) => ({ terminalOpen: !s.terminalOpen })),
            toggleAnalytics: () => set((s) => ({ analyticsOpen: !s.analyticsOpen })),
            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
            setFileTreeWidth: (w) => set({ fileTreeWidth: w }),
        }),
        {
            name: "codesync-editor-store",
            partialize: (s) => ({
                fontSize: s.fontSize,
                tabSize: s.tabSize,
                wordWrap: s.wordWrap,
                minimap: s.minimap,
                fileTreeWidth: s.fileTreeWidth,
                aiPanelWidth: s.aiPanelWidth,
            }),
        }
    )
);
