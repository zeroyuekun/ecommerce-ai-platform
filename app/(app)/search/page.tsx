import Link from "next/link";
import { Suspense } from "react";
import { SEARCH_PRODUCTS_BY_IDS_QUERY } from "@/lib/sanity/queries/products-by-ids";
import { embedText } from "@/lib/search/embed";
import { getSearchIndex } from "@/lib/search/index";
import { formatPrice } from "@/lib/utils";
import { sanityFetch } from "@/sanity/lib/live";

const SUGGESTED_QUERIES = [
  "cozy nook for a studio apartment",
  "mid-century feel for the bedroom",
  "kids' room that'll actually last",
];

export const metadata = {
  title: "Search — Kozy",
  description: "Find furniture by vibe, style, or context.",
};

type SearchParams = Promise<{ q?: string; category?: string }>;

async function Results({ query }: { query: string }) {
  const vector = await embedText(query);
  const index = getSearchIndex();
  const results = await index.query(vector, { topK: 20 });
  if (results.length === 0) {
    return (
      <p className="text-muted-foreground">No matches found. Try rephrasing.</p>
    );
  }
  const ids = results.map((r) => r.id);
  const { data } = await sanityFetch({
    query: SEARCH_PRODUCTS_BY_IDS_QUERY,
    params: { ids },
  });
  const byId = new Map(
    (data as Array<{ _id: string } & Record<string, unknown>>).map((d) => [
      d._id,
      d,
    ]),
  );
  const products = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {products.map((p) => {
        const prod = p as {
          _id: string;
          name: string;
          slug: string;
          price: number;
          images?: Array<{ asset?: { url?: string } }>;
          category?: { title?: string };
        };
        return (
          <Link
            key={prod._id}
            href={`/products/${prod.slug}`}
            className="rounded border p-4 hover:shadow-md transition"
          >
            {prod.images?.[0]?.asset?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prod.images[0].asset.url}
                alt={prod.name}
                className="mb-3 aspect-square w-full object-cover"
                loading="lazy"
              />
            ) : null}
            <h3 className="font-medium">{prod.name}</h3>
            <p className="text-sm text-muted-foreground">
              {prod.category?.title}
            </p>
            <p className="mt-1 font-semibold">{formatPrice(prod.price)}</p>
          </Link>
        );
      })}
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-semibold">Search</h1>
      <p className="mb-6 text-muted-foreground">
        Describe the vibe, situation, or feeling — not just the product.
      </p>

      <form method="GET" action="/search" className="mb-8">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="e.g. 'cozy nook for a studio apartment'"
          className="w-full rounded border px-4 py-3 text-base"
          aria-label="Search query"
        />
      </form>

      {query.length === 0 ? (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            Try one of these:
          </p>
          <ul className="space-y-2">
            {SUGGESTED_QUERIES.map((s) => (
              <li key={s}>
                <Link
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="text-primary underline"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Suspense fallback={<p>Searching…</p>}>
          <Results query={query} />
        </Suspense>
      )}
    </main>
  );
}
