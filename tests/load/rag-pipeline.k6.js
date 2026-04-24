/**
 * k6 load profile for the RAG pipeline.
 * Targets per spec §10:
 *   p95 first-token < 2.0 s, error rate < 0.5%, $/query ≤ $0.02 (tracked separately).
 *
 * Run locally:
 *   k6 run --env BASE_URL=https://your-preview.vercel.app --env CLERK_TOKEN=... tests/load/rag-pipeline.k6.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    sustained: {
      executor: "constant-vus",
      vus: 100,
      duration: "10m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.005"],
    http_req_duration: ["p(95)<2000"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.CLERK_TOKEN || "";

const queries = [
  "cozy reading nook chair",
  "minimalist Japandi sofa for a small apartment",
  "oak coffee table under $400",
  "walnut bedside table with drawers",
  "outdoor dining set for 6 in teak",
  "industrial bookshelf for a home office",
];

export default function () {
  const q = queries[Math.floor(Math.random() * queries.length)];
  const res = http.post(
    `${BASE}/api/chat`,
    JSON.stringify({
      messages: [{ id: `m-${__VU}-${__ITER}`, role: "user", content: q }],
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
      },
      timeout: "30s",
    },
  );
  check(res, {
    "status 200": (r) => r.status === 200,
  });
  sleep(Math.random() * 2 + 1);
}
