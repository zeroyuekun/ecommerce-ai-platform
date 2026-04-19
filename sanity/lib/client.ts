import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

// Read-only client (for fetching data).
// CDN is safe for published reads; freshness is handled by Next.js cache + revalidation tags.
// Bypasses CDN automatically when a token is attached (e.g., draft-mode previews).
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});

// Write client (for mutations - used in webhooks/server actions)
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
});
