"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { EditorLayout } from "./editor-layout";

// Monaco + y-monaco access `window` — must never run on the server
const EditorLayoutDynamic = dynamic(
    () => import("./editor-layout").then((m) => m.EditorLayout),
    { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading editor…</div> }
);

export function EditorLayoutClient(props: ComponentProps<typeof EditorLayout>) {
    return <EditorLayoutDynamic {...props} />;
}
