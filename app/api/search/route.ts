import { NextResponse } from "next/server";
import { z } from "zod";
import { searchRateLimiter } from "@/lib/ai/rate-limit";
import { SEARCH_PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products-by-ids";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";
import { client } from "@/sanity/lib/client";

export const runtime = "nodejs";

const searchParamsSchema = z.object({
  q: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  topK: z.coerce.number().int().min(1).max(50).optional().default(20),
});

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = searchParamsSchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }
  const { q, category, minPrice, maxPrice, topK } = parsed.data;

  const { ok, retryAfter } = await searchRateLimiter.check(clientIp(req));
  if (!ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const start = performance.now();
  try {
    const vector = await embedText(q);
    const index = getSearchIndex();
    const results = await index.query(vector, {
      topK,
      filter: {
        ...(category ? { category } : {}),
        ...(typeof minPrice === "number" ? { minPrice } : {}),
        ...(typeof maxPrice === "number" ? { maxPrice } : {}),
      },
    });

    const ids = results.map((r) => r.id);
    let products: Array<Record<string, unknown> & { _id: string }> = [];
    if (ids.length > 0) {
      const hydrated = (await client.fetch(SEARCH_PRODUCTS_BY_IDS_QUERY, {
        ids,
      })) as Array<Record<string, unknown> & { _id: string }>;
      const byId = new Map(hydrated.map((p) => [p._id, p]));
      products = ids
        .map((id) => byId.get(id))
        .filter((p): p is (typeof hydrated)[number] => Boolean(p));
    }

    const latencyMs = Math.round(performance.now() - start);
    return NextResponse.json({
      results: products,
      method: "semantic",
      latencyMs,
      backend: index.backend,
    });
  } catch (err) {
    console.error("[search] FAILED:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
