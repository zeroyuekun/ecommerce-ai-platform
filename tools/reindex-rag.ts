#!/usr/bin/env tsx
/**
 * Bulk re-index CLI. Pulls every product from Sanity, runs the indexer
 * end-to-end, and prints a per-product status line.
 *
 * Phase 1: dense-only (sparse encoding deferred to Phase 1.5).
 *
 * Usage:
 *   pnpm reindex:rag                # all products
 *   pnpm reindex:rag --slug=foo-bar # single product by slug
 *   pnpm reindex:rag --since=2026-04-01  # touched since date
 */
import "dotenv/config";
import type { ChunkableProduct } from "@/lib/ai/rag/indexer/chunk";
import { indexProduct } from "@/lib/ai/rag/indexer/index-product";
import { client } from "@/sanity/lib/client";

interface SanityProduct {
  _id: string;
  _updatedAt: string;
  name: string;
  slug: { current: string };
  description: string;
  category: { title: string; slug: { current: string } } | null;
  productType: string | null;
  material: string | null;
  color: string | null;
  dimensions: string | null;
  price: number | null;
  stock: number | null;
  assemblyRequired: boolean | null;
  isNew: boolean | null;
}

const QUERY = `*[_type == "product" $extra]{
  _id, _updatedAt, name, slug, description, productType, material, color, dimensions, price, stock, assemblyRequired, isNew,
  "category": category->{ title, slug }
}`;

interface CliArgs {
  slug?: string;
  since?: string;
}

function buildExtras(args: CliArgs): string {
  const parts: string[] = [];
  if (args.slug) parts.push(`&& slug.current == "${args.slug}"`);
  if (args.since) parts.push(`&& _updatedAt >= "${args.since}"`);
  return parts.join(" ");
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--slug=")) args.slug = arg.slice("--slug=".length);
    if (arg.startsWith("--since=")) args.since = arg.slice("--since=".length);
  }
  return args;
}

function toChunkable(p: SanityProduct): ChunkableProduct {
  return {
    id: p._id,
    name: p.name,
    description: p.description ?? "",
    category: p.category
      ? { title: p.category.title, slug: p.category.slug.current }
      : null,
    productType: p.productType,
    material: p.material,
    color: p.color,
    dimensions: p.dimensions,
    price: p.price,
    stock: p.stock,
    assemblyRequired: !!p.assemblyRequired,
    isNew: !!p.isNew,
    inStock: (p.stock ?? 0) > 0,
    shipsToAu: true,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const extra = buildExtras(args);
  const query = QUERY.replace("$extra", extra);
  const products = (await client.fetch<SanityProduct[]>(query)) ?? [];
  console.log(`[reindex] fetched ${products.length} product(s)`);

  if (products.length === 0) {
    console.log("[reindex] nothing to do");
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const p of products) {
    try {
      const result = await indexProduct(toChunkable(p));
      console.log(
        `[reindex] ✓ ${p.slug.current} → ${result.chunksIndexed} chunks`,
      );
      ok += 1;
    } catch (err) {
      console.error(
        `[reindex] ✗ ${p.slug.current}:`,
        err instanceof Error ? err.message : err,
      );
      fail += 1;
    }
  }
  console.log(`[reindex] done. ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[reindex] fatal:", err);
  process.exit(1);
});
