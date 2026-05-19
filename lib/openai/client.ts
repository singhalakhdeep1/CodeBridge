import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
    if (!client) {
        client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return client;
}

// Convenience proxy — routes can import { openai } directly
export const openai = new Proxy({} as OpenAI, {
    get(_t, prop) {
        return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop];
    },
});

// System prompt for inline code completions
export const CODE_COMPLETION_SYSTEM_PROMPT = `You are an expert coding assistant integrated into a collaborative code editor called CodeSync.
Your role is to provide precise, contextual code completions and suggestions.
Rules:
- Complete only the code — no markdown fences, no explanations unless asked
- Match the existing code style, indentation, and patterns
- Be concise; complete the current expression/statement/function
- If generating a whole function/class, include proper documentation
- Never add comments unless they exist in the surrounding code`;

// System prompt for chat assistant
export const CODE_CHAT_SYSTEM_PROMPT = `You are an expert coding assistant in CodeSync, a collaborative code editor.
Help users understand, debug, and improve their code.
Be concise but thorough. Use code blocks with proper language identifiers.
When suggesting changes, show diffs or before/after examples.`;
