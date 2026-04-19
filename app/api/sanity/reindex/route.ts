import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface SanityWebhookPayload {
  _id: string;
  _type: string;
  operation: "create" | "update" | "delete";
  slug?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
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

  return NextResponse.json({ received: true, id: payload._id });
}
