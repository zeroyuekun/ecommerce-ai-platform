/**
 * QStash worker. Re-indexes one product into Pinecone.
 *
 * verifySignatureAppRouter handles QStash signing-key verification (with
 * key rotation via QSTASH_NEXT_SIGNING_KEY). The worker is idempotent:
 * indexProduct deletes prior chunks before upserting, so QStash retries
 * are safe.
 */
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";
import type { ChunkableProduct } from "@/lib/ai/rag/indexer/chunk";
import { indexProduct } from "@/lib/ai/rag/indexer/index-product";
import { captureException } from "@/lib/monitoring";
import { client as sanityClient } from "@/sanity/lib/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA = z.object({ productId: z.string().min(1) });

const PRODUCT_QUERY = `*[_type == "product" && _id == $id][0]{
  _id, name, slug, description, productType, material, color, dimensions, price, stock, assemblyRequired, isNew,
  "category": category->{ title, slug }
}`;

interface SanityProduct {
  _id: string;
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

function toChunkable(p: SanityProduct): ChunkableProduct {
  return {
    id: p._id,
    name: p.name,
    description: p.description ?? "",
    category: p.category ? { title: p.category.title, slug: p.category.slug.current } : null,
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

async function handler(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }
  const parsed = SCHEMA.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid payload" }), { status: 400 });
  }

  try {
    const product = (await sanityClient.fetch<SanityProduct | null>(PRODUCT_QUERY, {
      id: parsed.data.productId,
    })) ?? null;
    if (!product) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404 });
    }
    const result = await indexProduct(toChunkable(product));
    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200 });
  } catch (err) {
    captureException(err, { extra: { context: "rag-reindex-job", productId: parsed.data.productId } });
    return new Response(JSON.stringify({ error: "reindex failed" }), { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
