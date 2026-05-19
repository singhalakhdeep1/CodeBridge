"use client";

import React from "react";
import {
    PanelGroup, Panel, PanelResizeHandle,
} from "react-resizable-panels";
import { useEditorStore } from "@/lib/stores/editor-store";
import { FileTree } from "./file-tree";
import { EditorTabs } from "./editor-tabs";
import { MonacoEditor } from "./monaco-editor";
import { XtermTerminal } from "./xterm-terminal";
import { AIPanel } from "./ai-panel";
import { CommandPalette } from "./command-palette";
import { AnalyticsPanel } from "./analytics-panel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";
import { useHotkeys } from "react-hotkeys-hook";
import { useRouter } from "next/navigation";
import {
    GitBranch, Play, Sparkles, Settings, Users, Save, BarChart2,
} from "lucide-react";
import { useCreateDocument, useDeleteDocument, useUpdateDocument } from "@/lib/hooks/use-documents";
import type { Document, Profile, Workspace, WorkspaceRole } from "@/types";
import { useState, useCallback, useEffect } from "react";

interface Props {
    workspace: Workspace;
    document: Document;
    allDocuments: Array<{ id: string; title: string; path: string; language: string }>;
    currentUser: Profile | null;
    userRole: WorkspaceRole;
}

export function ResizableEditorLayout({ workspace, document, allDocuments, currentUser, userRole }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const {
        openTabs, activeTabId, dirtyDocIds,
        openTab, closeTab, setActiveTab,
        aiPanelOpen, terminalOpen, analyticsOpen,
        toggleAIPanel, toggleTerminal, toggleAnalytics,
    } = useEditorStore();

    const [activeDoc, setActiveDoc] = useState<Document>(document);
    const [docs, setDocs] = useState(allDocuments);

    const createDoc = useCreateDocument();
    const deleteDoc = useDeleteDocument();
    const updateDoc = useUpdateDocument();

    useEffect(() => { openTab(document); }, []);

    // Global keyboard shortcuts
    useHotkeys("mod+shift+e", () => router.push("/workspaces"), { enableOnFormTags: true });
    useHotkeys("mod+shift+x", (e) => { e.preventDefault(); toggleTerminal(); }, { enableOnFormTags: true });
    useHotkeys("mod+i", (e) => { e.preventDefault(); toggleAIPanel(); }, { enableOnFormTags: true });
    useHotkeys("mod+comma", () => router.push(`/workspaces/${workspace.id}/settings`), { enableOnFormTags: true });

    const handleDocumentSelect = useCallback((docId: string) => {
        const found = docs.find((d) => d.id === docId);
        if (!found) return;
        router.push(`/workspaces/${workspace.id}/documents/${docId}`);
    }, [docs, router, workspace.id]);

    const handleCreateDocument = useCallback(async () => {
        const title = prompt("File name (e.g. src/index.ts):");
        if (!title) return;
        try {
            const newDoc = await createDoc.mutateAsync({
                workspace_id: workspace.id,
                title: title.split("/").pop()!,
                language: "typescript",
                path: title.startsWith("/") ? title : `/${title}`,
            });
            setDocs((prev) => [...prev, { id: newDoc.id, title: newDoc.title, path: newDoc.path, language: newDoc.language }]);
            router.push(`/workspaces/${workspace.id}/documents/${newDoc.id}`);
        } catch {
            toast({ title: "Failed to create file", variant: "destructive" });
        }
    }, [createDoc, workspace.id, router, toast]);

    const handleDeleteDocument = useCallback(async (docId: string) => {
        if (!confirm("Delete this file? This cannot be undone.")) return;
        try {
            await deleteDoc.mutateAsync({ id: docId, workspaceId: workspace.id });
            setDocs((prev) => prev.filter((d) => d.id !== docId));
            closeTab(docId);
            if (docId === activeDoc.id) router.push(`/workspaces/${workspace.id}`);
        } catch {
            toast({ title: "Failed to delete file", variant: "destructive" });
        }
    }, [deleteDoc, workspace.id, closeTab, activeDoc.id, router, toast]);

    const handleContentChange = useCallback(async (content: string) => {
        try {
            await updateDoc.mutateAsync({ id: activeDoc.id, content });
        } catch { /* Silent fail — Yjs will retry */ }
    }, [activeDoc.id, updateDoc]);

    const canRun = userRole !== "viewer";

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Command palette — ⌘K */}
            <CommandPalette workspaceId={workspace.id} documents={docs} />

            {/* Status bar */}
            <div className="h-8 bg-[hsl(var(--status-bar-bg))] flex items-center px-3 gap-3 text-xs text-white shrink-0">
                <span className="font-mono font-bold">{"<>"}</span>
                <span>CodeSync</span>
                <div className="w-px h-4 bg-white/20" />
                <GitBranch className="w-3 h-3" />
                <span>{workspace.name}</span>
                <div className="flex-1" />
                <Users className="w-3 h-3" />
                <span className="status-collaborating">Live</span>
                {currentUser && <span className="text-white/80">{currentUser.username}</span>}
            </div>

            {/* Resizable main area */}
            <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">

                {/* Sidebar: File tree */}
                <Panel defaultSize={18} minSize={12} maxSize={35} id="sidebar">
                    <FileTree
                        documents={docs}
                        activeDocumentId={activeDoc.id}
                        workspaceId={workspace.id}
                        userRole={userRole}
                        onDocumentSelect={handleDocumentSelect}
                        onCreateDocument={handleCreateDocument}
                        onDeleteDocument={handleDeleteDocument}
                    />
                </Panel>

                <PanelResizeHandle className="w-px bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

                {/* Editor + terminal */}
                <Panel id="editor-area">
                    <PanelGroup direction="vertical">
                        {/* Editor */}
                        <Panel id="editor" minSize={30}>
                            <div className="flex flex-col h-full">
                                <EditorTabs
                                    tabs={openTabs}
                                    activeTabId={activeTabId}
                                    dirtyDocIds={dirtyDocIds}
                                    onTabClick={(id) => { setActiveTab(id); handleDocumentSelect(id); }}
                                    onTabClose={closeTab}
                                />
                                <div className="flex items-center gap-1 px-2 py-1 border-b border-border shrink-0 bg-[hsl(var(--tab-bg))]">
                                    <span className="text-xs text-muted-foreground flex-1 truncate">{activeDoc.path}</span>
                                    {canRun && (
                                        <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs text-green-400" onClick={toggleTerminal}>
                                            <Play className="w-3 h-3" />Run
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={toggleAIPanel}>
                                        <Sparkles className="w-3 h-3" />AI
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs" onClick={toggleAnalytics}>
                                        <BarChart2 className="w-3 h-3" />Analytics
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <MonacoEditor
                                        document={activeDoc}
                                        userRole={userRole}
                                        onContentChange={handleContentChange}
                                    />
                                </div>
                            </div>
                        </Panel>

                        {/* Resizable terminal panel */}
                        {terminalOpen && (
                            <>
                                <PanelResizeHandle className="h-px bg-border hover:bg-primary/50 transition-colors cursor-row-resize" />
                                <Panel id="terminal" defaultSize={25} minSize={15} maxSize={50}>
                                    <XtermTerminal document={activeDoc} userRole={userRole} className="h-full" />
                                </Panel>
                            </>
                        )}
                    </PanelGroup>
                </Panel>

                {/* AI panel */}
                {aiPanelOpen && (
                    <>
                        <PanelResizeHandle className="w-px bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />
                        <Panel id="ai-panel" defaultSize={28} minSize={20} maxSize={45}>
                            <AIPanel document={activeDoc} onClose={toggleAIPanel} />
                        </Panel>
                    </>
                )}

                {/* Analytics panel */}
                {analyticsOpen && (
                    <>
                        <PanelResizeHandle className="w-px bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />
                        <Panel id="analytics-panel" defaultSize={28} minSize={20} maxSize={45}>
                            <AnalyticsPanel document={activeDoc} onClose={toggleAnalytics} />
                        </Panel>
                    </>
                )}
            </PanelGroup>
        </div>
    );
}
