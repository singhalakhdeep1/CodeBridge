"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Sparkles, StopCircle, Trash2 } from "lucide-react";
import { useAIChat } from "@/lib/hooks/use-ai";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Document } from "@/types";

interface Props {
    document: Document;
    onClose: () => void;
}

export function AIPanel({ document, onClose }: Props) {
    const [input, setInput] = useState("");
    const { messages, send, clearMessages, cancelStream, isStreaming } = useAIChat();
    const bottomRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = useCallback(() => {
        const msg = input.trim();
        if (!msg || isStreaming) return;
        setInput("");
        send(msg, { language: document.language, code: document.content });
    }, [input, isStreaming, send, document]);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="flex flex-col h-full bg-[hsl(var(--sidebar-bg))] border-l border-border">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold flex-1">AI Assistant</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={clearMessages} title="Clear chat">
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-12 space-y-2">
                        <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">Ask me anything about your code</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                            {["Explain this function", "Find bugs in my code", "Refactor to be more readable", "Write unit tests"].map((s) => (
                                <button
                                    key={s}
                                    className="block w-full text-left px-3 py-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div
                            className={cn(
                                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                                msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-card text-card-foreground border border-border"
                            )}
                        >
                            {msg.role === "assistant" ? (
                                <div className="prose prose-sm prose-invert max-w-none">
                                    <pre className="whitespace-pre-wrap font-sans text-sm">{msg.content}</pre>
                                    {isStreaming && i === messages.length - 1 && (
                                        <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
                                    )}
                                </div>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 shrink-0">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-ring min-h-[60px] max-h-[160px] font-sans"
                        placeholder="Ask about your code… (Enter to send, Shift+Enter for newline)"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isStreaming}
                    />
                    {isStreaming ? (
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 self-end" onClick={cancelStream}>
                            <StopCircle className="w-4 h-4 text-destructive" />
                        </Button>
                    ) : (
                        <Button size="sm" className="h-9 w-9 p-0 self-end" onClick={handleSend} disabled={!input.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
