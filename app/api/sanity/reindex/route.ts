import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { PRODUCT_FOR_INDEXING_QUERY } from "@/lib/sanity/queries/product-for-indexing";
import { deleteProduct, upsertProduct } from "@/lib/search/index";
import { client } from "@/sanity/lib/client";

export const runtime = "nodejs";

interface SanityWebhookPayload {
  _id: string;
  _type: string;
  operation: "create" | "update" | "delete";
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return constantTimeEqual(expected, signature);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("sanity-webhook-signature");

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SanityWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload._type !== "product") {
    return NextResponse.json({ received: true, skipped: "non-product" });
  }

  try {
    if (payload.operation === "delete") {
      await deleteProduct(payload._id);
      return NextResponse.json({
        received: true,
        action: "deleted",
        id: payload._id,
      });
    }

    const product = await client.fetch(PRODUCT_FOR_INDEXING_QUERY, {
      id: payload._id,
    });
    if (!product) {
      await deleteProduct(payload._id);
      return NextResponse.json({
        received: true,
        action: "deleted-missing",
        id: payload._id,
      });
    }

    if (!product.slug) {
      return NextResponse.json({
        received: true,
        action: "skipped-no-slug",
        id: payload._id,
      });
    }

    await upsertProduct({
      ...product,
      slug: product.slug,
      price: product.price ?? 0,
      stock: product.stock ?? 0,
    });
    return NextResponse.json({
      received: true,
      action: "upserted",
      id: payload._id,
    });
  } catch (err) {
    console.error("[reindex] FAILED:", err);
    return NextResponse.json(
      { error: "Reindex failed", id: payload._id },
      { status: 500 },
    );
  }
}
