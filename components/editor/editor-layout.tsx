"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Settings, Play, Sparkles, GitBranch, Users, Clock, MessageSquare, BarChart2 } from "lucide-react";
import { MonacoEditor } from "./monaco-editor";
import { EditorErrorBoundary, TerminalErrorBoundary } from "./error-boundaries";
import { FileTree } from "./file-tree";
import { EditorTabs } from "./editor-tabs";
import { TerminalPanel } from "./terminal-panel";
import { AIPanel } from "./ai-panel";
import { AnalyticsPanel } from "./analytics-panel";
import { VersionHistory } from "./version-history";
import { CommentsPanel } from "./comments-panel";
import { CommandPalette } from "./command-palette";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useCreateDocument, useDeleteDocument, useUpdateDocument } from "@/lib/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/lib/hooks/use-toast";
import type { Document, Profile, Workspace, WorkspaceRole } from "@/types";

interface Props {
    workspace: Workspace;
    document: Document;
    allDocuments: Array<{ id: string; title: string; path: string; language: string }>;
    currentUser: Profile | null;
    userRole: WorkspaceRole;
}

export function EditorLayout({ workspace, document, allDocuments, currentUser, userRole }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const {
        openTabs, activeTabId, dirtyDocIds,
        openTab, closeTab, setActiveTab,
        aiPanelOpen, terminalOpen, analyticsOpen,
        toggleAIPanel, toggleTerminal, toggleAnalytics,
        fileTreeWidth,
    } = useEditorStore();

    const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
    const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);

    const [activeDoc, setActiveDoc] = useState<Document>(document);
    const [docs, setDocs] = useState(allDocuments);
    // Populated by MonacoEditor via onEditorReady — reads directly from Monaco model
    const getEditorContentRef = useRef<(() => string) | null>(null);

    const createDoc = useCreateDocument();
    const deleteDoc = useDeleteDocument();
    const updateDoc = useUpdateDocument();

    // Open initial document in tab
    React.useEffect(() => {
        openTab(document);
    }, []);

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
            if (docId === activeDoc.id) {
                router.push(`/workspaces/${workspace.id}`);
            }
        } catch {
            toast({ title: "Failed to delete file", variant: "destructive" });
        }
    }, [deleteDoc, workspace.id, closeTab, activeDoc.id, router, toast]);

    const handleContentChange = useCallback(async (content: string) => {
        try {
            await updateDoc.mutateAsync({ id: activeDoc.id, content });
        } catch {
            // Silent fail — Yjs will retry
        }
    }, [activeDoc.id, updateDoc]);

    const canRun = userRole !== "viewer";

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Top status bar */}
            <div className="h-8 bg-[hsl(var(--status-bar-bg))] flex items-center px-3 gap-3 text-xs text-white shrink-0">
                <div className="flex items-center gap-1.5 font-medium">
                    <span className="font-mono font-bold">{"<>"}</span>
                    <span>CodeSync</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    <span>{workspace.name}</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span className="status-collaborating">Live</span>
                </div>
                {currentUser && (
                    <span className="text-white/80">{currentUser.username}</span>
                )}
            </div>

            {/* Main area */}
            <div className="flex flex-1 overflow-hidden">
                {/* File tree sidebar */}
                <div className="relative shrink-0" style={{ width: fileTreeWidth }}>
                    <FileTree
                        documents={docs}
                        activeDocumentId={activeDoc.id}
                        workspaceId={workspace.id}
                        userRole={userRole}
                        onDocumentSelect={handleDocumentSelect}
                        onCreateDocument={handleCreateDocument}
                        onDeleteDocument={handleDeleteDocument}
                    />
                </div>

                {/* Editor + panels */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Tab bar */}
                    <EditorTabs
                        tabs={openTabs}
                        activeTabId={activeTabId}
                        dirtyDocIds={dirtyDocIds}
                        onTabClick={(id) => {
                            setActiveTab(id);
                            handleDocumentSelect(id);
                        }}
                        onTabClose={closeTab}
                    />

                    {/* Editor row */}
                    <div className="flex flex-1 overflow-hidden">
                        <div className="flex flex-col flex-1 overflow-hidden">
                            {/* Toolbar */}
                            <div className="flex items-center gap-1 px-2 py-1 border-b border-border shrink-0 bg-[hsl(var(--tab-bg))]">
                                <span className="text-xs text-muted-foreground flex-1 truncate">
                                    {activeDoc.path}
                                </span>
                                {canRun && (
                                    <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs text-green-400"
                                        onClick={toggleTerminal}>
                                        <Play className="w-3 h-3" />Run
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
                                    onClick={toggleAIPanel}>
                                    <Sparkles className="w-3 h-3" />AI
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Analytics"
                                    onClick={toggleAnalytics}>
                                    <BarChart2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Comments"
                                    onClick={() => setCommentsPanelOpen((o) => !o)}>
                                    <MessageSquare className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Version History"
                                    onClick={() => setVersionHistoryOpen((o) => !o)}>
                                    <Clock className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                            {/* Monaco */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <EditorErrorBoundary>
                                    <MonacoEditor
                                        document={activeDoc}
                                        userRole={userRole}
                                        onContentChange={handleContentChange}
                                        onLiveChange={(code) => { }}
                                        onEditorReady={(fn) => { getEditorContentRef.current = fn; }}
                                    />
                                </EditorErrorBoundary>

                                {/* Terminal panel */}
                                {terminalOpen && (
                                    <div className="h-56 shrink-0 relative">
                                        <TerminalErrorBoundary>
                                            <TerminalPanel
                                                document={activeDoc}
                                                userRole={userRole}
                                                getCode={() => getEditorContentRef.current?.() ?? ""}
                                            />
                                        </TerminalErrorBoundary>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI panel */}
                        {aiPanelOpen && (
                            <div className="w-96 shrink-0">
                                <AIPanel document={activeDoc} onClose={toggleAIPanel} />
                            </div>
                        )}

                        {/* Analytics panel */}
                        {analyticsOpen && (
                            <div className="w-80 shrink-0">
                                <AnalyticsPanel document={activeDoc} onClose={toggleAnalytics} />
                            </div>
                        )}

                        {/* Comments panel */}
                        {commentsPanelOpen && (
                            <div className="w-80 shrink-0">
                                <CommentsPanel documentId={activeDoc.id} onClose={() => setCommentsPanelOpen(false)} />
                            </div>
                        )}

                        {/* Version history panel */}
                        {versionHistoryOpen && (
                            <div className="w-72 shrink-0">
                                <VersionHistory
                                    documentId={activeDoc.id}
                                    onClose={() => setVersionHistoryOpen(false)}
                                    onRestore={(content) => {
                                        updateDoc.mutate({ id: activeDoc.id, content });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Command palette — triggered by Ctrl+K, floats above everything */}
            <CommandPalette workspaceId={workspace.id} documents={docs} />
        </div>
    );
}
