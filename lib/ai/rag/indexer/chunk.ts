/**
 * Hierarchical product chunker. Per spec §6, a product becomes a small set
 * of typed chunks: a parent anchor + per-facet child chunks (description,
 * specs, care) + N synthetic Q&A children. Each chunk's text always opens
 * with the product name so the embedding has a strong anchor signal even
 * for the most narrow facet chunks.
 */
import type { ChunkMetadata, ChunkType } from "@/lib/ai/rag/store";

export interface ChunkableProduct {
  id: string;
  name: string;
  description: string;
  category: { title: string; slug: string } | null;
  productType: string | null;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  price: number | null;
  stock: number | null;
  assemblyRequired: boolean;
  isNew: boolean;
  inStock: boolean;
  shipsToAu: boolean;
}

export interface SyntheticQa {
  question: string;
  answer: string;
}

export interface RawChunk {
  id: string;
  type: ChunkType;
  text: string;
  metadata: ChunkMetadata;
}

export interface ChunkOptions {
  syntheticQa: SyntheticQa[];
}

function baseMetadata(p: ChunkableProduct, type: ChunkType): ChunkMetadata {
  return {
    product_id: p.id,
    chunk_type: type,
    category_slug: p.category?.slug,
    material: p.material ?? undefined,
    color: p.color ?? undefined,
    price: p.price ?? undefined,
    in_stock: p.inStock,
    ships_to_au: p.shipsToAu,
    is_new: p.isNew,
    assembly_required: p.assemblyRequired,
  };
}

export function chunkProduct(
  p: ChunkableProduct,
  opts: ChunkOptions,
): RawChunk[] {
  const out: RawChunk[] = [];

  out.push({
    id: `${p.id}#parent`,
    type: "parent",
    text: [
      p.name,
      p.category?.title ? `Category: ${p.category.title}` : null,
      p.productType ? `Type: ${p.productType}` : null,
      p.material ? `Material: ${p.material}` : null,
      p.color ? `Color: ${p.color}` : null,
      p.price ? `Price: AUD ${p.price}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    metadata: baseMetadata(p, "parent"),
  });

  if (p.description) {
    out.push({
      id: `${p.id}#description`,
      type: "description",
      text: `${p.name}. ${p.description}`,
      metadata: baseMetadata(p, "description"),
    });
  }

  const specsParts: string[] = [];
  if (p.material) specsParts.push(`Material: ${p.material}`);
  if (p.color) specsParts.push(`Color: ${p.color}`);
  if (p.dimensions) specsParts.push(`Dimensions: ${p.dimensions}`);
  specsParts.push(`Assembly required: ${p.assemblyRequired ? "yes" : "no"}`);
  out.push({
    id: `${p.id}#specs`,
    type: "specs",
    text: `${p.name}. ${specsParts.join(". ")}.`,
    metadata: baseMetadata(p, "specs"),
  });

  out.push({
    id: `${p.id}#care`,
    type: "care",
    text: `${p.name}. Care: spot-clean with a damp cloth; avoid harsh chemicals. ${
      p.assemblyRequired
        ? "Assembly required at delivery."
        : "Arrives fully assembled."
    } Ships across Australia.`,
    metadata: baseMetadata(p, "care"),
  });

  opts.syntheticQa.forEach((qa, i) => {
    out.push({
      id: `${p.id}#qa_${i}`,
      type: "qa",
      text: `${p.name}. Q: ${qa.question} A: ${qa.answer}`,
      metadata: baseMetadata(p, "qa"),
    });
  });

  return out;
}
