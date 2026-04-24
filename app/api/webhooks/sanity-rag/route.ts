/**
 * Sanity → RAG re-index webhook. Validates shared secret, filters to
 * product mutations, and enqueues a reindex job to Upstash QStash. The
 * QStash deduplicationId guarantees we only process each (_id, _rev) once
 * even if Sanity retries the webhook.
 */
import { Client } from "@upstash/qstash";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const SCHEMA = z.object({
  _id: z.string().min(1),
  _rev: z.string().min(1),
  _type: z.string().min(1),
});

let cachedClient: Client | null = null;
function qstash(): Client {
  if (cachedClient) return cachedClient;
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN is not set");
  cachedClient = new Client({ token });
  return cachedClient;
}

function workerUrl(): string {
  const base =
    process.env.RAG_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/jobs/reindex-product`;
}

export async function POST(request: Request) {
  const expected = process.env.SANITY_RAG_WEBHOOK_SECRET;
  if (!expected || request.headers.get("x-sanity-rag-secret") !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const parsed = SCHEMA.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (parsed.data._type !== "product") {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  await qstash().publishJSON({
    url: workerUrl(),
    body: { productId: parsed.data._id },
    deduplicationId: `${parsed.data._id}:${parsed.data._rev}`,
    retries: 5,
  });

  return new Response(JSON.stringify({ ok: true, queued: true }), {
    status: 202,
    headers: { "content-type": "application/json" },
  });
}
