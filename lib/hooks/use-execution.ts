"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExecutionRun } from "@/types";
import { EXECUTION_TIMEOUT_MS } from "@/lib/constants";

export function useExecutionHistory(documentId: string | undefined) {
    return useQuery({
        queryKey: ["executions", documentId],
        enabled: !!documentId,
        queryFn: async () => {
            const res = await fetch(`/api/execute/history?documentId=${documentId}`);
            if (!res.ok) throw new Error(await res.text());
            return res.json() as Promise<ExecutionRun[]>;
        },
    });
}

export function useExecuteCode() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            document_id: string;
            language: string;
            code: string;
            stdin?: string;
        }) => {
            const ctrl = new AbortController();
            const timeout = setTimeout(() => ctrl.abort(), EXECUTION_TIMEOUT_MS + 2000);
            try {
                const res = await fetch("/api/execute", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(input),
                    signal: ctrl.signal,
                });
                if (!res.ok) throw new Error(await res.text());
                return res.json() as Promise<ExecutionRun>;
            } finally {
                clearTimeout(timeout);
            }
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: ["executions", vars.document_id] });
        },
    });
}
