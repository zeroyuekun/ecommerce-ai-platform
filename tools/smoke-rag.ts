/**
 * Smoke test: hits the live Pinecone index with one query and prints the
 * top-5 matches. Verifies the indexer + embed adapter wired up correctly.
 *
 * Usage: pnpm dotenv -e .env.local -- tsx tools/smoke-rag.ts "your query"
 */
import { embedTexts } from "@/lib/ai/rag/embed";
import { hybridQuery } from "@/lib/ai/rag/store";

const query =
  process.argv[2] ?? "cozy reading nook chair for a small apartment";

async function main() {
  console.log(`Query: "${query}"\n`);
  const [vec] = await embedTexts([query], { kind: "query" });
  const matches = await hybridQuery({ vector: vec, topK: 5 });
  for (const m of matches) {
    console.log(
      `  ${m.score.toFixed(4)}  ${m.productId.padEnd(50)}  (${m.chunkType})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
