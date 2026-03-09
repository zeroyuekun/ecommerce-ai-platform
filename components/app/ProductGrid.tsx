import { PackageSearch } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "@/components/ui/empty-state";
import type { FILTER_PRODUCTS_BY_NAME_QUERY_RESULT } from "@/sanity.types";

type Product = FILTER_PRODUCTS_BY_NAME_QUERY_RESULT[number];

export interface VariantInfo {
  slug: string;
  color: string;
  imageUrl: string | null;
  price: number | null;
  salePrice: number | null;
  stock: number | null;
  isNew: boolean | null;
}

export type ProductWithVariants = Product & {
  variants?: VariantInfo[];
};

/** Group products by variantGroup, keeping one card per group */
function groupVariants(products: Product[]): ProductWithVariants[] {
  const grouped = new Map<string, Product[]>();
  const standalone: Product[] = [];

  for (const product of products) {
    const group = product.variantGroup;
    if (group) {
      const list = grouped.get(group) ?? [];
      list.push(product);
      grouped.set(group, list);
    } else {
      standalone.push(product);
    }
  }

  const result: ProductWithVariants[] = [];

  for (const [, group] of grouped) {
    const main = group[0];
    const variants: VariantInfo[] = group.map((p) => ({
      slug: p.slug ?? "",
      color: p.color ?? "",
      imageUrl: p.images?.[0]?.asset?.url ?? null,
      price: p.price,
      salePrice: p.salePrice,
      stock: p.stock,
      isNew: p.isNew,
    }));
    result.push({ ...main, variants });
  }

  for (const product of standalone) {
    result.push(product);
  }

  return result;
}

interface ProductGridProps {
  products: FILTER_PRODUCTS_BY_NAME_QUERY_RESULT;
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <EmptyState
          icon={PackageSearch}
          title="No products found"
          description="Try adjusting your filters to find what you're looking for"
          size="lg"
        />
      </div>
    );
  }

  const grouped = groupVariants(products);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {grouped.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
