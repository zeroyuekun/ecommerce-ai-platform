// Hits /api/chat with a canned user message. Requires a Clerk test-mode
// session token exported as CLERK_TEST_SESSION. In CI this is a secret.

import { check, sleep } from "k6";
import http from "k6/http";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const SCENARIO = __ENV.SCENARIO || "baseline";
const CLERK_SESSION = __ENV.CLERK_TEST_SESSION;

if (!CLERK_SESSION) {
  throw new Error("CLERK_TEST_SESSION env required for chat load test");
}

const scenarios = {
  baseline: { executor: "constant-vus", vus: 5, duration: "60s" },
  ramp: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "1m", target: 20 },
      { duration: "2m", target: 20 },
      { duration: "30s", target: 0 },
    ],
  },
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  thresholds: {
    "http_req_failed{expected_response:true}": ["rate<0.02"],
    http_req_duration: ["p(95)<3000"],
  },
};

const PROMPTS = [
  "Show me a cozy chair for a small study.",
  "What oak dining tables do you have under $1500?",
  "I need a gift for someone who camps a lot.",
];

export default function () {
  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  const res = http.post(
    `${BASE}/api/chat`,
    JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `__session=${CLERK_SESSION}`,
      },
    },
  );
  check(res, {
    "status 200 or 429": (r) => r.status === 200 || r.status === 429,
  });
  sleep(1 + Math.random() * 2);
}
