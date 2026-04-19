export interface ProductEmbeddingInput {
  name: string | null;
  description: string | null;
  category: string | null;
  material: string | null;
  color: string | null;
}

export function buildEmbeddingText(input: ProductEmbeddingInput): string {
  return [
    input.name,
    input.description,
    input.category,
    input.material,
    input.color,
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join("\n");
}
