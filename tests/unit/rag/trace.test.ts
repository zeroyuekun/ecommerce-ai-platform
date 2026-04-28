import { describe, expect, it } from "vitest";
import { TraceBuilder } from "@/lib/ai/rag/trace";

describe("TraceBuilder", () => {
  it("accumulates fields and stamps duration on build", async () => {
    const b = new TraceBuilder("oak bedside table", 2);
    b.setUnderstand({
      rewritten: "oak bedside table",
      hyde: null,
      filters: { color: "oak" },
      fellBack: false,
      durationMs: 12,
    });
    b.setRetrieve({
      topK: 30,
      candidateCount: 7,
      candidates: [
        {
          id: "c1",
          productId: "p1",
          score: 0.91,
          chunkType: "parent",
          text: "Blair Bedside Table — solid oak — $399.",
        },
      ],
      durationMs: 80,
    });
    b.setRerank({
      backend: "cohere",
      topN: 5,
      results: [{ id: "c1", score: 0.95 }],
      durationMs: 110,
    });
    b.setPicked({ productIds: ["p1"] });

    // give the build duration something to measure
    await new Promise((r) => setTimeout(r, 1));
    const trace = b.build();

    expect(trace.traceId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(trace.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(trace.durationMs).toBeGreaterThan(0);
    expect(trace.query).toEqual({ raw: "oak bedside table", historyTurns: 2 });
    expect(trace.understand.rewritten).toBe("oak bedside table");
    expect(trace.retrieve.candidateCount).toBe(7);
    expect(trace.rerank.backend).toBe("cohere");
    expect(trace.picked.productIds).toEqual(["p1"]);
    expect(trace.error).toBeUndefined();
  });

  it("captures errors and still builds a valid trace", () => {
    const b = new TraceBuilder("q", 0);
    b.setUnderstand({
      rewritten: "q",
      hyde: null,
      filters: {},
      fellBack: true,
      durationMs: 5,
    });
    b.setError("retrieve", "Pinecone timeout");
    const trace = b.build();
    expect(trace.error).toEqual({
      stage: "retrieve",
      message: "Pinecone timeout",
    });
  });
});
