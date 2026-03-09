"use server";

import { client, writeClient } from "@/sanity/lib/client";
import {
  POPULAR_SEARCHES_QUERY,
  SEARCH_QUERY_BY_TEXT_QUERY,
} from "@/lib/sanity/queries/searchQueries";

/**
 * Record a search query — creates or increments count
 */
export async function recordSearch(rawQuery: string) {
  const query = rawQuery.toLowerCase().trim();
  if (!query || query.length < 2) return;

  try {
    const existing = await client.fetch(SEARCH_QUERY_BY_TEXT_QUERY, { searchText: query });

    if (existing) {
      await writeClient
        .patch(existing._id)
        .inc({ count: 1 })
        .commit();
    } else {
      await writeClient.create({
        _type: "searchQuery",
        query,
        count: 1,
      });
    }
  } catch (error) {
    // Silently fail — search tracking should never block the user
    console.error("Failed to record search:", error);
  }
}

/**
 * Fetch top popular searches
 */
export async function getPopularSearches(): Promise<
  { query: string; count: number }[]
> {
  try {
    const results = await client.fetch(POPULAR_SEARCHES_QUERY);
    return (results ?? []).map((r) => ({ query: r.query, count: r.count ?? 0 }));
  } catch (error) {
    console.error("Failed to fetch popular searches:", error);
    return [];
  }
}
