import type { ChunkType } from "@/lib/ai/rag/store";

export interface RetrievalTrace {
  traceId: string;
  timestamp: string;
  durationMs: number;

  query: {
    raw: string;
    historyTurns: number;
  };

  understand: {
    rewritten: string;
    hyde: string | null;
    filters: Record<string, unknown>;
    fellBack: boolean;
    durationMs: number;
  };

  retrieve: {
    topK: number;
    candidateCount: number;
    candidates: Array<{
      id: string;
      productId: string;
      score: number;
      chunkType: ChunkType;
      text: string;
    }>;
    durationMs: number;
  };

  rerank: {
    backend: "cohere" | "fallback";
    topN: number;
    results: Array<{ id: string; score: number }>;
    durationMs: number;
  };

  picked: {
    productIds: string[];
  };

  error?: { stage: string; message: string };
}

export class TraceBuilder {
  private readonly trace: Partial<RetrievalTrace>;
  private readonly startedAt: number;

  constructor(query: string, historyTurns: number) {
    this.startedAt = Date.now();
    this.trace = {
      traceId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      query: { raw: query, historyTurns },
    };
  }

  setUnderstand(u: RetrievalTrace["understand"]): this {
    this.trace.understand = u;
    return this;
  }
  setRetrieve(r: RetrievalTrace["retrieve"]): this {
    this.trace.retrieve = r;
    return this;
  }
  setRerank(r: RetrievalTrace["rerank"]): this {
    this.trace.rerank = r;
    return this;
  }
  setPicked(p: RetrievalTrace["picked"]): this {
    this.trace.picked = p;
    return this;
  }

  // Intentional flat-args signature: callers pass the two scalars at the throw site
  // without constructing an intermediate object. Error details are minimal by design.
  setError(stage: string, message: string): this {
    this.trace.error = { stage, message };
    return this;
  }

  build(): RetrievalTrace {
    return {
      traceId: this.trace.traceId as string,
      timestamp: this.trace.timestamp as string,
      durationMs: Date.now() - this.startedAt,
      query: this.trace.query as RetrievalTrace["query"],
      understand: this.trace.understand ?? {
        rewritten: "",
        hyde: null,
        filters: {},
        fellBack: false,
        durationMs: 0,
      },
      retrieve: this.trace.retrieve ?? {
        topK: 0,
        candidateCount: 0,
        candidates: [],
        durationMs: 0,
      },
      rerank: this.trace.rerank ?? {
        backend: "fallback",
        topN: 0,
        results: [],
        durationMs: 0,
      },
      picked: this.trace.picked ?? { productIds: [] },
      ...(this.trace.error ? { error: this.trace.error } : {}),
    };
  }
}
