import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const { data, error } = await supabase
        .from("execution_runs")
        .select("id, language, status, stdout, stderr, execution_time_ms, created_at")
        .eq("document_id", documentId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
}
