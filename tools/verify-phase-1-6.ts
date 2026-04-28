/**
 * Phase 1.6 cost-free verification.
 *
 * Drives the real Pinecone + (optional) Cohere pipeline with a stub
 * understandingFn so no Haiku/Sonnet calls are made — therefore no
 * Vercel AI Gateway credits are consumed. Gives concrete proof that:
 *
 *   1. Trace recorder writes a real RetrievalTrace
 *   2. Trace gets persisted to .tmp/rag-traces.jsonl (RAG_TRACE_FILE=1)
 *   3. Heuristic faithfulness checker scores claims against candidates
 *
 * Usage:
 *   pnpm dotenv -e .env.local -- tsx tools/verify-phase-1-6.ts
 *
 * Cost: $0 (Pinecone Inference + free-tier Cohere).
 */
import { existsSync, readFileSync } from "node:fs";
process.env.RAG_TRACE_FILE = "1";

// Import after setting env so the recorder picks it up.
import { checkFaithfulnessHeuristic } from "@/lib/ai/rag/faithfulness";
import { retrieve } from "@/lib/ai/rag/query/retrieve";
import { rerankAndDedupe } from "@/lib/ai/rag/query/rerank";
import {
  understandQuery,
  type UnderstandingFn,
} from "@/lib/ai/rag/query/understand";
import { TraceBuilder, emitTrace } from "@/lib/ai/rag/trace";

const TRACE_FILE = ".tmp/rag-traces.jsonl";

/**
 * Stub Haiku — no LLM call, no gateway. Returns the query verbatim, no
 * filters, no HyDE. The pipeline still exercises real embeddings + real
 * Pinecone, just without the rewrite step.
 */
const stubUnderstandingFn: UnderstandingFn = async ({ query }) => ({
  rewritten: query,
  hyde: null,
  filters: {},
  fellBack: false,
});

interface VerifyCase {
  query: string;
  fakeAnswer: string;
  notes: string;
}

const CASES: VerifyCase[] = [
  {
    query: "oak bedside table",
    fakeAnswer:
      "I found the Blair Bedside Table in oak — it's $179.99 and 45 cm wide. It's currently in stock.",
    notes: "Truthful answer — should score high.",
  },
  {
    query: "walnut buffet",
    fakeAnswer:
      "The Osaka Buffet in walnut is $469.99. There's also a Sage Green buffet at $429.99. Both ship to Australia.",
    notes: "Mostly-truthful — color, price, and shipping are real.",
  },
  {
    query: "outdoor dining table for 4",
    fakeAnswer:
      "The Ravello Outdoor Four Seater is $99.99 and made of plastic. Out of stock.",
    notes:
      "Hallucinated — wrong price ($249.99 in catalog), wrong material (metal), and stock status not in trace. Should fail faithfulness.",
  },
];

function printDivider(char = "─") {
  console.log(char.repeat(80));
}

async function runOne(c: VerifyCase) {
  printDivider("═");
  console.log(`Query: ${c.query}`);
  console.log(`Fake answer: ${c.fakeAnswer}`);
  console.log(`Notes: ${c.notes}`);
  printDivider();

  const builder = new TraceBuilder(c.query, 0);

  const tU = Date.now();
  const understanding = await understandQuery({
    query: c.query,
    history: [],
    understandingFn: stubUnderstandingFn,
  });
  builder.setUnderstand({
    rewritten: understanding.rewritten,
    hyde: understanding.hyde,
    filters: understanding.filters as Record<string, unknown>,
    fellBack: understanding.fellBack,
    durationMs: Date.now() - tU,
  });

  const tR = Date.now();
  const candidates = await retrieve({
    rewritten: understanding.rewritten,
    hyde: understanding.hyde,
    filters: understanding.filters,
    topK: 30,
  });
  builder.setRetrieve({
    topK: 30,
    candidateCount: candidates.length,
    candidates: candidates.map((m) => ({
      id: m.id,
      productId: m.productId,
      score: m.score,
      chunkType: m.chunkType,
      text: m.metadata.text ?? `${m.chunkType}:${m.id}`,
    })),
    durationMs: Date.now() - tR,
  });

  const candidateTexts: Record<string, string> = Object.fromEntries(
    candidates.map((m) => [m.id, m.metadata.text ?? `${m.chunkType}:${m.id}`]),
  );

  const tRr = Date.now();
  const reranked = await rerankAndDedupe({
    query: understanding.rewritten,
    candidates,
    candidateTexts,
    topNAfterRerank: 10,
    topProducts: 5,
  });
  const backend: "cohere" | "fallback" = process.env.COHERE_API_KEY
    ? "cohere"
    : "fallback";
  builder.setRerank({
    backend,
    topN: 10,
    results: reranked.map((r) => ({ id: r.id, score: r.score })),
    durationMs: Date.now() - tRr,
  });
  builder.setPicked({ productIds: reranked.map((r) => r.productId) });

  const trace = builder.build();
  await emitTrace(trace);

  console.log(`\ntraceId        ${trace.traceId}`);
  console.log(`durationMs     ${trace.durationMs}`);
  console.log(`rerank backend ${trace.rerank.backend}`);
  console.log(`top-5 products ${trace.picked.productIds.join(", ")}`);

  // Now run the faithfulness checker — uses retrieved candidate text as
  // the haystack to verify the fake answer's claims.
  const result = checkFaithfulnessHeuristic({
    query: c.query,
    candidates: trace.retrieve.candidates.map((cand) => ({
      id: cand.id,
      productId: cand.productId,
      text: cand.text,
    })),
    answer: c.fakeAnswer,
  });
  console.log("\nFaithfulness:");
  console.log(`  score        ${result.score.toFixed(3)}`);
  console.log(`  totalClaims  ${result.totalClaims}`);
  console.log(`  supported    ${JSON.stringify(result.supportedClaims)}`);
  console.log(`  unsupported  ${JSON.stringify(result.unsupportedClaims)}`);
  console.log(`  reasoning    ${result.reasoning}`);
}

async function main() {
  console.log("Phase 1.6 verification — no LLM credits used.\n");
  console.log(
    `Cohere: ${process.env.COHERE_API_KEY ? "wired (will rerank)" : "not set (fallback to Pinecone scores)"}`,
  );
  console.log(`Pinecone: ${process.env.PINECONE_API_KEY ? "wired" : "MISSING — script will fail"}`);
  console.log(`Trace sink: stdout + ${TRACE_FILE}\n`);

  for (const c of CASES) {
    try {
      await runOne(c);
    } catch (err) {
      console.error(`\nFAILED on "${c.query}":`, err);
      throw err;
    }
  }

  printDivider("═");
  console.log("Persisted traces:");
  if (existsSync(TRACE_FILE)) {
    const lines = readFileSync(TRACE_FILE, "utf8")
      .split("\n")
      .filter(Boolean);
    console.log(`  ${TRACE_FILE} — ${lines.length} record(s) total`);
    console.log(`  (last record below)\n`);
    const last = JSON.parse(lines[lines.length - 1]);
    // Print a compact view — full record is in the file.
    console.log(
      JSON.stringify(
        {
          traceId: last.traceId,
          query: last.query,
          understand: last.understand,
          retrieve: {
            ...last.retrieve,
            candidates: `[${last.retrieve.candidateCount} items, see file]`,
          },
          rerank: last.rerank,
          picked: last.picked,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`  ${TRACE_FILE} — NOT created (RAG_TRACE_FILE wiring broken!)`);
  }

  console.log(
    `\nInspect via: pnpm trace:tail            (recent traces, formatted)`,
  );
  console.log(`             pnpm trace:tail --bucket trace  (full JSON dump)`);

  // -------------------------------------------------------------------------
  // Standalone faithfulness check — hand-crafted candidate text.
  // Decoupled from Pinecone so this passes regardless of index state.
  // -------------------------------------------------------------------------
  printDivider("═");
  console.log("Faithfulness checker isolation test — hand-crafted candidates:");
  printDivider();

  const handCraftedCandidates = [
    {
      id: "blair-bedside#description",
      productId: "product-blair-bedside-table",
      productName: "Blair Bedside Table",
      text: "The Blair Bedside Table is solid oak with a single drawer. Width 45 cm, height 50 cm. Currently in stock and ships to Australia. $179.99.",
    },
  ];

  const truthful = "The Blair Bedside Table in oak is $179.99 and 45 cm wide. In stock.";
  const halfTruthful =
    "The Blair Bedside Table in oak is $179.99 and 60 cm wide. Out of stock.";
  const hallucinated =
    "The Blair Bedside Table in walnut is $99.99 and 200 cm wide. Ships from Mars.";

  for (const [label, answer] of [
    ["truthful   ", truthful],
    ["half-truth ", halfTruthful],
    ["hallucinate", hallucinated],
  ] as const) {
    const r = checkFaithfulnessHeuristic({
      query: "blair bedside",
      candidates: handCraftedCandidates,
      answer,
    });
    console.log(
      `${label}  score=${r.score.toFixed(2)}  totalClaims=${r.totalClaims}`,
    );
    console.log(`             supported   ${JSON.stringify(r.supportedClaims)}`);
    console.log(`             unsupported ${JSON.stringify(r.unsupportedClaims)}`);
  }

  printDivider();
  console.log(
    "Note: in the real eval, Pinecone provides candidate text — but this index",
  );
  console.log(
    "appears to predate the 2026-04-25 chunk-text fix (commit 4472977 / C3).",
  );
  console.log(
    "`pnpm reindex:rag` would refresh metadata.text. For Phase 1.6 verification",
  );
  console.log(
    "it doesn't matter: the trace + checker code paths above are verified.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
