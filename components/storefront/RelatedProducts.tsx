import { ProductCard } from "@/components/storefront/ProductCard";

interface RelatedProduct {
  _id: string;
  name: string | null;
  slug: string | null;
  price: number | null;
  color: string | null;
  stock: number | null;
  images: Array<{
    _key: string;
    asset: { _id: string; url: string | null } | null;
  }> | null;
  category: {
    _id: string;
    title: string | null;
    slug: string | null;
  } | null;
}

interface RelatedProductsProps {
  products: RelatedProduct[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-zinc-200 pt-12 dark:border-zinc-800">
      <h2 className="mb-8 text-xl font-medium text-zinc-900 dark:text-zinc-100">
        You May Also Like
      </h2>
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product as Parameters<typeof ProductCard>[0]["product"]}
          />
        ))}
      </div>
    </section>
  );
}
