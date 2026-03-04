// ============================================
// Product Attribute Constants
// Shared between frontend filters and Sanity schema
// ============================================

export const COLORS = [
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "oak", label: "Oak" },
  { value: "walnut", label: "Walnut" },
  { value: "grey", label: "Grey" },
  { value: "natural", label: "Natural" },
  { value: "beige", label: "Beige" },
  { value: "green", label: "Green" },
  { value: "pink", label: "Pink" },
] as const;

export const MATERIALS = [
  { value: "wood", label: "Wood" },
  { value: "metal", label: "Metal" },
  { value: "fabric", label: "Fabric" },
  { value: "leather", label: "Leather" },
  { value: "glass", label: "Glass" },
] as const;

export const SORT_OPTIONS = [
  { value: "name", label: "Name: A-Z" },
  { value: "name_desc", label: "Name: Z-A" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "relevance", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Highly Rated" },
] as const;

export const PRODUCT_TYPES = [
  { value: "tables", label: "Tables" },
  { value: "chairs", label: "Chairs" },
  { value: "desks", label: "Desks" },
  { value: "beds", label: "Beds" },
  { value: "bedside-tables", label: "Bedside Tables" },
  { value: "drawers", label: "Drawers & Dressers" },
  { value: "shelving", label: "Shelving" },
  { value: "buffets", label: "Buffets & Sideboards" },
  { value: "entertainment-units", label: "Entertainment Units" },
  { value: "wardrobes", label: "Wardrobes" },
  { value: "cots", label: "Cots" },
  { value: "highchairs", label: "Highchairs" },
  { value: "change-tables", label: "Change Tables" },
  { value: "mirrors", label: "Mirrors" },
  { value: "rugs", label: "Rugs" },
  { value: "sofas", label: "Sofas & Armchairs" },
  { value: "ottomans", label: "Ottomans" },
  { value: "barstools", label: "Barstools" },
  { value: "storage", label: "Storage" },
  { value: "decor", label: "Decor" },
] as const;

// Type exports
export type ColorValue = (typeof COLORS)[number]["value"];
export type MaterialValue = (typeof MATERIALS)[number]["value"];
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
export type ProductTypeValue = (typeof PRODUCT_TYPES)[number]["value"];

// ============================================
// Sanity Schema Format Exports
// Format compatible with Sanity's options.list
// ============================================

/** Colors formatted for Sanity schema options.list */
export const COLORS_SANITY_LIST = COLORS.map(({ value, label }) => ({
  title: label,
  value,
}));

/** Materials formatted for Sanity schema options.list */
export const MATERIALS_SANITY_LIST = MATERIALS.map(({ value, label }) => ({
  title: label,
  value,
}));

/** Color values array for zod enums or validation */
export const COLOR_VALUES = COLORS.map((c) => c.value) as [
  ColorValue,
  ...ColorValue[],
];

/** Material values array for zod enums or validation */
export const MATERIAL_VALUES = MATERIALS.map((m) => m.value) as [
  MaterialValue,
  ...MaterialValue[],
];

/** Product types formatted for Sanity schema options.list */
export const PRODUCT_TYPES_SANITY_LIST = PRODUCT_TYPES.map(({ value, label }) => ({
  title: label,
  value,
}));

/** Product type values array for zod enums or validation */
export const PRODUCT_TYPE_VALUES = PRODUCT_TYPES.map((t) => t.value) as [
  ProductTypeValue,
  ...ProductTypeValue[],
];
