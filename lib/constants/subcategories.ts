export const subcategoriesMap: Record<string, { label: string; query: string; type?: string }[]> = {
  "living-room": [
    { label: "Sofas & Sectionals", query: "sofa", type: "sofas" },
    { label: "Coffee Tables", query: "coffee table", type: "tables" },
    { label: "Accent Chairs", query: "accent chair", type: "chairs" },
    { label: "TV Stands & Media", query: "tv stand", type: "entertainment-units" },
    { label: "Side Tables", query: "side table", type: "tables" },
    { label: "Bookshelves", query: "bookshelf", type: "shelving" },
  ],
  "dining-room": [
    { label: "Dining Tables", query: "dining table", type: "tables" },
    { label: "Dining Chairs", query: "dining chair", type: "chairs" },
    { label: "Bar Stools", query: "bar stool" },
    { label: "Sideboards & Buffets", query: "sideboard", type: "buffets" },
    { label: "Dining Sets", query: "dining set" },
    { label: "Benches", query: "bench" },
  ],
  "bedroom": [
    { label: "Beds & Frames", query: "", type: "beds" },
    { label: "Bedside Tables", query: "", type: "bedside-tables" },
    { label: "Wardrobes", query: "wardrobe" },
    { label: "Dressers", query: "", type: "drawers" },
    { label: "Mattresses", query: "mattress" },
    { label: "Mirrors", query: "", type: "mirrors" },
  ],
  "baby": [
    { label: "Cots & Cribs", query: "", type: "cots" },
    { label: "Changing Tables", query: "changing table" },
    { label: "Nursery Chairs", query: "nursery chair", type: "chairs" },
    { label: "Storage & Shelving", query: "", type: "storage" },
    { label: "Baby Dressers", query: "", type: "drawers" },
  ],
  "kids": [
    { label: "Kids Beds", query: "", type: "beds" },
    { label: "Desks & Chairs", query: "", type: "desks" },
    { label: "Bunk Beds", query: "bunk bed", type: "beds" },
    { label: "Toy Storage", query: "toy storage", type: "storage" },
    { label: "Bookshelves", query: "", type: "shelving" },
  ],
  "youth": [
    { label: "Teen Beds", query: "", type: "beds" },
    { label: "Study Desks", query: "", type: "desks" },
    { label: "Lounge Seating", query: "lounge", type: "sofas" },
    { label: "Shelving & Storage", query: "", type: "shelving" },
    { label: "Wardrobes", query: "wardrobe" },
  ],
  "outdoor": [
    { label: "Outdoor Lounges", query: "outdoor lounge", type: "sofas" },
    { label: "Dining Sets", query: "outdoor dining" },
    { label: "Garden Chairs", query: "garden chair", type: "chairs" },
    { label: "Patio Tables", query: "patio table", type: "tables" },
    { label: "Sun Loungers", query: "sun lounger" },
    { label: "Parasols & Shade", query: "parasol" },
  ],
  "lighting-decor": [
    { label: "Table Lamps", query: "table lamp" },
    { label: "Floor Lamps", query: "floor lamp" },
    { label: "Pendant Lights", query: "pendant" },
    { label: "Wall Art", query: "wall art" },
    { label: "Candles & Holders", query: "candle" },
    { label: "Vases & Planters", query: "vase" },
  ],
  "office-storage": [
    { label: "Office Desks", query: "", type: "desks" },
    { label: "Office Chairs", query: "", type: "chairs" },
    { label: "Filing Cabinets", query: "filing cabinet" },
    { label: "Shelving Units", query: "", type: "shelving" },
    { label: "Storage Boxes", query: "storage box", type: "storage" },
    { label: "Desk Accessories", query: "desk accessories" },
  ],
  "furniture-sets": [
    { label: "Living Room Sets", query: "living room set" },
    { label: "Bedroom Sets", query: "bedroom set" },
    { label: "Dining Sets", query: "dining set" },
    { label: "Office Sets", query: "office set" },
    { label: "Outdoor Sets", query: "outdoor set" },
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
