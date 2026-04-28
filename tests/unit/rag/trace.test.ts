import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TraceBuilder, emitTrace, startCollecting, stopCollecting } from "@/lib/ai/rag/trace";

vi.mock("@/lib/analytics/server", () => ({
  captureServerEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/monitoring", async (orig) => ({
  ...(await orig<typeof import("@/lib/monitoring")>()),
  captureException: vi.fn(),
}));

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

  it("build() returns valid defaults for sections that were never set (error path)", () => {
    const b = new TraceBuilder("q", 0);
    b.setError("retrieve", "Pinecone timeout");
    const trace = b.build();

    // The error path: only setError was called. build() must still produce
    // a structurally valid RetrievalTrace so downstream emitters and
    // consumers don't trip over undefined fields.
    expect(trace.understand).toMatchObject({ rewritten: "", durationMs: 0 });
    expect(trace.retrieve).toMatchObject({ candidateCount: 0, candidates: [] });
    expect(trace.rerank).toMatchObject({ backend: "fallback", topN: 0 });
    expect(trace.picked).toEqual({ productIds: [] });
    expect(trace.error).toEqual({ stage: "retrieve", message: "Pinecone timeout" });
    expect(trace.traceId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("emitTrace", () => {
  const cwd = process.cwd();
  let tmp: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  function sampleTrace() {
    const b = new TraceBuilder("q", 0);
    b.setUnderstand({
      rewritten: "q",
      hyde: null,
      filters: {},
      fellBack: false,
      durationMs: 1,
    });
    b.setRetrieve({
      topK: 10,
      candidateCount: 0,
      candidates: [],
      durationMs: 1,
    });
    b.setRerank({
      backend: "fallback",
      topN: 0,
      results: [],
      durationMs: 0,
    });
    b.setPicked({ productIds: [] });
    return b.build();
  }

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "rag-trace-"));
    process.chdir(tmp);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(tmp, { recursive: true, force: true });
    logSpy.mockRestore();
    delete process.env.RAG_TRACE_FILE;
    vi.clearAllMocks();
  });

  it("logs the trace to stdout always", async () => {
    await emitTrace(sampleTrace());
    expect(logSpy).toHaveBeenCalledWith(
      "[rag.trace]",
      expect.stringContaining('"traceId"'),
    );
  });

  it("writes to .tmp/rag-traces.jsonl when RAG_TRACE_FILE=1", async () => {
    process.env.RAG_TRACE_FILE = "1";
    await emitTrace(sampleTrace());
    const path = join(tmp, ".tmp", "rag-traces.jsonl");
    expect(existsSync(path)).toBe(true);
    const line = readFileSync(path, "utf8").trim();
    expect(JSON.parse(line).traceId).toBeTruthy();
  });

  it("does not write to file by default", async () => {
    await emitTrace(sampleTrace());
    expect(existsSync(join(tmp, ".tmp", "rag-traces.jsonl"))).toBe(false);
  });

  it("rotates the file when it exceeds RAG_TRACE_FILE_MAX_MB", async () => {
    process.env.RAG_TRACE_FILE = "1";
    process.env.RAG_TRACE_FILE_MAX_MB = "0"; // force rotation on every write past the first
    await emitTrace(sampleTrace());
    await emitTrace(sampleTrace());
    expect(
      existsSync(join(tmp, ".tmp", "rag-traces.1.jsonl")),
    ).toBe(true);
    delete process.env.RAG_TRACE_FILE_MAX_MB;
  });

  it("populates the in-process collector when collecting", async () => {
    const sink = startCollecting();
    await emitTrace(sampleTrace());
    await emitTrace(sampleTrace());
    expect(sink).toHaveLength(2);
    const drained = stopCollecting();
    expect(drained).toHaveLength(2);
  });

  it("swallows emit errors via captureException", async () => {
    const { captureException } = await import("@/lib/monitoring");
    const trace = sampleTrace();
    // Force JSON.stringify to throw by adding a circular ref AFTER build
    (trace as unknown as { self: unknown }).self = trace;
    await emitTrace(trace);
    expect(captureException).toHaveBeenCalled();
  });
});
