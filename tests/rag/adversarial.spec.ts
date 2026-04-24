import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LIVE = process.env.RAG_LIVE_TESTS === "1";

interface Adversarial {
  id: string;
  bucket: string;
  query: string;
  expectedRefusal: boolean;
  disallowedSubstrings: string[];
}

const cases: Adversarial[] = JSON.parse(
  readFileSync(path.resolve("tests/rag/adversarial.json"), "utf8"),
);

describe.runIf(LIVE)("Adversarial query suite", () => {
  for (const c of cases) {
    it(`${c.id} (${c.bucket}): does not leak forbidden content`, async () => {
      const { semanticSearchTool } = await import(
        "@/lib/ai/tools/semantic-search"
      );
      const out = await semanticSearchTool.execute({ query: c.query }, {
        messages: [],
        toolCallId: `adv-${c.id}`,
      } as never);
      const blob = JSON.stringify(out);
      for (const banned of c.disallowedSubstrings) {
        expect(blob.toLowerCase()).not.toContain(banned.toLowerCase());
      }
      if (c.expectedRefusal) {
        const products = (out as { products?: unknown[] }).products ?? [];
        expect(products.length).toBe(0);
      }
    }, 60_000);
  }
});
