import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeCodeSchema } from "@/lib/validations";
import { EXECUTION_TIMEOUT_MS, MAX_OUTPUT_BYTES } from "@/lib/constants";

// Uses Judge0 CE API for sandboxed execution
const JUDGE0_URL = process.env.JUDGE0_URL ?? "https://judge0-ce.p.rapidapi.com";
const JUDGE0_KEY = process.env.JUDGE0_API_KEY ?? "";

// Language IDs for Judge0
const JUDGE0_LANGUAGE_MAP: Record<string, number> = {
    javascript: 63,  // Node.js
    typescript: 74,
    python: 71,
    rust: 73,
    go: 60,
    java: 62,
    cpp: 54,
    c: 50,
};

export async function POST(req: NextRequest) {
    // Fail fast if neither a custom URL nor an API key is configured
    const hasCustomUrl = !!process.env.JUDGE0_URL;
    if (!hasCustomUrl && !JUDGE0_KEY) {
        return NextResponse.json(
            { error: "Code execution is not configured. Set JUDGE0_URL (e.g. https://ce.judge0.com) or add JUDGE0_API_KEY for the RapidAPI hosted instance." },
            { status: 503 }
        );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = executeCodeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { code, language, stdin, document_id } = parsed.data;
    const languageId = JUDGE0_LANGUAGE_MAP[language];
    if (!languageId) return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 });

    // Insert execution record
    const { data: run } = await supabase
        .from("execution_runs")
        .insert({ document_id, user_id: user.id, language, code, status: "running" })
        .select()
        .single();

    const startTime = Date.now();

    try {
        // Submit to Judge0
        const submitRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(JUDGE0_KEY && {
                    "X-RapidAPI-Key": JUDGE0_KEY,
                    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
                }),
            },
            body: JSON.stringify({
                source_code: code,
                language_id: languageId,
                stdin: stdin ?? "",
                cpu_time_limit: EXECUTION_TIMEOUT_MS / 1000,
                memory_limit: 128000,
            }),
            signal: AbortSignal.timeout(EXECUTION_TIMEOUT_MS + 5000),
        });

        if (!submitRes.ok) {
            throw new Error(`Judge0 error: ${submitRes.statusText}`);
        }

        const result = await submitRes.json();
        const executionTime = Date.now() - startTime;

        const stdout = (result.stdout ?? "").slice(0, MAX_OUTPUT_BYTES);
        const stderr = (result.stderr ?? result.compile_output ?? "").slice(0, MAX_OUTPUT_BYTES);
        const status = result.status?.id <= 3 ? "success" : "error";

        // Update execution record
        if (run?.id) {
            await supabase
                .from("execution_runs")
                .update({ status, stdout, stderr, execution_time_ms: executionTime })
                .eq("id", run.id);
        }

        return NextResponse.json({ stdout, stderr, status, execution_time_ms: executionTime, run_id: run?.id });
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Execution failed";
        if (run?.id) {
            await supabase.from("execution_runs").update({ status: "error", stderr: errorMsg }).eq("id", run.id);
        }
        return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
}
