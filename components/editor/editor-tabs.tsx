"use client";

import React from "react";
import { X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/editor-store";
import type { Document } from "@/types";

interface Props {
    tabs: Document[];
    activeTabId: string | null;
    dirtyDocIds: Set<string>;
    onTabClick: (id: string) => void;
    onTabClose: (id: string) => void;
}

export function EditorTabs({ tabs, activeTabId, dirtyDocIds, onTabClick, onTabClose }: Props) {
    if (tabs.length === 0) {
        return (
            <div className="h-9 bg-[hsl(var(--tab-bg))] border-b border-border flex items-center px-4">
                <span className="text-xs text-muted-foreground">Open a file to start editing</span>
            </div>
        );
    }

    return (
        <div className="h-9 bg-[hsl(var(--tab-bg))] border-b border-border flex items-center overflow-x-auto shrink-0">
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const isDirty = dirtyDocIds.has(tab.id);

                return (
                    <div
                        key={tab.id}
                        className={cn(
                            "editor-tab flex items-center gap-1.5 px-4 h-full border-r border-border cursor-pointer shrink-0 text-sm select-none",
                            isActive
                                ? "bg-[hsl(var(--tab-active-bg))] text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                        )}
                        onClick={() => onTabClick(tab.id)}
                    >
                        {/* Dirty indicator */}
                        {isDirty ? (
                            <Circle className="w-2 h-2 fill-foreground text-foreground" />
                        ) : null}
                        <span className="max-w-[140px] truncate">{tab.title}</span>
                        <button
                            className="tab-close ml-1 p-0.5 rounded hover:bg-accent hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                            title="Close tab"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
