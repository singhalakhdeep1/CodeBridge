import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { EditorLayoutClient } from "@/components/editor/editor-layout-client";
import type { Metadata } from "next";

interface Props {
    params: Promise<{ workspaceId: string; documentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { workspaceId, documentId } = await params;
    const supabase = await createServerClient();
    const { data } = await supabase
        .from("documents")
        .select("title")
        .eq("id", documentId)
        .single();
    return { title: data?.title ?? "Document" };
}

export default async function DocumentPage({ params }: Props) {
    const { workspaceId, documentId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [{ data: workspace }, { data: document }, { data: profile }] = await Promise.all([
        supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
        supabase.from("documents").select("*").eq("id", documentId).single(),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    if (!workspace || !document) notFound();

    // Verify access
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

    if (!membership && !document.is_public) redirect("/workspaces");

    // Fetch all documents for the sidebar file tree
    const { data: allDocuments } = await supabase
        .from("documents")
        .select("id, title, path, language")
        .eq("workspace_id", workspaceId)
        .order("path");

    return (
        <EditorLayoutClient
            workspace={workspace}
            document={document}
            allDocuments={allDocuments ?? []}
            currentUser={profile}
            userRole={membership?.role ?? "viewer"}
        />
    );
}
