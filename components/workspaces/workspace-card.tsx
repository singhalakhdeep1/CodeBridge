import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Crown } from "lucide-react";
import type { Workspace, WorkspaceRole } from "@/types";

interface Props {
    workspace: Workspace;
    role: WorkspaceRole;
    onClick: () => void;
}

export function WorkspaceCard({ workspace, role, onClick }: Props) {
    const planColors: Record<string, string> = {
        free: "secondary",
        pro: "default",
        team: "default",
        enterprise: "default",
    };

    return (
        <button
            onClick={onClick}
            className="text-left p-5 rounded-xl border border-border hover:border-primary/40 hover:bg-card/60 transition-all bg-card group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1.5 items-center">
                    {role === "owner" && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                    <Badge variant={(planColors[workspace.plan] ?? "secondary") as "secondary" | "default" | "destructive" | "outline"} className="text-xs capitalize">
                        {workspace.plan}
                    </Badge>
                </div>
            </div>

            <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">
                {workspace.name}
            </h3>
            {workspace.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{workspace.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {workspace.max_members} max
                </span>
                <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {workspace.max_documents} docs
                </span>
                <span className="ml-auto">{formatRelativeTime(workspace.updated_at ?? workspace.created_at)}</span>
            </div>
        </button>
    );
}
