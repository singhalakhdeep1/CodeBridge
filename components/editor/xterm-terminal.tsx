"use client";

import React, { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import { Play, Square, Trash2, Search } from "lucide-react";
import { useExecuteCode } from "@/lib/hooks/use-execution";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Document, WorkspaceRole } from "@/types";

// xterm.js CSS must be imported globally — add to globals.css:
// @import "@xterm/xterm/css/xterm.css";

interface Props {
    document: Document;
    userRole: WorkspaceRole;
    className?: string;
}

export function TerminalPanel({ document, userRole, className }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);
    const { mutate: execute, isPending } = useExecuteCode();

    const canRun = userRole !== "viewer";

    // Boot xterm.js
    useEffect(() => {
        if (!containerRef.current) return;

        const term = new XTerm({
            theme: {
                background: "#0d0d0d",
                foreground: "#d4d4d4",
                cursor: "#d4d4d4",
                selectionBackground: "#264f78",
                black: "#1e1e1e",
                green: "#4ec9b0",
                yellow: "#dcdcaa",
                blue: "#569cd6",
                magenta: "#c586c0",
                cyan: "#9cdcfe",
                white: "#d4d4d4",
            },
            fontFamily: '"Geist Mono", "Cascadia Code", "Fira Code", monospace',
            fontSize: 13,
            lineHeight: 1.5,
            cursorBlink: true,
            scrollback: 1000,
        });

        const fitAddon = new FitAddon();
        const linksAddon = new WebLinksAddon();
        const searchAddon = new SearchAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(linksAddon);
        term.loadAddon(searchAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        term.writeln("\x1b[1;32mCodeSync Terminal\x1b[0m — \x1b[90mWebContainer runtime ready\x1b[0m");
        term.writeln(`\x1b[90mDocument: ${document.title} (${document.language})\x1b[0m`);
        term.writeln("");
        term.write("\x1b[1;34m$\x1b[0m ");

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        searchAddonRef.current = searchAddon;

        const resizeObserver = new ResizeObserver(() => fitAddon.fit());
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            term.dispose();
        };
    }, [document.title, document.language]);

    function writeOutput(text: string, color?: "green" | "red" | "yellow") {
        const term = xtermRef.current;
        if (!term) return;
        const colorCodes = { green: "32", red: "31", yellow: "33" };
        const code = color ? colorCodes[color] : "0";
        for (const line of text.split("\n")) {
            term.writeln(`\x1b[${code}m${line}\x1b[0m`);
        }
    }

    function handleRun() {
        if (!canRun || isPending) return;
        const term = xtermRef.current;
        if (!term) return;

        term.writeln(`\x1b[1;34m$\x1b[0m \x1b[33mRunning ${document.title}…\x1b[0m`);

        execute(
            { document_id: document.id, language: document.language, code: document.content },
            {
                onSuccess: (run) => {
                    if (run.stdout) writeOutput(run.stdout, "green");
                    if (run.stderr) writeOutput(run.stderr, "red");
                    term.writeln(`\x1b[90m[exit ${run.exit_code ?? 0}]\x1b[0m`);
                    term.write("\x1b[1;34m$\x1b[0m ");
                },
                onError: (err) => {
                    writeOutput(`Error: ${err.message}`, "red");
                    term.write("\x1b[1;34m$\x1b[0m ");
                },
            }
        );
    }

    function handleClear() {
        xtermRef.current?.clear();
        xtermRef.current?.write("\x1b[1;34m$\x1b[0m ");
    }

    // Keyboard shortcut: Ctrl+` to focus terminal, Ctrl+L to clear
    useHotkeys("ctrl+l", (e) => { e.preventDefault(); handleClear(); }, { enableOnFormTags: true });

    return (
        <div className={cn("flex flex-col h-full bg-[#0d0d0d] border-t border-border", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1 border-b border-border/50 shrink-0 bg-[#1a1a1a]">
                <span className="text-xs font-mono text-muted-foreground flex-1">TERMINAL</span>

                {canRun && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 gap-1 text-xs text-green-400 hover:text-green-300"
                        onClick={handleRun}
                        disabled={isPending}
                    >
                        {isPending ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {isPending ? "Running" : "Run"}
                    </Button>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 gap-1 text-xs text-muted-foreground"
                    onClick={() => {
                        const term = searchAddonRef.current;
                        // Search addon can be triggered via external UI if needed
                    }}
                    title="Search (Ctrl+F)"
                >
                    <Search className="w-3 h-3" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 gap-1 text-xs text-muted-foreground"
                    onClick={handleClear}
                    title="Clear (Ctrl+L)"
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            </div>

            {/* xterm.js container */}
            <div ref={containerRef} className="flex-1 p-2 overflow-hidden" />
        </div>
    );
}
