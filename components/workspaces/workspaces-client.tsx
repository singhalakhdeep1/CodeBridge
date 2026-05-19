"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceCard } from "./workspace-card";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import type { Workspace, WorkspaceRole } from "@/types";

interface WorkspaceMembership {
    workspace: Workspace;
    role: WorkspaceRole;
}

interface Props {
    memberships: WorkspaceMembership[];
}

export function WorkspacesClient({ memberships }: Props) {
    const router = useRouter();
    const [createOpen, setCreateOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState(memberships);

    function handleCreated(workspace: Workspace) {
        setWorkspaces((prev) => [{ workspace, role: "owner" as WorkspaceRole }, ...prev]);
        router.push(`/workspaces/${workspace.id}`);
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border px-8 py-4 flex items-center gap-3">
                <Code2 className="w-6 h-6 text-primary" />
                <span className="font-semibold text-lg">CodeSync</span>
                <div className="flex-1" />
                <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    New Workspace
                </Button>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-10">
                <h1 className="text-2xl font-bold mb-1">Workspaces</h1>
                <p className="text-muted-foreground mb-8">Collaborate on code with your team in real-time.</p>

                {workspaces.length === 0 ? (
                    <div className="text-center py-24 border border-dashed border-border rounded-xl">
                        <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">No workspaces yet</p>
                        <p className="text-muted-foreground mb-6">Create your first workspace to start coding collaboratively.</p>
                        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                            <Plus className="w-4 h-4" />
                            Create Workspace
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workspaces.map(({ workspace, role }) => (
                            <WorkspaceCard
                                key={workspace.id}
                                workspace={workspace}
                                role={role}
                                onClick={() => router.push(`/workspaces/${workspace.id}`)}
                            />
                        ))}
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="h-44 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                        >
                            <Plus className="w-8 h-8" />
                            <span className="text-sm font-medium">New Workspace</span>
                        </button>
                    </div>
                )}
            </div>

            <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
        </div>
    );
}
