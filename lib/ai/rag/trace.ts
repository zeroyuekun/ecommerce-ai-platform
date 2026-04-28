import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
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

// ---------------------------------------------------------------------------
// Emitter
// ---------------------------------------------------------------------------

const TRACE_FILE_DIR = ".tmp";
const TRACE_FILE_NAME = "rag-traces.jsonl";
const TRACE_FILE_ROTATED = "rag-traces.1.jsonl";
const DEFAULT_MAX_MB = 5;

let collector: RetrievalTrace[] | null = null;

/**
 * Begin collecting traces in-process. Used by the eval CLI to retrieve
 * candidates from semanticSearch calls without parsing logs.
 *
 * NOT concurrent-safe — callers must run sequentially. Eval is sequential
 * by construction; production paths never call this. AsyncLocalStorage is
 * the rigorous fix and is deferred to §8.
 */
export function startCollecting(): RetrievalTrace[] {
  collector = [];
  return collector;
}

export function stopCollecting(): RetrievalTrace[] {
  const drained = collector ?? [];
  collector = null;
  return drained;
}

export async function emitTrace(trace: RetrievalTrace): Promise<void> {
  try {
    // eslint-disable-next-line no-console
    console.log("[rag.trace]", JSON.stringify(trace));

    const { captureServerEvent } = await import("@/lib/analytics/server");
    void captureServerEvent({
      distinctId: trace.traceId,
      event: "rag.retrieval.completed",
      properties: trace as unknown as Record<string, unknown>,
    });

    if (process.env.RAG_TRACE_FILE === "1") {
      writeTraceLine(trace);
    }

    collector?.push(trace);
  } catch (err) {
    const { captureException } = await import("@/lib/monitoring");
    captureException(err, { extra: { context: "rag.trace.emit" } });
  }
}

function writeTraceLine(trace: RetrievalTrace): void {
  if (!existsSync(TRACE_FILE_DIR)) {
    mkdirSync(TRACE_FILE_DIR, { recursive: true });
  }
  const path = join(TRACE_FILE_DIR, TRACE_FILE_NAME);
  rotateIfTooBig(path);
  appendFileSync(path, `${JSON.stringify(trace)}\n`);
}

function rotateIfTooBig(path: string): void {
  if (!existsSync(path)) return;
  const envVal = process.env.RAG_TRACE_FILE_MAX_MB;
  const cap = envVal !== undefined ? Number(envVal) : DEFAULT_MAX_MB;
  const maxBytes = cap * 1024 * 1024;
  if (statSync(path).size <= maxBytes) return;
  const rotated = join(TRACE_FILE_DIR, TRACE_FILE_ROTATED);
  if (existsSync(rotated)) {
    // Drop the older rotation; we keep just one previous file.
    renameSync(rotated, `${rotated}.bak`);
  }
  renameSync(path, rotated);
}
