import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai, CODE_COMPLETION_SYSTEM_PROMPT } from "@/lib/openai/client";
import { aiCompletionSchema } from "@/lib/validations";
import { getRedis } from "@/lib/redis/client";
import { Ratelimit } from "@upstash/ratelimit";

let ratelimit: Ratelimit | null = null;
function getRatelimit() {
    if (!ratelimit) ratelimit = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(20, "1m") });
    return ratelimit;
}

export async function POST(req: NextRequest) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "AI is not configured. Add OPENAI_API_KEY to your .env.local (get a key at platform.openai.com)." }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { success } = await getRatelimit().limit(user.id);
    if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    const body = await req.json();
    const parsed = aiCompletionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { code, language, cursor_position } = parsed.data;

    const userMessage = `Language: ${language}\n\nCode context (cursor at position ${cursor_position ?? "end"}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nProvide a concise code completion.`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: CODE_COMPLETION_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
        ],
        max_tokens: 256,
        temperature: 0.2,
    });

    return NextResponse.json({ completion: completion.choices[0]?.message?.content ?? "" });
}
