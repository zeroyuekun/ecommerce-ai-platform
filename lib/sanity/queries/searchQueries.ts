import { defineQuery } from "next-sanity";

/**
 * Get top popular search queries ordered by count
 */
export const POPULAR_SEARCHES_QUERY = defineQuery(`*[
  _type == "searchQuery"
] | order(count desc) [0...8] {
  _id,
  query,
  count
}`);

/**
 * Find a search query document by its query text
 */
export const SEARCH_QUERY_BY_TEXT_QUERY = defineQuery(`*[
  _type == "searchQuery"
  && query == $searchText
][0] {
  _id,
  query,
  count
}`);
