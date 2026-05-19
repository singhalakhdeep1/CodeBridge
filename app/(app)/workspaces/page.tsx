import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspacesClient } from "@/components/workspaces/workspaces-client";
import type { Metadata } from "next";
import type { Workspace, WorkspaceRole } from "@/types";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: rows } = await supabase
        .from("workspace_members")
        .select("role, workspaces(*)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false });

    const memberships = (rows ?? []).map((m: unknown) => {
        const row = m as { role: WorkspaceRole; workspaces: Workspace };
        return { workspace: row.workspaces, role: row.role };
    });

    return <WorkspacesClient memberships={memberships} />;
}
