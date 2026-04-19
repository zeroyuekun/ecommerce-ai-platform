import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const SCENARIO = __ENV.SCENARIO || "baseline";

const QUERIES = [
  "cozy nook for a studio apartment",
  "mid-century feel for the living room",
  "oak dining table",
  "leather sofa for families",
  "kids' room that'll last",
  "storage for a tidy entryway",
  "something for a small balcony",
  "reading chair for a quiet corner",
  "compact home office",
  "statement piece for a hallway",
];

const scenarios = {
  baseline: {
    executor: "constant-vus",
    vus: 10,
    duration: "60s",
  },
  ramp: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "2m", target: 100 },
      { duration: "2m", target: 100 },
      { duration: "30s", target: 0 },
    ],
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "10s", target: 10 },
      { duration: "30s", target: 200 },
      { duration: "10s", target: 10 },
    ],
  },
};

export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO],
  },
  thresholds: {
    "http_req_failed{expected_response:true}": ["rate<0.01"],
    http_req_duration: [
      SCENARIO === "spike" ? "p(95)<1500" : "p(95)<500",
    ],
  },
};

export default function () {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const url = `${BASE}/api/search?q=${encodeURIComponent(q)}`;
  const res = http.get(url);

  check(res, {
    "status is 200 or 429": (r) => r.status === 200 || r.status === 429,
    "has body": (r) => r.body && r.body.length > 0,
  });

  sleep(0.2 + Math.random() * 0.8);
}
