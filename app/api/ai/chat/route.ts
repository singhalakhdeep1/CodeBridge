import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai, CODE_CHAT_SYSTEM_PROMPT } from "@/lib/openai/client";
import { aiChatSchema } from "@/lib/validations";
import { getRedis } from "@/lib/redis/client";
import { Ratelimit } from "@upstash/ratelimit";

let ratelimit: Ratelimit | null = null;
function getRatelimit() {
    if (!ratelimit) ratelimit = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(30, "1m") });
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
    const parsed = aiChatSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { messages, language, code } = parsed.data;

    const systemMessage = (language && code)
        ? `${CODE_CHAT_SYSTEM_PROMPT}\n\nCurrent file (${language}):\n\`\`\`${language}\n${code.slice(0, 4000)}\n\`\`\``
        : CODE_CHAT_SYSTEM_PROMPT;

    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
            { role: "system", content: systemMessage },
            ...messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        max_tokens: 1024,
        temperature: 0.3,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content ?? "";
                if (delta) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
        },
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
