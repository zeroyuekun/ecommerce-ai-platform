// Hits the /products page (ISR-cached). Target: P95 < 200ms.

import { check, sleep } from "k6";
import http from "k6/http";

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 20,
  duration: "60s",
  thresholds: {
    "http_req_failed{expected_response:true}": ["rate<0.005"],
    http_req_duration: ["p(95)<200"],
  },
};

export default function () {
  const res = http.get(`${BASE}/products`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(0.3 + Math.random() * 0.7);
}
