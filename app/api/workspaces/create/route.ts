import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createWorkspaceSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { data: workspace, error } = await supabase
        .from("workspaces")
        .insert({ ...parsed.data, owner_id: user.id })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(workspace, { status: 201 });
}
