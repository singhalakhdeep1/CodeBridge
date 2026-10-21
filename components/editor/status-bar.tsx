"use client";

import { useEditorStore } from "@/lib/stores/editor-store";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2, Users } from "lucide-react";

const LANGUAGE_LABELS: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    rust: "Rust",
    go: "Go",
    cpp: "C++",
    java: "Java",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    markdown: "Markdown",
    sql: "SQL",
};

type SyncStatus = "synced" | "syncing" | "offline";

interface Props {
    language: string;
    cursorLine: number;
    cursorCol: number;
    collaboratorCount: number;
    syncStatus: SyncStatus;
    onLanguageChange?: (lang: string) => void;
}

const STATUS_CONFIG: Record<SyncStatus, { label: string; dot: string }> = {
    synced: { label: "Synced", dot: "bg-green-500" },
    syncing: { label: "Syncing…", dot: "bg-yellow-500 animate-pulse" },
    offline: { label: "Offline", dot: "bg-red-500" },
};

export function StatusBar({ language, cursorLine, cursorCol, collaboratorCount, syncStatus, onLanguageChange }: Props) {
    const { fontSize, tabSize } = useEditorStore();
    const status = STATUS_CONFIG[syncStatus];

    return (
        <div className="flex items-center h-6 px-3 gap-4 bg-primary text-primary-foreground text-xs select-none shrink-0">
            {/* Sync status */}
            <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", status.dot)} />
                <span>{status.label}</span>
            </div>

            <div className="w-px h-3 bg-primary-foreground/30" />

            {/* Language */}
            {onLanguageChange ? (
                <select
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    className="bg-transparent text-primary-foreground text-xs focus:outline-none cursor-pointer"
                >
                    {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
                        <option key={val} value={val} className="bg-background text-foreground">{label}</option>
                    ))}
                </select>
            ) : (
                <span>{LANGUAGE_LABELS[language] ?? language}</span>
            )}

            <div className="w-px h-3 bg-primary-foreground/30" />

            {/* Cursor position */}
            <span>Ln {cursorLine}, Col {cursorCol}</span>

            <div className="w-px h-3 bg-primary-foreground/30" />

            {/* Tab size */}
            <span>Spaces: {tabSize}</span>

            <div className="w-px h-3 bg-primary-foreground/30" />

            {/* Encoding */}
            <span>UTF-8</span>

            <div className="flex-1" />

            {/* Collaborators */}
            {collaboratorCount > 0 && (
                <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{collaboratorCount} online</span>
                </div>
            )}
        </div>
    );
}
