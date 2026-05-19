"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Square, Trash2, ChevronDown } from "lucide-react";
import { useExecuteCode } from "@/lib/hooks/use-execution";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Document, WorkspaceRole } from "@/types";

interface Props {
    document: Document;
    userRole: WorkspaceRole;
    getCode?: () => string;
}

interface TerminalLine {
    type: "command" | "stdout" | "stderr" | "info" | "error";
    content: string;
    timestamp: string;
}

export function TerminalPanel({ document, userRole, getCode }: Props) {
    const [lines, setLines] = useState<TerminalLine[]>([
        { type: "info", content: `CodeSync Terminal — ${document.language} runtime ready`, timestamp: new Date().toISOString() },
    ]);
    const [stdin, setStdin] = useState("");
    const [showStdin, setShowStdin] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { mutate: execute, isPending } = useExecuteCode();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines]);

    const canRun = userRole !== "viewer";

    function appendLine(line: TerminalLine) {
        setLines((prev) => [...prev, line]);
    }

    function handleRun() {
        if (!canRun || isPending) return;

        appendLine({
            type: "command",
            content: `$ Running ${document.title}…`,
            timestamp: new Date().toISOString(),
        });

        execute(
            {
                document_id: document.id,
                language: document.language,
                code: getCode ? getCode() : (document.content ?? ""),
                stdin: stdin || undefined,
            },
            {
                onSuccess: (run) => {
                    if (run.stdout) {
                        for (const line of run.stdout.split("\n")) {
                            appendLine({ type: "stdout", content: line, timestamp: run.created_at });
                        }
                    }
                    if (run.stderr) {
                        for (const line of run.stderr.split("\n")) {
                            appendLine({ type: "stderr", content: line, timestamp: run.created_at });
                        }
                    }
                    appendLine({
                        type: run.exit_code === 0 ? "info" : "error",
                        content: `Process exited with code ${run.exit_code ?? "?"} in ${run.duration_ms ?? "?"}ms`,
                        timestamp: run.created_at,
                    });
                },
                onError: (err) => {
                    appendLine({ type: "error", content: `Execution failed: ${err.message}`, timestamp: new Date().toISOString() });
                },
            }
        );
    }

    function handleClear() {
        setLines([{ type: "info", content: "Terminal cleared.", timestamp: new Date().toISOString() }]);
    }

    return (
        <div className="flex flex-col h-full bg-[hsl(var(--editor-bg))] border-t border-border">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">Terminal</span>
                <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => setShowStdin(!showStdin)}
                >
                    stdin <ChevronDown className={cn("w-3 h-3 transition-transform", showStdin && "rotate-180")} />
                </button>
                {canRun && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1 text-green-400 hover:text-green-300"
                        onClick={handleRun}
                        disabled={isPending}
                    >
                        {isPending ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {isPending ? "Running" : "Run"}
                    </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleClear}>
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>

            {/* Stdin input */}
            {showStdin && (
                <div className="px-3 py-1.5 border-b border-border shrink-0">
                    <textarea
                        className="w-full bg-transparent text-xs font-mono text-foreground resize-none outline-none placeholder:text-muted-foreground h-12"
                        placeholder="Standard input (stdin)…"
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                    />
                </div>
            )}

            {/* Output */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
                {lines.map((line, i) => (
                    <div
                        key={i}
                        className={cn(
                            "whitespace-pre-wrap break-all leading-relaxed",
                            line.type === "command" && "text-primary",
                            line.type === "stdout" && "text-foreground",
                            line.type === "stderr" && "text-red-400",
                            line.type === "info" && "text-muted-foreground",
                            line.type === "error" && "text-red-500"
                        )}
                    >
                        {line.content}
                    </div>
                ))}
                {isPending && (
                    <div className="text-muted-foreground animate-pulse">Running…</div>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
