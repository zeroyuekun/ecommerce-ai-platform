import { defineQuery } from "next-sanity";

/**
 * Get all categories
 * Used for navigation and filters
 */
export const ALL_CATEGORIES_QUERY = defineQuery(`*[
  _type == "category"
] | order(title asc) {
  _id,
  title,
  "slug": slug.current,
  "image": *[_type == "product" && category._ref == ^._id && defined(images[0])][0].images[0]{
    asset->{
      _id,
      url
    }
  }
}`);
