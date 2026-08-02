'use client';

import { useEffect, useState, useRef } from 'react';

interface WasmModule {
  add: (a: number, b: number) => number;
  multiply: (a: number, b: number) => number;
  fibonacci: (n: number) => number;
  is_prime: (n: number) => number;
  quick_sort: (arr: number[]) => void;
}

export function useWasm() {
  const [wasm, setWasm] = useState<WasmModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wasmRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function loadWasm() {
      try {
        setLoading(true);
        setError(null);

        // Load WASM module
        const wasmModule = await import('@/wasm/pkg/codebridge_wasm');
        
        if (mounted) {
          wasmRef.current = wasmModule;
          setWasm({
            add: wasmModule.add,
            multiply: wasmModule.multiply,
            fibonacci: wasmModule.fibonacci,
            is_prime: wasmModule.is_prime,
            quick_sort: wasmModule.quick_sort,
          });
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load WASM');
          setLoading(false);
        }
      }
    }

    loadWasm();

    return () => {
      mounted = false;
    };
  }, []);

  return { wasm, loading, error };
}

export function useWasmOperation<T extends (...args: any[]) => any>(
  operation: T | null,
  ...args: Parameters<T>
) {
  const [result, setResult] = useState<ReturnType<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operation) return;

    let mounted = true;

    async function execute() {
      try {
        setLoading(true);
        setError(null);
        const res = await operation(...args);
        if (mounted) {
          setResult(res);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Operation failed');
          setLoading(false);
        }
      }
    }

    execute();

    return () => {
      mounted = false;
    };
  }, [operation, ...args]);

  return { result, loading, error };
}
