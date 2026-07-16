import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai/client";
import { getRedis } from "@/lib/redis/client";
import { Ratelimit } from "@upstash/ratelimit";

let ratelimit: Ratelimit | null = null;
function getRatelimit() {
    if (!ratelimit) ratelimit = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(20, "1m") });
    return ratelimit;
}

export async function POST(req: NextRequest) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "AI is not configured. Add OPENAI_API_KEY to your .env.local" }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { success } = await getRatelimit().limit(user.id);
    if (!success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

    try {
        const body = await req.json();
        const { code, language } = body;

        if (!code || !language) {
            return NextResponse.json({ error: "code and language are required" }, { status: 400 });
        }

        const systemPrompt = `You are an expert code assistant. Analyze the provided ${language} code and suggest 3 improvements:
1. Optimize for performance
2. Add error handling
3. Improve code structure/readability

For each suggestion, provide:
- description: Brief explanation of the improvement
- code: The improved code snippet
- confidence: A number between 0 and 1 indicating your confidence

Respond in JSON format:
{
  "suggestions": [
    {
      "id": "1",
      "description": "...",
      "code": "...",
      "confidence": 0.95
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Code:\n\`\`\`${language}\n${code}\n\`\`\`` },
            ],
            max_tokens: 2000,
            temperature: 0.3,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from OpenAI");
        }

        const parsed = JSON.parse(content);
        return NextResponse.json(parsed);
    } catch (error) {
        console.error("Error generating suggestions:", error);
        return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
    }
}
