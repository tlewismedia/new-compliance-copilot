import { describe, it, expect } from "vitest";

describe.skipIf(!process.env.PINECONE_API_KEY || !process.env.ANTHROPIC_API_KEY)(
  "/api/query route integration",
  () => {
    it("returns answer and citations for a compliance question", async () => {
      // Import the POST handler directly (not via HTTP)
      const { POST } = await import("../../app/api/query/route");
      const req = new Request("http://localhost/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "What are the baseline requirements for cyber incident detection?" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.answer).toBe("string");
      expect(body.answer.length).toBeGreaterThan(0);
      expect(Array.isArray(body.citations)).toBe(true);
    });
  }
);
