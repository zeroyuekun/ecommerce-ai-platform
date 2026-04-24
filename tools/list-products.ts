import { client } from "@/sanity/lib/client";

interface Row {
  _id: string;
  name: string;
  price: number;
  slug: string;
  cat: string | null;
  material: string | null;
  color: string | null;
}

async function main() {
  const rows = await client.fetch<Row[]>(
    `*[_type=="product"]{ _id, name, price, "slug": slug.current, "cat": category->slug.current, material, color } | order(name asc)`,
  );
  for (const r of rows) {
    console.log(
      [
        r._id,
        r.name,
        `$${r.price}`,
        r.cat ?? "-",
        r.material ?? "-",
        r.color ?? "-",
      ].join(" | "),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
