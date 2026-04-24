/**
 * Cold-start probe — fires every 4 minutes via Vercel Cron to keep the
 * Pinecone Serverless namespace warm (per spec §10). Issues a synthetic
 * popular query against the index. Cheap; eliminates worst-case
 * cold-start latency.
 */
import { embedTexts } from "@/lib/ai/rag/embed";
import { isRagEnabled } from "@/lib/ai/rag/flags";
import { hybridQuery } from "@/lib/ai/rag/store";

export const runtime = "nodejs";
export const maxDuration = 30;

const QUERIES = ["sofa", "coffee table", "bedside table", "dining chair"];

export async function GET() {
  if (!isRagEnabled()) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
    });
  }
  const q = QUERIES[Math.floor(Date.now() / 60_000) % QUERIES.length];
  try {
    const vec = await embedTexts([q], { kind: "query" });
    await hybridQuery({ vector: vec[0], topK: 5 });
    return new Response(JSON.stringify({ ok: true, query: q }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500 },
    );
  }
}
