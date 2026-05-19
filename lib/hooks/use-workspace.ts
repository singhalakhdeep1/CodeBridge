"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Workspace, WorkspaceMember } from "@/types";

export function useWorkspaces() {
    const supabase = createClient();
    return useQuery({
        queryKey: ["workspaces"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const { data, error } = await supabase
                .from("workspace_members")
                .select("workspace_id, role, workspaces(*)")
                .eq("user_id", user.id)
                .order("joined_at", { ascending: false });
            if (error) throw error;
            return (data ?? []).map((row: unknown) => {
                const r = row as { role: string; workspaces: Workspace };
                return { ...r.workspaces, myRole: r.role };
            });
        },
    });
}

export function useWorkspace(workspaceId: string | undefined) {
    const supabase = createClient();
    return useQuery({
        queryKey: ["workspace", workspaceId],
        enabled: !!workspaceId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("workspaces")
                .select("*")
                .eq("id", workspaceId!)
                .single();
            if (error) throw error;
            return data as Workspace;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
    const supabase = createClient();
    return useQuery({
        queryKey: ["workspace", workspaceId, "members"],
        enabled: !!workspaceId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("workspace_members")
                .select("*, profile:profiles(*)")
                .eq("workspace_id", workspaceId!);
            if (error) throw error;
            return data as WorkspaceMember[];
        },
    });
}

export function useCreateWorkspace() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { name: string; slug: string }) => {
            const res = await fetch("/api/workspaces/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            });
            if (!res.ok) throw new Error(await res.text());
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
    });
}
