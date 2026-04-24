import { describe, expect, it, vi } from "vitest";
import {
  generateSyntheticQa,
  type QaGenerator,
} from "@/lib/ai/rag/indexer/synthetic-qa";

const baseProduct = {
  name: "Nordic Grey 3-Seater Sofa",
  description: "Scandinavian sofa with oak legs and grey upholstery.",
  category: "Living Room",
  material: "fabric",
};

describe("generateSyntheticQa", () => {
  it("returns the generator's output unchanged when valid", async () => {
    const gen: QaGenerator = vi.fn(async () => [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]);
    const out = await generateSyntheticQa(baseProduct, {
      count: 5,
      generator: gen,
    });
    expect(out).toEqual([
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ]);
    expect(gen).toHaveBeenCalledWith(
      expect.objectContaining({ product: baseProduct, count: 5 }),
    );
  });

  it("returns [] gracefully if the generator throws", async () => {
    const gen: QaGenerator = vi.fn(async () => {
      throw new Error("haiku 503");
    });
    const out = await generateSyntheticQa(baseProduct, {
      count: 5,
      generator: gen,
    });
    expect(out).toEqual([]);
  });

  it("clamps count to [1, 10]", async () => {
    const gen: QaGenerator = vi.fn(async ({ count }) =>
      Array.from({ length: count }, (_, i) => ({
        question: `q${i}`,
        answer: `a${i}`,
      })),
    );
    await generateSyntheticQa(baseProduct, { count: 0, generator: gen });
    expect(gen).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    await generateSyntheticQa(baseProduct, { count: 99, generator: gen });
    expect(gen).toHaveBeenCalledWith(expect.objectContaining({ count: 10 }));
  });
});
