"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, X } from "lucide-react";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface Comment {
    id: string;
    document_id: string;
    user_id: string;
    content: string;
    line_number: number | null;
    resolved: boolean;
    resolved_at: string | null;
    created_at: string;
    author?: { username: string; avatar_url: string | null };
}

interface Props {
    documentId: string;
    onClose: () => void;
}

function useComments(documentId: string) {
    return useQuery<Comment[]>({
        queryKey: ["comments", documentId],
        queryFn: async () => {
            const res = await fetch(`/api/comments?documentId=${documentId}`);
            if (!res.ok) throw new Error("Failed to fetch comments");
            return res.json();
        },
    });
}

function useResolveComment(documentId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (commentId: string) => {
            const res = await fetch(`/api/comments/${commentId}/resolve`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to resolve");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", documentId] });
        },
    });
}

export function CommentsPanel({ documentId, onClose }: Props) {
    const { data: comments = [], isLoading } = useComments(documentId);
    const resolveComment = useResolveComment(documentId);

    const unresolved = comments.filter((c) => !c.resolved);
    const resolved = comments.filter((c) => c.resolved);

    return (
        <div className="flex flex-col h-full border-l border-border w-80">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <MessageSquare className="w-4 h-4" />
                    Comments
                    {unresolved.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{unresolved.length}</Badge>
                    )}
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <ScrollArea className="flex-1">
                {isLoading && (
                    <div className="p-4 text-sm text-muted-foreground">Loading comments…</div>
                )}

                {!isLoading && comments.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">No comments yet.</div>
                )}

                {/* Unresolved */}
                {unresolved.length > 0 && (
                    <div>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Open ({unresolved.length})
                        </div>
                        {unresolved.map((c) => (
                            <CommentItem key={c.id} comment={c} onResolve={() => resolveComment.mutate(c.id)} resolving={resolveComment.isPending} />
                        ))}
                    </div>
                )}

                {/* Resolved */}
                {resolved.length > 0 && (
                    <div>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Resolved ({resolved.length})
                        </div>
                        {resolved.map((c) => (
                            <CommentItem key={c.id} comment={c} />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

function CommentItem({ comment, onResolve, resolving }: { comment: Comment; onResolve?: () => void; resolving?: boolean }) {
    return (
        <div className="px-4 py-3 border-b border-border hover:bg-accent/30">
            <div className="flex items-start gap-2">
                <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={comment.author?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{getInitials(comment.author?.username ?? "?")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-semibold">@{comment.author?.username ?? "user"}</span>
                        {comment.line_number != null && (
                            <span className="text-xs text-muted-foreground">· Line {comment.line_number}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{formatRelativeTime(new Date(comment.created_at))}</span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                    {onResolve && !comment.resolved && (
                        <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs px-2" onClick={onResolve} disabled={resolving}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Resolve
                        </Button>
                    )}
                    {comment.resolved && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            Resolved
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
