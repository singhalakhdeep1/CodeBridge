import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateDocumentSchema } from "@/lib/validations";

async function getMemberRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, documentId: string) {
    const { data: doc } = await supabase.from("documents").select("workspace_id").eq("id", documentId).single();
    if (!doc) return null;
    const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", doc.workspace_id)
        .eq("user_id", userId)
        .single();
    return member?.role ?? null;
}

export async function GET(req: NextRequest, { params }: { params: { documentId: string } }) {
    const { documentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = await getMemberRole(supabase, user.id, documentId);
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await supabase.from("documents").select("*").eq("id", documentId).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { documentId: string } }) {
    const { documentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = await getMemberRole(supabase, user.id, documentId);
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (role === "viewer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data, error } = await supabase
        .from("documents")
        .update(parsed.data)
        .eq("id", documentId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { documentId: string } }) {
    const { documentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = await getMemberRole(supabase, user.id, documentId);
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (role === "viewer" || role === "editor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("documents").delete().eq("id", documentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
}
