"use client";

import React from "react";
import type { editor } from "monaco-editor";
import type { UserPresence } from "@/types";

interface Props {
    collaborators: UserPresence[];
    editor: editor.IStandaloneCodeEditor | null;
}

/**
 * CollaboratorCursors renders avatar chips for each active collaborator.
 * The actual Monaco cursor decorations are handled by y-monaco's MonacoBinding.
 * This component shows collaborator avatars in a floating bar at the top of the editor.
 */
export function CollaboratorCursors({ collaborators, editor: _editor }: Props) {
    if (collaborators.length === 0) return null;

    return (
        <div className="absolute top-2 right-12 flex items-center gap-1 z-10">
            {collaborators.slice(0, 8).map((c, idx) => (
                <div
                    key={c.userId}
                    className="relative group"
                    style={{ zIndex: 8 - idx }}
                >
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-background cursor-default select-none"
                        style={{ backgroundColor: c.color, color: "#000" }}
                        title={c.username}
                    >
                        {c.username[0]?.toUpperCase() ?? "?"}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full mt-1 right-0 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {c.username}
                        {c.cursor && (
                            <span className="text-muted-foreground ml-1">
                                Ln {c.cursor.lineNumber}, Col {c.cursor.column}
                            </span>
                        )}
                    </div>
                </div>
            ))}
            {collaborators.length > 8 && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground ring-2 ring-background">
                    +{collaborators.length - 8}
                </div>
            )}
        </div>
    );
}
