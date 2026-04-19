import { describe, expect, it } from "vitest";
import { buildEmbeddingText } from "@/lib/search/text";

describe("buildEmbeddingText", () => {
  it("concatenates core product fields separated by newlines", () => {
    const text = buildEmbeddingText({
      name: "Oakwood Dining Table",
      description: "Solid oak, seats 6, natural finish.",
      category: "Dining Room",
      material: "wood",
      color: "oak",
    });
    expect(text).toBe(
      "Oakwood Dining Table\nSolid oak, seats 6, natural finish.\nDining Room\nwood\noak",
    );
  });

  it("omits missing fields without leaving blank lines", () => {
    const text = buildEmbeddingText({
      name: "Floor Lamp",
      description: null,
      category: "Lighting",
      material: null,
      color: "black",
    });
    expect(text).toBe("Floor Lamp\nLighting\nblack");
  });

  it("returns an empty string when all fields are missing", () => {
    expect(
      buildEmbeddingText({
        name: null,
        description: null,
        category: null,
        material: null,
        color: null,
      }),
    ).toBe("");
  });
});
