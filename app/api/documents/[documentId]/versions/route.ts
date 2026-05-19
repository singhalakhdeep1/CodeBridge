import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { documentId: string } }) {
    const { documentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content, snapshot_name } = await req.json();
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    const { data, error } = await supabase
        .from("document_versions")
        .insert({ document_id: documentId, content, created_by: user.id, snapshot_name: snapshot_name ?? null })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: { documentId: string } }) {
    const { documentId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
        .from("document_versions")
        .select("id, created_at, snapshot_name, created_by")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
}
