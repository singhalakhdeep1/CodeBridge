"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Document, DocumentVersion, Language } from "@/types";

export function useDocuments(workspaceId: string | undefined) {
    const supabase = createClient();
    return useQuery({
        queryKey: ["documents", workspaceId],
        enabled: !!workspaceId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("documents")
                .select("*")
                .eq("workspace_id", workspaceId!)
                .order("updated_at", { ascending: false });
            if (error) throw error;
            return data as Document[];
        },
    });
}

export function useDocument(documentId: string | undefined) {
    const supabase = createClient();
    return useQuery({
        queryKey: ["document", documentId],
        enabled: !!documentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("documents")
                .select("*, created_by_profile:profiles(*)")
                .eq("id", documentId!)
                .single();
            if (error) throw error;
            return data as Document;
        },
        staleTime: 30_000,
    });
}

export function useDocumentVersions(documentId: string | undefined) {
    const supabase = createClient();
    return useQuery({
        queryKey: ["document", documentId, "versions"],
        enabled: !!documentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("document_versions")
                .select("*, created_by_profile:profiles(*)")
                .eq("document_id", documentId!)
                .order("created_at", { ascending: false })
                .limit(50);
            if (error) throw error;
            return data as DocumentVersion[];
        },
    });
}

export function useCreateDocument() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { workspace_id: string; title: string; language: Language; path?: string }) => {
            const res = await fetch("/api/documents/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json() as Promise<Document>;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ["documents", vars.workspace_id] });
        },
    });
}

export function useUpdateDocument() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Document> & { id: string }) => {
            const res = await fetch(`/api/documents/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json() as Promise<Document>;
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["document", data.id] });
            qc.invalidateQueries({ queryKey: ["documents", data.workspace_id] });
        },
    });
}

export function useDeleteDocument() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
            const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(await res.text());
            return { id, workspaceId };
        },
        onSuccess: ({ workspaceId }) => {
            qc.invalidateQueries({ queryKey: ["documents", workspaceId] });
        },
    });
}

export function useSaveVersion() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ documentId, content, label }: { documentId: string; content: string; label?: string }) => {
            const res = await fetch(`/api/documents/${documentId}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, label }),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ["document", vars.documentId, "versions"] });
        },
    });
}
