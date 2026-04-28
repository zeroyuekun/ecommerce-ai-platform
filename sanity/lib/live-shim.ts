/**
 * Node-compatible shim for sanity/lib/live.
 *
 * `next-sanity/live` (defineLive) requires a React Server Component runtime
 * and throws in plain Node / tsx. The eval harness and other CLI tools that
 * import code paths via buildAgentConfig (which pulls in add-to-cart,
 * filter-search, etc.) need a compatible sanityFetch that works in Node.
 *
 * This shim uses the plain Sanity client with no Live Content API — identical
 * to a cold cache fetch, which is fine for eval / CLI purposes.
 */
import { client } from "./client";

type SanityFetchOptions<Q extends string> = {
  query: Q;
  params?: Record<string, unknown>;
  perspective?: "published" | "drafts" | "raw";
  stega?: boolean;
};

export async function sanityFetch<Q extends string, R = unknown>({
  query,
  params = {},
}: SanityFetchOptions<Q>): Promise<{ data: R }> {
  const data = await client.fetch<R>(query, params);
  return { data };
}

/** No-op component placeholder — never rendered in CLI context. */
export const SanityLive = () => null;
