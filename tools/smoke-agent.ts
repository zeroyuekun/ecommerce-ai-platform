/**
 * End-to-end smoke test for the RAG pipeline. Exercises the same code
 * that the chat route's semanticSearch tool uses, without needing Clerk
 * auth or a browser:
 *
 *   - understand (Haiku) → retrieve (Pinecone) → rerank (Cohere or
 *     graceful fallback) → dedupe → hydrate (Sanity client) → format.
 *
 * Why we're not exercising getProductDetails / filterSearch from this
 * script: those tools use sanity/lib/live which requires a React Server
 * Components runtime. Their unit tests cover correctness; the chat route
 * exercises them end-to-end.
 *
 * Usage: pnpm dotenv -e .env.local -- tsx tools/smoke-agent.ts
 */
import { semanticSearchTool } from "@/lib/ai/tools/semantic-search";

interface FormattedProduct {
  id: string;
  slug: string;
  name: string;
  relevanceScore?: number;
  stockStatus: string;
  keyMaterials: string;
}

interface SemanticResult {
  found: boolean;
  totalResults: number;
  products: FormattedProduct[];
  message: string | null;
}

const fakeContext = { messages: [], toolCallId: "smoke" } as never;

async function runQuery(
  label: string,
  query: string,
  filters?: Record<string, unknown>,
) {
  console.log(`\n=== ${label} ===`);
  console.log(
    `Query: "${query}"${filters ? `  filters: ${JSON.stringify(filters)}` : ""}`,
  );
  const start = Date.now();
  const out = (await semanticSearchTool.execute(
    { query, ...(filters ? { filters } : {}) },
    fakeContext,
  )) as SemanticResult;
  const ms = Date.now() - start;
  console.log(
    `  ${ms}ms · found: ${out.found} · totalResults: ${out.totalResults}`,
  );
  for (const p of out.products) {
    const score = (p.relevanceScore ?? 0).toFixed(3);
    console.log(
      `    ${score}  ${p.name.padEnd(50)}  ${p.stockStatus.padEnd(12)}  ${p.keyMaterials}`,
    );
  }
  if (out.message) console.log(`  notice: ${out.message}`);
}

async function main() {
  const checks: Array<[string, string, Record<string, unknown>?]> = [
    ["CHECK 1 — Aesthetic / vibe query", "show me a cozy reading chair"],
    ["CHECK 2 — Filter extraction", "oak coffee table under $400"],
    ["CHECK 3 — Spatial / fit query", "small bedside table for a tight space"],
    ["CHECK 4 — Style + room", "minimalist Japandi sofa for a small apartment"],
    [
      "CHECK 5 — User-supplied filter merge",
      "anything for the bedroom",
      { color: "walnut" },
    ],
    [
      "CHECK 6 — Out-of-catalog (should still return SOMETHING graceful)",
      "do you sell mattresses",
    ],
  ];
  for (const [label, query, filters] of checks) {
    try {
      await runQuery(label, query, filters);
    } catch (err) {
      console.error(
        `!!! ${label} threw:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log("\n=== Done ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
