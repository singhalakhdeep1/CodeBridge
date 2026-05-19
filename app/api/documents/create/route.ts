import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createDocumentSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Verify membership with edit rights
    const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", parsed.data.workspace_id)
        .eq("user_id", user.id)
        .single();

    if (!member || member.role === "viewer") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: document, error } = await supabase
        .from("documents")
        .insert({ ...parsed.data, created_by: user.id })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(document, { status: 201 });
}
