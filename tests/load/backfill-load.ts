// Node/tsx script (name keeps load/ folder cohesive even though this isn't k6).
// Runs the backfill against N synthetic products and prints timing + cost.
import "dotenv/config";
import { embedBatch } from "@/lib/search/embed";
import { getSearchIndex, type IndexRecord } from "@/lib/search/index";

const N = Number(process.env.BACKFILL_N ?? 1000);
const BATCH = 50;

function synthetic(i: number): IndexRecord & { text: string } {
  const categories = ["dining", "living", "bedroom", "office", "outdoor"];
  const materials = ["wood", "metal", "fabric", "leather"];
  const name = `Synthetic Product ${i}`;
  const description = `A ${materials[i % materials.length]} piece for the ${categories[i % categories.length]} room, model ${i}.`;
  return {
    id: `synth-${i}`,
    vector: [],
    text: `${name}\n${description}`,
    metadata: {
      _id: `synth-${i}`,
      slug: `synth-${i}`,
      name,
      category: categories[i % categories.length],
      price: 100 + (i % 20) * 50,
      stock: (i % 10) + 1,
    },
  };
}

async function main() {
  console.log(`[backfill-load] seeding ${N} synthetic products`);
  const start = Date.now();
  const index = getSearchIndex();
  console.log(`[backfill-load] backend: ${index.backend}`);

  const items = Array.from({ length: N }, (_, i) => synthetic(i));
  let indexed = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const vectors = await embedBatch(slice.map((s) => s.text));
    const records: IndexRecord[] = slice.map((s, k) => ({
      id: s.id,
      vector: vectors[k],
      metadata: s.metadata,
    }));
    await index.upsert(records);
    indexed += records.length;
    if ((i / BATCH) % 4 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[backfill-load] ${indexed}/${N} in ${elapsed}s`);
    }
  }

  const totalSec = ((Date.now() - start) / 1000).toFixed(1);
  const approxTokens = N * 20;
  const approxCost = (approxTokens / 1_000_000) * 0.02;
  console.log(`[backfill-load] done: ${N} products in ${totalSec}s`);
  console.log(`[backfill-load] approx embed cost: $${approxCost.toFixed(4)}`);

  console.log("[backfill-load] cleaning up synthetic products");
  for (const item of items) {
    await index.delete(item.id);
  }
  console.log("[backfill-load] cleanup done");
}

main().catch((err) => {
  console.error("[backfill-load] crashed:", err);
  process.exit(1);
});
