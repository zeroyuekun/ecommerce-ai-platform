import { embedTexts } from "@/lib/ai/rag/embed";
import { hybridQuery } from "@/lib/ai/rag/store";

async function run(label: string, filter?: Record<string, unknown>) {
  const [vec] = await embedTexts(["cozy reading chair"], { kind: "query" });
  // biome-ignore lint/suspicious/noExplicitAny: probing filter shapes
  const out = await hybridQuery({
    vector: vec,
    topK: 3,
    filter: filter as any,
  });
  console.log(label, "→", out.length, "matches");
  for (const m of out.slice(0, 2)) {
    console.log(`   ${m.productId}  (${m.chunkType})`);
  }
}

async function main() {
  await run("no filter");
  await run("ships_to_au:true", { ships_to_au: { $eq: true } });
  await run("in_stock:true", { in_stock: { $eq: true } });
  await run("category=living-room", { category_slug: { $eq: "living-room" } });
  await run("ships+color=oak", {
    ships_to_au: { $eq: true },
    color: { $eq: "oak" },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
