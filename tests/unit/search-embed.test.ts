import { describe, expect, it, vi } from "vitest";

const embedMany = vi.fn();

vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: (...args: unknown[]) => embedMany(...args),
}));

vi.mock("@/lib/search/embed", async (importOriginal) => {
  return await importOriginal();
});

describe("embedBatch", () => {
  it("returns embeddings for a batch of texts", async () => {
    embedMany.mockResolvedValueOnce({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });
    const { embedBatch } = await import("@/lib/search/embed");
    const result = await embedBatch(["hello", "world"]);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(embedMany).toHaveBeenCalledOnce();
  });

  it("returns an empty array for empty input without calling the gateway", async () => {
    embedMany.mockClear();
    const { embedBatch } = await import("@/lib/search/embed");
    const result = await embedBatch([]);
    expect(result).toEqual([]);
    expect(embedMany).not.toHaveBeenCalled();
  });
});
