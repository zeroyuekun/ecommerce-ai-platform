/**
 * Dump all products with searchable attributes to stdout JSON.
 * Used once to build eval ground truth.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

async function main() {
  const { defineQuery } = await import("next-sanity");
  const { client } = await import("@/sanity/lib/client");

  const QUERY = defineQuery(`
    *[_type == "product"]{
      _id,
      "slug": slug.current,
      name,
      description,
      price,
      stock,
      material,
      color,
      "category": category->slug.current,
      "categoryTitle": category->title,
      productType,
      dimensions,
      isNew,
      featured
    } | order(name asc)
  `);

  const products = await client.fetch(QUERY);
  process.stdout.write(JSON.stringify(products, null, 2));
}

main().catch((err) => {
  console.error("[dump] FAILED:", err);
  process.exit(1);
});
