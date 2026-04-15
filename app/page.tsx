"use client";

import { useState } from "react";
import type { QueryResponse } from "../shared/types";

export default function HomePage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);

  async function handleSubmit() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong.");
        return;
      }
      setResult(data as QueryResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
        Compliance Copilot
      </h1>
      <p className="mt-2 text-base text-neutral-600">
        Ask a regulatory compliance question and get a cited answer.
      </p>

      <div className="mt-6 space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="e.g. What are baseline requirements for cyber incident detection?"
          rows={4}
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={() => void handleSubmit()}
          disabled={loading || !query.trim()}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Thinking…" : "Submit"}
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {result && (
        <div data-testid="answer" className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
          <h2 className="text-base font-semibold text-neutral-900">Answer</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">{result.answer}</p>
        </div>
      )}

      {result && result.citations.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-semibold text-neutral-900">Sources</h2>
          <ul className="mt-3 space-y-3">
            {result.citations.map((citation) => {
              const retrieval = result.retrievals.find(
                (r) => r.chunkId === citation.chunkId,
              );
              return (
                <li
                  key={citation.chunkId}
                  className="rounded-lg border border-neutral-200 bg-white p-4 text-sm"
                >
                  <span className="font-medium text-neutral-700">
                    {citation.marker}
                  </span>
                  {retrieval && (
                    <p className="mt-1 text-neutral-600">
                      {retrieval.text.slice(0, 200)}
                      {retrieval.text.length > 200 ? "…" : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </main>
  );
}
