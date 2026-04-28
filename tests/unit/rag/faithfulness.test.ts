import { describe, expect, it } from "vitest";
import {
  checkFaithfulnessHeuristic,
  type FaithfulnessCandidate,
} from "@/lib/ai/rag/faithfulness";

const blairChunks: FaithfulnessCandidate[] = [
  {
    id: "c1",
    productId: "product-blair-bedside-table",
    productName: "Blair Bedside Table",
    text: "Blair Bedside Table — solid oak — $399. In stock and ships to Australia.",
    metadata: { in_stock: true, ships_to_au: true },
  },
];

const osakaChunks: FaithfulnessCandidate[] = [
  {
    id: "c2",
    productId: "product-osaka-bedside-table",
    productName: "Osaka Bedside Table",
    text: "Osaka Bedside Table — walnut — minimalist Japandi style.",
    metadata: { in_stock: true, ships_to_au: true },
  },
];

const oakCoffeeChunks: FaithfulnessCandidate[] = [
  {
    id: "c3",
    productId: "p3",
    productName: "Yara Coffee Table",
    text: "Yara Coffee Table — oak — $349. Ships to Australia.",
    metadata: { ships_to_au: true },
  },
];

describe("checkFaithfulnessHeuristic — worked examples", () => {
  it("scores 1.0 when every claim matches a chunk", () => {
    const r = checkFaithfulnessHeuristic({
      query: "oak bedside",
      candidates: blairChunks,
      answer: "The Blair Bedside Table is $399 in oak. It's in stock.",
    });
    expect(r.score).toBe(1);
    expect(r.unsupportedClaims).toHaveLength(0);
    expect(r.totalClaims).toBeGreaterThan(0);
  });

  it("flags a wrong price as unsupported and scores below 1", () => {
    const r = checkFaithfulnessHeuristic({
      query: "oak bedside",
      candidates: blairChunks,
      answer: "The Blair Bedside Table is $499 in oak. It's in stock.",
    });
    expect(r.score).toBeLessThan(1);
    expect(r.unsupportedClaims.some((c) => c.includes("499"))).toBe(true);
  });

  it("scores 1.0 for a pure-style answer with no factual claims (refusal-ish)", () => {
    const r = checkFaithfulnessHeuristic({
      query: "japandi bedroom",
      candidates: osakaChunks,
      answer:
        "I'd suggest the Osaka Bedside in walnut for a calm minimalist vibe.",
    });
    expect(r.score).toBe(1);
    expect(r.totalClaims).toBeGreaterThan(0);
  });

  it("flags a fabricated price as unsupported", () => {
    const r = checkFaithfulnessHeuristic({
      query: "oak coffee tables",
      candidates: oakCoffeeChunks,
      answer:
        "We have several oak coffee tables that ship to Australia from $200.",
    });
    expect(r.score).toBeLessThan(1);
    expect(r.unsupportedClaims.some((c) => c.includes("200"))).toBe(true);
  });

  it("returns score=1 for a refusal with zero claims", () => {
    const r = checkFaithfulnessHeuristic({
      query: "treadmill",
      candidates: [],
      answer: "We don't carry treadmills — Kozy is a furniture house.",
    });
    expect(r.score).toBe(1);
    expect(r.totalClaims).toBe(0);
    expect(r.reasoning).toMatch(/no factual claims/i);
  });
});
