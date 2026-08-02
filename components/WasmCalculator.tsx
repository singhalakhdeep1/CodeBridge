'use client';

import { useWasm } from '@/lib/wasm/useWasm';
import { useState } from 'react';

export function WasmCalculator() {
  const { wasm, loading, error } = useWasm();
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  if (loading) return <div>Loading WASM...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!wasm) return <div>WASM not loaded</div>;

  const handleAdd = () => setResult(wasm.add(a, b));
  const handleMultiply = () => setResult(wasm.multiply(a, b));
  const handleFibonacci = () => setResult(wasm.fibonacci(a));
  const handleIsPrime = () => setResult(wasm.is_prime(a));

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">WASM Calculator</h3>
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="number"
            value={a}
            onChange={(e) => setA(Number(e.target.value))}
            className="px-3 py-2 border rounded"
            placeholder="Number A"
          />
          <input
            type="number"
            value={b}
            onChange={(e) => setB(Number(e.target.value))}
            className="px-3 py-2 border rounded"
            placeholder="Number B"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleAdd} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Add
          </button>
          <button onClick={handleMultiply} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Multiply
          </button>
          <button onClick={handleFibonacci} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
            Fibonacci(A)
          </button>
          <button onClick={handleIsPrime} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
            Is Prime(A)
          </button>
        </div>
        {result !== null && (
          <div className="p-3 bg-muted rounded">
            Result: <span className="font-bold">{result}</span>
          </div>
        )}
      </div>
    </div>
  );
}
