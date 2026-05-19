"use client";

import React, { useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
    FileCode2, FolderOpen, Settings, Play, Sparkles,
    GitBranch, Search, Keyboard, Moon, Sun, Terminal,
    PanelLeft, BarChart2
} from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface CommandItem {
    id: string;
    label: string;
    shortcut?: string;
    icon: React.ReactNode;
    group: string;
    onSelect: () => void;
}

interface Props {
    workspaceId: string;
    documents: Array<{ id: string; title: string; path: string; language: string }>;
}

export function CommandPalette({ workspaceId, documents }: Props) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { toggleAIPanel, toggleTerminal, toggleAnalytics } = useEditorStore();

    useHotkeys("mod+k", (e) => {
        e.preventDefault();
        setOpen((o) => !o);
    }, { enableOnFormTags: true });

    useHotkeys("escape", () => setOpen(false), { enableOnFormTags: true });

    const run = useCallback((fn: () => void) => {
        setOpen(false);
        fn();
    }, []);

    const commands: CommandItem[] = [
        ...documents.map((doc) => ({
            id: `file-${doc.id}`,
            label: doc.title,
            icon: <FileCode2 className="w-4 h-4 text-blue-400" />,
            group: "Files",
            onSelect: () => run(() => router.push(`/workspaces/${workspaceId}/documents/${doc.id}`)),
        })),
        {
            id: "toggle-terminal",
            label: "Toggle Terminal",
            shortcut: "⌃`",
            icon: <Terminal className="w-4 h-4" />,
            group: "View",
            onSelect: () => run(toggleTerminal),
        },
        {
            id: "toggle-ai",
            label: "Toggle AI Panel",
            shortcut: "⌘I",
            icon: <Sparkles className="w-4 h-4 text-purple-400" />,
            group: "View",
            onSelect: () => run(toggleAIPanel),
        },
        {
            id: "toggle-analytics",
            label: "View Code Analytics",
            icon: <BarChart2 className="w-4 h-4 text-green-400" />,
            group: "View",
            onSelect: () => run(toggleAnalytics),
        },
        {
            id: "toggle-sidebar",
            label: "Toggle Sidebar",
            shortcut: "⌘B",
            icon: <PanelLeft className="w-4 h-4" />,
            group: "View",
            onSelect: () => run(() => useEditorStore.getState().toggleSidebar()),
        },
        {
            id: "theme-toggle",
            label: theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
            shortcut: "⌘⇧T",
            icon: theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
            group: "Preferences",
            onSelect: () => run(() => setTheme(theme === "dark" ? "light" : "dark")),
        },
        {
            id: "goto-settings",
            label: "Open Settings",
            shortcut: "⌘,",
            icon: <Settings className="w-4 h-4" />,
            group: "Navigation",
            onSelect: () => run(() => router.push(`/workspaces/${workspaceId}/settings`)),
        },
        {
            id: "goto-workspaces",
            label: "All Workspaces",
            icon: <FolderOpen className="w-4 h-4" />,
            group: "Navigation",
            onSelect: () => run(() => router.push("/workspaces")),
        },
    ];

    const groups = Array.from(new Set(commands.map((c) => c.group)));

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <div className="relative w-full max-w-xl mx-4 rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
                <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                    <div className="flex items-center border-b border-border px-3 gap-2">
                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Command.Input
                            className="flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            placeholder="Search commands and files…"
                            autoFocus
                        />
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                            ESC
                        </kbd>
                    </div>

                    <Command.List className="max-h-80 overflow-y-auto p-2">
                        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </Command.Empty>

                        {groups.map((group) => (
                            <Command.Group key={group} heading={group}>
                                {commands
                                    .filter((c) => c.group === group)
                                    .map((cmd) => (
                                        <Command.Item
                                            key={cmd.id}
                                            value={cmd.label}
                                            onSelect={cmd.onSelect}
                                            className={cn(
                                                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm cursor-pointer",
                                                "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                                "hover:bg-accent/50 transition-colors"
                                            )}
                                        >
                                            {cmd.icon}
                                            <span className="flex-1">{cmd.label}</span>
                                            {cmd.shortcut && (
                                                <kbd className="hidden sm:flex gap-0.5 text-[10px] text-muted-foreground">
                                                    {cmd.shortcut}
                                                </kbd>
                                            )}
                                        </Command.Item>
                                    ))}
                            </Command.Group>
                        ))}
                    </Command.List>

                    <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" /> ↑↓ navigate</span>
                        <span>↵ select</span>
                        <span>ESC close</span>
                        <span className="ml-auto flex items-center gap-1">
                            <GitBranch className="w-3 h-3" /> CodeSync
                        </span>
                    </div>
                </Command>
            </div>
        </div>
    );
}
