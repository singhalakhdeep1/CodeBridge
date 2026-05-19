"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/types";

export function useComments(documentId: string | undefined) {
    const supabase = createClient();
    return useQuery({
        queryKey: ["comments", documentId],
        enabled: !!documentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("comments")
                .select("*, author:profiles(*)")
                .eq("document_id", documentId!)
                .eq("resolved", false)
                .order("line_start", { ascending: true });
            if (error) throw error;
            return data as Comment[];
        },
    });
}

export function useAddComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            document_id: string;
            line_start: number;
            line_end: number;
            content: string;
        }) => {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json() as Promise<Comment>;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ["comments", vars.document_id] });
        },
    });
}

export function useResolveComment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ commentId, documentId }: { commentId: string; documentId: string }) => {
            const res = await fetch(`/api/comments/${commentId}/resolve`, { method: "POST" });
            if (!res.ok) throw new Error(await res.text());
            return { commentId, documentId };
        },
        onSuccess: ({ documentId }) => {
            qc.invalidateQueries({ queryKey: ["comments", documentId] });
        },
    });
}
