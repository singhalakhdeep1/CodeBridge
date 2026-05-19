"use client";

import { useState, useCallback, useRef } from "react";
import type { AIMessage } from "@/types";

export function useAICompletion() {
    const [isLoading, setIsLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const complete = useCallback(async (params: {
        documentId: string;
        language: string;
        prefix: string;
        suffix: string;
    }): Promise<string> => {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setIsLoading(true);
        try {
            const res = await fetch("/api/ai/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
                signal: ctrl.signal,
            });
            if (!res.ok) throw new Error(await res.text());
            const { completion } = await res.json();
            return completion as string;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setIsLoading(false);
    }, []);

    return { complete, cancel, isLoading };
}

export function useAIChat() {
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const send = useCallback(async (userMessage: string, context?: { language?: string; code?: string }) => {
        const userMsg: AIMessage = { role: "user", content: userMessage };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setIsStreaming(true);

        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        // Placeholder assistant message for streaming
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
                    language: context?.language,
                    code: context?.code,
                }),
                signal: ctrl.signal,
            });

            if (!res.ok || !res.body) throw new Error("Stream failed");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                // Parse SSE chunks
                for (const line of chunk.split("\n")) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") break;
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content ?? "";
                            accumulated += delta;
                            setMessages((prev) => [
                                ...prev.slice(0, -1),
                                { role: "assistant", content: accumulated },
                            ]);
                        } catch { }
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
                ]);
            }
        } finally {
            setIsStreaming(false);
        }
    }, [messages]);

    const clearMessages = useCallback(() => setMessages([]), []);
    const cancelStream = useCallback(() => {
        abortRef.current?.abort();
        setIsStreaming(false);
    }, []);

    return { messages, send, clearMessages, cancelStream, isStreaming };
}
