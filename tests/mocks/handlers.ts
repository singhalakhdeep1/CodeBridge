/**
 * CodeSync — MSW v2 request handlers
 *
 * These handlers intercept real network requests during tests,
 * replacing brittle vi.mock() call stubs with a proper network layer.
 *
 * Skill: Mock Service Worker v2 (msw)
 */

import { http, HttpResponse } from "msw";

const API = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mock.supabase.co";

export const handlers = [
    // ── Supabase REST ──────────────────────────────────────────────────────────

    http.get(`${API}/rest/v1/workspaces`, () => {
        return HttpResponse.json([
            { id: "ws-1", name: "My Workspace", slug: "my-workspace", owner_id: "user-1" },
        ]);
    }),

    http.get(`${API}/rest/v1/documents`, () => {
        return HttpResponse.json([
            {
                id: "doc-1",
                workspace_id: "ws-1",
                title: "index.ts",
                language: "typescript",
                content: 'console.log("hello");',
                created_at: new Date().toISOString(),
            },
        ]);
    }),

    http.post(`${API}/rest/v1/documents`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ id: "doc-new", ...body }, { status: 201 });
    }),

    // ── OpenAI completions (stub — no real tokens used in tests) ──────────────

    http.post("https://api.openai.com/v1/chat/completions", () => {
        return HttpResponse.json({
            id: "chatcmpl-test",
            object: "chat.completion",
            choices: [{
                message: { role: "assistant", content: "// AI suggestion" },
                finish_reason: "stop",
                index: 0,
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });
    }),

    // ── Rate-limit endpoint ────────────────────────────────────────────────────

    http.post("/api/ai/complete", () => {
        return HttpResponse.json({ content: "// AI suggestion" });
    }),
];
