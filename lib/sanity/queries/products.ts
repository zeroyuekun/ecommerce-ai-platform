import { defineQuery } from "next-sanity";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants/stock";

// ============================================
// Shared Query Fragments (DRY)
// ============================================

/** Common filter conditions for product filtering */
const PRODUCT_FILTER_CONDITIONS = `
  _type == "product"
  && (count($categorySlugs) == 0 || ("sale" in $categorySlugs && defined(salePrice)) || ("new" in $categorySlugs && isNew == true) || category->slug.current in $categorySlugs)
  && (count($productTypes) == 0 || productType in $productTypes)
  && (count($colors) == 0 || color in $colors)
  && (count($materials) == 0 || material in $materials)
  && ($minPrice == 0 || coalesce(salePrice, price) >= $minPrice)
  && ($maxPrice == 0 || coalesce(salePrice, price) <= $maxPrice)
  && ($searchQuery == "" || name match $searchQuery + "*" || description match $searchQuery + "*")
  && ($inStock == false || stock > 0)
`;

/** Projection for filtered product lists (includes multiple images for hover) */
const FILTERED_PRODUCT_PROJECTION = `{
  _id,
  name,
  "slug": slug.current,
  price,
  salePrice,
  "images": images[0...4]{
    _key,
    asset->{
      _id,
      url,
      metadata { lqip }
    }
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  stock,
  isNew,
  variantGroup
}`;

/** Scoring for relevance-based search */
const RELEVANCE_SCORE = `score(
  boost(name match $searchQuery + "*", 3),
  boost(description match $searchQuery + "*", 1)
)`;

// ============================================
// All Products Query
// ============================================

/**
 * Get all products with category expanded
 * Used on landing page
 */
export const ALL_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
] | order(name asc) {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  "images": images[]{
    _key,
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);

/**
 * Get featured products for homepage carousel
 */
export const FEATURED_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && featured == true
  && stock > 0
] | order(name asc) [0...6] {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  "images": images[]{
    _key,
    asset->{
      _id,
      url,
      metadata { lqip }
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  stock
}`);

/**
 * Get products for the style gallery grid (14 products with images)
 */
export const GALLERY_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && defined(images)
  && count(images) > 0
  && stock > 0
] | order(_createdAt desc) [0...14] {
  _id,
  name,
  "slug": slug.current,
  "image": images[0]{
    asset->{
      _id,
      url,
      metadata { lqip }
    }
  }
}`);

/**
 * Get best seller products for homepage carousel (8 products)
 */
export const BEST_SELLERS_QUERY = defineQuery(`*[
  _type == "product"
  && stock > 0
] | order(stock asc, name asc) [0...8] ${FILTERED_PRODUCT_PROJECTION}`);

/**
 * Get products by category slug
 */
export const PRODUCTS_BY_CATEGORY_QUERY = defineQuery(`*[
  _type == "product"
  && category->slug.current == $categorySlug
] | order(name asc) {
  _id,
  name,
  "slug": slug.current,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  stock
}`);

/**
 * Get single product by slug
 * Used on product detail page
 */
export const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[
  _type == "product"
  && slug.current == $slug
][0] {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  salePrice,
  "images": images[]{
    _key,
    asset->{
      _id,
      url,
      metadata { lqip }
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  variantGroup,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);

/**
 * Get color variant siblings for a product (minimal, for swatch display)
 */
export const VARIANT_SIBLINGS_QUERY = defineQuery(`*[
  _type == "product"
  && variantGroup == $variantGroup
  && defined(variantGroup)
  && variantGroup != ""
] | order(name asc) {
  _id,
  "slug": slug.current,
  color,
  "image": images[0]{
    asset->{
      url
    }
  }
}`);

/**
 * Get full variant siblings for client-side variant switching (no page reload)
 */
export const VARIANT_SIBLINGS_FULL_QUERY = defineQuery(`*[
  _type == "product"
  && variantGroup == $variantGroup
  && defined(variantGroup)
  && variantGroup != ""
] | order(name asc) {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  salePrice,
  "images": images[]{
    _key,
    asset->{
      _id,
      url,
      metadata { lqip }
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);

// ============================================
// Search & Filter Queries (Server-Side)
// Uses GROQ score() for relevance ranking
// ============================================

/**
 * Search products with relevance scoring
 * Uses score() + boost() for better ranking
 * Orders by relevance score descending
 */
export const SEARCH_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && (
    name match $searchQuery + "*"
    || description match $searchQuery + "*"
  )
] | score(
  boost(name match $searchQuery + "*", 3),
  boost(description match $searchQuery + "*", 1)
) | order(_score desc) {
  _id,
  _score,
  name,
  "slug": slug.current,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  stock
}`);

/**
 * Filter products - featured (default sort by name A-Z)
 */
export const FILTER_PRODUCTS_BY_NAME_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(name asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - alphabetical Z-A
 */
export const FILTER_PRODUCTS_BY_NAME_DESC_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(name desc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - newest first
 */
export const FILTER_PRODUCTS_BY_NEWEST_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(_createdAt desc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by price ascending
 */
export const FILTER_PRODUCTS_BY_PRICE_ASC_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(price asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by price descending
 */
export const FILTER_PRODUCTS_BY_PRICE_DESC_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(price desc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - best selling (lowest stock = most sold)
 */
export const FILTER_PRODUCTS_BY_BEST_SELLING_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(stock asc, name asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by relevance (when searching)
 */
export const FILTER_PRODUCTS_BY_RELEVANCE_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | ${RELEVANCE_SCORE} | order(_score desc, name asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Get products by IDs (for cart/checkout)
 */
export const PRODUCTS_BY_IDS_QUERY = defineQuery(`*[
  _type == "product"
  && _id in $ids
] {
  _id,
  name,
  "slug": slug.current,
  price,
  salePrice,
  "image": images[0]{
    asset->{
      _id,
      url
    },
    hotspot
  },
  stock
}`);

/**
 * Get products by IDs with full card projection (for recently viewed)
 */
export const PRODUCTS_BY_IDS_FULL_QUERY = defineQuery(
  `*[_type == "product" && _id in $ids] ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Get popular products for "Have You Seen This?" section
 * Uses a mix of featured + best-selling, limited to 8
 */
export const POPULAR_PRODUCTS_QUERY = defineQuery(
  `*[_type == "product" && stock > 0 && defined(images) && count(images) > 0] | order(featured desc, stock asc, _createdAt desc) [0...8] ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Get low stock products (admin)
 * Uses LOW_STOCK_THRESHOLD constant for consistency
 */
export const LOW_STOCK_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && stock > 0
  && stock <= ${LOW_STOCK_THRESHOLD}
] | order(stock asc) {
  _id,
  name,
  "slug": slug.current,
  stock,
  "image": images[0]{
    asset->{
      _id,
      url
    }
  }
}`);

/**
 * Get related products from the same category (excluding current product)
 */
export const RELATED_PRODUCTS_QUERY = defineQuery(
  `*[
  _type == "product"
  && category->slug.current == $categorySlug
  && slug.current != $currentSlug
  && stock > 0
] | order(name asc) [0...4] ${FILTERED_PRODUCT_PROJECTION}`,
);

/**
 * Get out of stock products (admin)
 */
export const OUT_OF_STOCK_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && stock == 0
] | order(name asc) {
  _id,
  name,
  "slug": slug.current,
  "image": images[0]{
    asset->{
      _id,
      url
    }
  }
}`);

// ============================================
// AI Shopping Assistant Query
// Uses score() + boost() with all filters for AI agent
// ============================================

/**
 * Search products for AI shopping assistant
 * Full-featured search with all filters and product details
 */
export const AI_SEARCH_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product"
  && (
    $searchQuery == ""
    || name match $searchQuery + "*"
    || description match $searchQuery + "*"
    || category->title match $searchQuery + "*"
  )
  && ($categorySlug == "" || category->slug.current == $categorySlug)
  && ($material == "" || material == $material)
  && ($color == "" || color == $color)
  && ($minPrice == 0 || price >= $minPrice)
  && ($maxPrice == 0 || price <= $maxPrice)
] | order(name asc) [0...20] {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    }
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);
