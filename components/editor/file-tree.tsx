"use client";

import React, { useState, useCallback } from "react";
import { FileText, ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Trash2 } from "lucide-react";
import { cn, getLanguageFromPath } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/editor-store";
import { Button } from "@/components/ui/button";
import type { Document, FileTreeNode, WorkspaceRole } from "@/types";

interface Props {
    documents: Array<{ id: string; title: string; path: string; language: string }>;
    activeDocumentId: string | null;
    workspaceId: string;
    userRole: WorkspaceRole;
    onDocumentSelect: (docId: string) => void;
    onCreateDocument: () => void;
    onDeleteDocument: (docId: string) => void;
}

function buildTree(
    documents: Array<{ id: string; title: string; path: string; language: string }>
): FileTreeNode[] {
    const nodes: FileTreeNode[] = [];

    for (const doc of documents) {
        const parts = doc.path.replace(/^\//, "").split("/").filter(Boolean);
        if (parts.length === 0) {
            nodes.push({ name: doc.title, path: doc.path, type: "file", documentId: doc.id, language: getLanguageFromPath(doc.path) });
            continue;
        }

        // Simple flat representation for now — group by directory prefix
        const dirname = parts.slice(0, -1).join("/");
        const fileName = parts[parts.length - 1];

        // Find or create folder
        if (dirname) {
            let folder = nodes.find((n) => n.type === "folder" && n.path === "/" + dirname);
            if (!folder) {
                folder = { name: dirname.split("/").pop()!, path: "/" + dirname, type: "folder", children: [] };
                nodes.push(folder);
            }
            folder.children!.push({
                name: fileName,
                path: doc.path,
                type: "file",
                documentId: doc.id,
                language: getLanguageFromPath(doc.path),
            });
        } else {
            nodes.push({ name: fileName, path: doc.path, type: "file", documentId: doc.id, language: getLanguageFromPath(doc.path) });
        }
    }

    return nodes;
}

function TreeNode({
    node,
    depth,
    activeDocumentId,
    onSelect,
    onDelete,
    canEdit,
}: {
    node: FileTreeNode;
    depth: number;
    activeDocumentId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    canEdit: boolean;
}) {
    const [expanded, setExpanded] = useState(true);
    const isActive = node.documentId === activeDocumentId;

    if (node.type === "folder") {
        return (
            <div>
                <button
                    className="flex items-center gap-1 w-full px-2 py-0.5 hover:bg-accent text-sm text-muted-foreground"
                    style={{ paddingLeft: `${8 + depth * 12}px` }}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    {expanded ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
                    <span className="ml-1">{node.name}</span>
                </button>
                {expanded && node.children?.map((child) => (
                    <TreeNode key={child.path} node={child} depth={depth + 1} activeDocumentId={activeDocumentId}
                        onSelect={onSelect} onDelete={onDelete} canEdit={canEdit} />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "group flex items-center gap-1 w-full px-2 py-0.5 text-sm cursor-pointer file-tree-item",
                isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            onClick={() => node.documentId && onSelect(node.documentId)}
        >
            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 truncate">{node.name}</span>
            {canEdit && node.documentId && (
                <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                    onClick={(e) => { e.stopPropagation(); onDelete(node.documentId!); }}
                    title="Delete document"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

export function FileTree({
    documents,
    activeDocumentId,
    workspaceId: _workspaceId,
    userRole,
    onDocumentSelect,
    onCreateDocument,
    onDeleteDocument,
}: Props) {
    const tree = buildTree(documents);
    const canEdit = userRole !== "viewer";

    return (
        <div className="flex flex-col h-full bg-[hsl(var(--sidebar-bg))] border-r border-border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</span>
                {canEdit && (
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onCreateDocument} title="New file">
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto py-1">
                {tree.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                        No files yet.{canEdit && <><br /><button className="text-primary hover:underline" onClick={onCreateDocument}>Create one</button></>}
                    </div>
                ) : (
                    tree.map((node) => (
                        <TreeNode key={node.path} node={node} depth={0} activeDocumentId={activeDocumentId}
                            onSelect={onDocumentSelect} onDelete={onDeleteDocument} canEdit={canEdit} />
                    ))
                )}
            </div>
        </div>
    );
}
