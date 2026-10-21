import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { WorkspaceEmptyState } from "@/components/workspaces/workspace-empty-state";

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

    if (!membership) redirect("/workspaces");

    const { data: documents } = await supabase
        .from("documents")
        .select("id, title, language, path, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });

    // If there's a document, redirect to the first one
    if (documents && documents.length > 0) {
        redirect(`/workspaces/${workspaceId}/documents/${documents[0].id}`);
    }

    const canCreate = membership.role !== "viewer";

    return <WorkspaceEmptyState workspaceId={workspaceId} canCreate={canCreate} />;
}
