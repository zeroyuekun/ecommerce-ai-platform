import { auth } from "@clerk/nextjs/server";
import { ChevronRight, Package } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { OrderCardSkeleton } from "@/components/app/OrderCardSkeleton";
import { StackedProductImages } from "@/components/app/StackedProductImages";
import { EmptyState } from "@/components/ui/empty-state";
import { getOrderStatus } from "@/lib/constants/orderStatus";
import { ORDERS_BY_USER_QUERY } from "@/lib/sanity/queries/orders";
import { formatDate, formatOrderNumber, formatPrice } from "@/lib/utils";
import { sanityFetch } from "@/sanity/lib/live";

export const metadata = {
  title: "Your Orders | Furniture Shop",
  description: "View your order history",
};

export default async function OrdersPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Breadcrumb */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-10">
          <nav className="flex items-center gap-2 text-xs tracking-wide text-zinc-400 dark:text-zinc-500">
            <Link
              href="/"
              className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Home
            </Link>
            <span>/</span>
            <span className="text-zinc-700 dark:text-zinc-300">Orders</span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <h1 className="text-center font-serif text-3xl font-normal tracking-[0.02em] text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Your Orders
          </h1>
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Track and manage your purchases
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
        <Suspense fallback={<OrderCardSkeleton count={4} />}>
          <OrderList clerkUserId={userId ?? ""} />
        </Suspense>
      </div>
    </div>
  );
}

async function OrderList({ clerkUserId }: { clerkUserId: string }) {
  const { data: orders } = await sanityFetch({
    query: ORDERS_BY_USER_QUERY,
    params: { clerkUserId },
  });

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No orders yet"
        description="When you place an order, it will appear here."
        action={{ label: "Start Shopping", href: "/" }}
        size="lg"
      />
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
      {orders.map((order) => {
        const status = getOrderStatus(order.status);
        const StatusIcon = status.icon;
        const images = (order.itemImages ?? []).filter(
          (url): url is string => url !== null,
        );

        return (
          <Link
            key={order._id}
            href={`/orders/${order._id}`}
            className="group flex items-center gap-5 py-6 transition-colors first:pt-0 last:pb-0 sm:gap-6"
          >
            {/* Product Images */}
            <StackedProductImages
              images={images}
              totalCount={order.itemCount ?? 0}
              size="lg"
            />

            {/* Order Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100">
                    Order #{formatOrderNumber(order.orderNumber)}
                  </p>
                  <p className="mt-1 text-[11px] tracking-[0.05em] text-zinc-400 dark:text-zinc-500">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] ${status.iconColor}`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </span>
              </div>

              <div className="flex items-end justify-between">
                <p className="truncate text-[12px] tracking-[0.03em] text-zinc-500 dark:text-zinc-400">
                  {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  {order.itemNames && order.itemNames.length > 0 && (
                    <span className="ml-1.5 text-zinc-400 dark:text-zinc-500">
                      — {order.itemNames.slice(0, 2).filter(Boolean).join(", ")}
                      {order.itemNames.length > 2 && "..."}
                    </span>
                  )}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-serif text-base font-normal tracking-wide text-zinc-900 dark:text-zinc-100">
                    {formatPrice(order.total)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" />
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
