import {
  haikuUnderstandingFn,
  understandQuery,
} from "@/lib/ai/rag/query/understand";

async function run(query: string) {
  console.log(`\nQuery: "${query}"`);
  const u = await understandQuery({
    query,
    history: [],
    understandingFn: haikuUnderstandingFn,
  });
  console.log(`  rewritten: ${u.rewritten}`);
  console.log(`  filters:   ${JSON.stringify(u.filters)}`);
  console.log(`  hyde:      ${u.hyde ? u.hyde.slice(0, 80) + "..." : "null"}`);
}

async function main() {
  await run("show me a cozy reading chair");
  await run("oak coffee table under $400");
  await run("minimalist Japandi sofa for a small apartment");
  await run("do you sell mattresses");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
