"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, RotateCcw, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface DocumentVersion {
    id: string;
    document_id: string;
    content: string;
    snapshot_name: string | null;
    created_at: string;
    created_by: string;
}

interface Props {
    documentId: string;
    onClose: () => void;
    onRestore: (content: string) => void;
}

function useDocumentVersions(documentId: string) {
    return useQuery<DocumentVersion[]>({
        queryKey: ["versions", documentId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/${documentId}/versions`);
            if (!res.ok) throw new Error("Failed to fetch versions");
            return res.json();
        },
    });
}

export function VersionHistory({ documentId, onClose, onRestore }: Props) {
    const { data: versions = [], isLoading } = useDocumentVersions(documentId);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    async function handleRestore(version: DocumentVersion) {
        setRestoringId(version.id);
        try {
            onRestore(version.content);
            onClose();
        } finally {
            setRestoringId(null);
        }
    }

    return (
        <div className="flex flex-col h-full border-l border-border w-72">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <Clock className="w-4 h-4" />
                    Version History
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <ScrollArea className="flex-1">
                {isLoading && (
                    <div className="p-4 text-sm text-muted-foreground">Loading versions…</div>
                )}
                {!isLoading && versions.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">No saved versions yet.</div>
                )}
                {versions.map((v, i) => (
                    <div
                        key={v.id}
                        className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border hover:bg-accent/50 group"
                    >
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                                {v.snapshot_name ?? `Version ${versions.length - i}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(new Date(v.created_at))}
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={restoringId === v.id}
                            onClick={() => handleRestore(v)}
                        >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore
                        </Button>
                    </div>
                ))}
            </ScrollArea>
        </div>
    );
}
