export const subcategoriesMap: Record<string, { label: string; query: string; type?: string }[]> = {
  "living-room": [
    { label: "Sofas & Sectionals", query: "", type: "sofas" },
    { label: "Coffee & Side Tables", query: "", type: "tables" },
    { label: "Entertainment Units", query: "", type: "entertainment-units" },
    { label: "Bookshelves & Shelving", query: "", type: "shelving" },
    { label: "Sideboards & Buffets", query: "", type: "buffets" },
  ],
  "dining-room": [
    { label: "Dining Tables", query: "", type: "tables" },
    { label: "Dining Chairs", query: "", type: "chairs" },
  ],
  "bedroom": [
    { label: "Beds & Frames", query: "", type: "beds" },
    { label: "Bedside Tables", query: "", type: "bedside-tables" },
    { label: "Dressers & Drawers", query: "", type: "drawers" },
    { label: "Desks & Vanities", query: "", type: "desks" },
  ],
  "baby": [
    { label: "Cots & Cribs", query: "", type: "cots" },
    { label: "Highchairs", query: "", type: "highchairs" },
  ],
  "kids": [
    { label: "Kids Beds", query: "", type: "beds" },
    { label: "Desks & Chairs", query: "", type: "desks" },
    { label: "Toy Storage", query: "", type: "storage" },
  ],
  "youth": [
    { label: "Teen Beds", query: "", type: "beds" },
    { label: "Bedside Tables", query: "", type: "bedside-tables" },
  ],
  "outdoor": [
    { label: "Outdoor Seating", query: "", type: "sofas" },
    { label: "Outdoor Tables", query: "", type: "tables" },
  ],
  "office-storage": [
    { label: "Office Desks", query: "", type: "desks" },
    { label: "Office Chairs", query: "", type: "chairs" },
    { label: "Shelving Units", query: "", type: "shelving" },
  ],
  "lighting-decor": [
    { label: "Mirrors", query: "", type: "mirrors" },
  ],
  "furniture-sets": [
    { label: "Table Sets", query: "", type: "tables" },
    { label: "Storage Sets", query: "", type: "storage" },
  ],
};

/**
 * Find a subcategory label by matching the type or query param against a category's subcategories
 */
export function getSubcategoryLabel(categorySlug: string, query: string, type?: string): string | null {
  const subs = subcategoriesMap[categorySlug];
  if (!subs) return null;
  if (type) {
    const match = subs.find((s) => s.type === type);
    if (match) return match.label;
  }
  if (query) {
    const match = subs.find((s) => s.query.toLowerCase() === query.toLowerCase());
    return match?.label ?? null;
  }
  return null;
}
