"use client";

import React, { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { X, BarChart2, FileCode2, GitCommit, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Document } from "@/types";

interface Props {
    document: Document;
    onClose: () => void;
}

const COLORS = ["#569cd6", "#4ec9b0", "#dcdcaa", "#c586c0", "#ce9178"];

export function AnalyticsPanel({ document, onClose }: Props) {
    // Derive metrics from document content
    const metrics = useMemo(() => {
        const lines = document.content?.split("\n") ?? [];
        const totalLines = lines.length;
        const blankLines = lines.filter((l) => l.trim() === "").length;
        const commentLines = lines.filter((l) => l.trim().startsWith("//") || l.trim().startsWith("*") || l.trim().startsWith("#")).length;
        const codeLines = totalLines - blankLines - commentLines;
        const chars = document.content?.length ?? 0;
        const words = document.content?.split(/\s+/).filter(Boolean).length ?? 0;

        // Token-type distribution (simple heuristics)
        const imports = lines.filter((l) => l.trim().startsWith("import ")).length;
        const exports = lines.filter((l) => l.trim().startsWith("export ")).length;
        const functions = lines.filter((l) => /\b(function|=>|async)\b/.test(l)).length;
        const comments = commentLines;

        return { totalLines, blankLines, commentLines, codeLines, chars, words, imports, exports, functions };
    }, [document.content]);

    const lineDistribution = [
        { name: "Code", value: metrics.codeLines, fill: COLORS[0] },
        { name: "Comments", value: metrics.commentLines, fill: COLORS[1] },
        { name: "Blank", value: metrics.blankLines, fill: COLORS[2] },
    ];

    const tokenDistribution = [
        { name: "Imports", count: metrics.imports },
        { name: "Exports", count: metrics.exports },
        { name: "Functions", count: metrics.functions },
        { name: "Comments", count: metrics.commentLines },
    ];

    // Simulated activity over last 7 days (would come from real data)
    const activityData = [
        { day: "Mon", edits: 12, saves: 4 },
        { day: "Tue", edits: 28, saves: 9 },
        { day: "Wed", edits: 7, saves: 3 },
        { day: "Thu", edits: 35, saves: 14 },
        { day: "Fri", edits: 22, saves: 8 },
        { day: "Sat", edits: 5, saves: 2 },
        { day: "Sun", edits: 18, saves: 6 },
    ];

    return (
        <div className="flex flex-col h-full border-l border-border bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">Code Analytics</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: "Total Lines", value: metrics.totalLines, icon: <FileCode2 className="w-3.5 h-3.5" /> },
                            { label: "Code Lines", value: metrics.codeLines, icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> },
                            { label: "Characters", value: metrics.chars.toLocaleString(), icon: <GitCommit className="w-3.5 h-3.5" /> },
                            { label: "Words", value: metrics.words.toLocaleString(), icon: <BarChart2 className="w-3.5 h-3.5 text-green-400" /> },
                        ].map((s) => (
                            <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-2.5">
                                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                    {s.icon}
                                    <span className="text-[11px]">{s.label}</span>
                                </div>
                                <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    <Tabs defaultValue="composition">
                        <TabsList className="w-full h-7 text-xs">
                            <TabsTrigger value="composition" className="flex-1 text-xs">Composition</TabsTrigger>
                            <TabsTrigger value="tokens" className="flex-1 text-xs">Tokens</TabsTrigger>
                            <TabsTrigger value="activity" className="flex-1 text-xs">Activity</TabsTrigger>
                        </TabsList>

                        {/* Line composition pie */}
                        <TabsContent value="composition" className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Line distribution</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={lineDistribution}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={65}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {lineDistribution.map((entry) => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </TabsContent>

                        {/* Token type bar chart */}
                        <TabsContent value="tokens" className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Detected constructs</p>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={tokenDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                                    />
                                    <Bar dataKey="count" fill="#569cd6" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </TabsContent>

                        {/* Edit activity line chart */}
                        <TabsContent value="activity" className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Edit activity (last 7 days)</p>
                            <ResponsiveContainer width="100%" height={160}>
                                <LineChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Line type="monotone" dataKey="edits" stroke="#569cd6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="saves" stroke="#4ec9b0" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    );
}
