"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateDocumentDialog } from "@/components/editor/create-document-dialog";
import { useToast } from "@/lib/hooks/use-toast";
import type { Language } from "@/types";

interface Props {
    workspaceId: string;
    canCreate: boolean;
}

export function WorkspaceEmptyState({ workspaceId, canCreate }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    async function handleCreateDocument(title: string, language: string, path: string) {
        const res = await fetch("/api/documents/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                workspace_id: workspaceId,
                title,
                language: language as Language,
                path: path.startsWith("/") ? path : `/${path}`,
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast({ title: err.error ?? "Failed to create file", variant: "destructive" });
            return;
        }

        const doc = await res.json();
        router.push(`/workspaces/${workspaceId}/documents/${doc.id}`);
    }

    return (
        <>
            <div className="flex flex-col items-center justify-center h-screen gap-4 text-center">
                <Code2 className="w-16 h-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold">No files yet</h1>
                <p className="text-muted-foreground">Create your first file to start coding collaboratively.</p>
                {canCreate && (
                    <Button onClick={() => setOpen(true)} className="gap-2 mt-2">
                        <Plus className="w-4 h-4" />
                        Create File
                    </Button>
                )}
            </div>

            <CreateDocumentDialog
                open={open}
                onOpenChange={setOpen}
                onCreateDocument={handleCreateDocument}
            />
        </>
    );
}
