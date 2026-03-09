import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, CreditCard, MapPin } from "lucide-react";
import { sanityFetch } from "@/sanity/lib/live";
import { ORDER_BY_ID_QUERY } from "@/lib/sanity/queries/orders";
import { getOrderStatus } from "@/lib/constants/orderStatus";
import { formatPrice, formatDate } from "@/lib/utils";

export const metadata = {
  title: "Order Details | Furniture Shop",
  description: "View your order details",
};

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = await params;
  const { userId } = await auth();

  const { data: order } = await sanityFetch({
    query: ORDER_BY_ID_QUERY,
    params: { id },
  });

  // Verify order exists and belongs to current user
  if (!order || order.clerkUserId !== userId) {
    notFound();
  }

  const status = getOrderStatus(order.status);
  const StatusIcon = status.icon;

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
            <Link
              href="/orders"
              className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Orders
            </Link>
            <span>/</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {order.orderNumber}
            </span>
          </nav>
        </div>
      </div>

      {/* Page Header */}
      <div className="border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
          <div className="flex flex-col items-center gap-3">
            <h1 className="font-serif text-2xl font-normal tracking-[0.02em] text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              Order {order.orderNumber}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-[11px] tracking-[0.05em] text-zinc-400 dark:text-zinc-500">
                {formatDate(order.createdAt, "datetime")}
              </p>
              <span className="text-zinc-200 dark:text-zinc-700">|</span>
              <span
                className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] ${status.iconColor}`}
              >
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10">
        {/* Back link */}
        <Link
          href="/orders"
          className="mb-8 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Orders
        </Link>

        <div className="grid gap-10 lg:grid-cols-5">
          {/* Order Items */}
          <div className="lg:col-span-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
              Items ({order.items?.length ?? 0})
            </p>

            <div className="mt-5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {order.items?.map((item) => (
                <div key={item._key} className="flex gap-5 py-5 first:pt-0">
                  {/* Image */}
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800/50">
                    {item.product?.image?.asset?.url ? (
                      <Image
                        src={item.product.image.asset.url}
                        alt={item.product.name ?? "Product"}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-300 dark:text-zinc-600">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/products/${item.product?.slug}`}
                        className="font-serif text-sm font-normal tracking-[0.02em] text-zinc-900 transition-colors hover:text-zinc-500 dark:text-zinc-100 dark:hover:text-zinc-400"
                      >
                        {item.product?.name ?? "Unknown Product"}
                      </Link>
                      <p className="mt-1.5 text-[11px] tracking-[0.05em] text-zinc-400 dark:text-zinc-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex shrink-0 flex-col items-end justify-between">
                    <span className="font-serif text-sm font-normal tracking-wide text-zinc-900 dark:text-zinc-100">
                      {formatPrice(
                        (item.priceAtPurchase ?? 0) * (item.quantity ?? 1),
                      )}
                    </span>
                    {(item.quantity ?? 1) > 1 && (
                      <span className="text-[11px] tracking-[0.05em] text-zinc-400 dark:text-zinc-500">
                        {formatPrice(item.priceAtPurchase)} each
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8 lg:col-span-2">
            {/* Order Summary */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
                Summary
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[12px] tracking-[0.03em] text-zinc-500 dark:text-zinc-400">
                    Subtotal
                  </span>
                  <span className="text-[12px] tracking-[0.03em] text-zinc-900 dark:text-zinc-100">
                    {formatPrice(order.total)}
                  </span>
                </div>
                <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800/60">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100">
                      Total
                    </span>
                    <span className="font-serif text-lg font-normal tracking-wide text-zinc-900 dark:text-zinc-100">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.address && (
              <div className="border-t border-zinc-100 pt-8 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
                    Shipping Address
                  </p>
                </div>
                <div className="mt-4 space-y-0.5 text-[12px] leading-relaxed tracking-[0.03em] text-zinc-500 dark:text-zinc-400">
                  {order.address.name && <p>{order.address.name}</p>}
                  {order.address.line1 && <p>{order.address.line1}</p>}
                  {order.address.line2 && <p>{order.address.line2}</p>}
                  <p>
                    {[order.address.city, order.address.postcode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {order.address.country && <p>{order.address.country}</p>}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="border-t border-zinc-100 pt-8 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
                  Payment
                </p>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] tracking-[0.03em] text-zinc-500 dark:text-zinc-400">
                    Status
                  </span>
                  <span className="text-[12px] font-medium capitalize tracking-[0.03em] text-green-600 dark:text-green-400">
                    {order.status}
                  </span>
                </div>
                {order.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] tracking-[0.03em] text-zinc-500 dark:text-zinc-400">
                      Email
                    </span>
                    <span className="min-w-0 truncate text-[12px] tracking-[0.03em] text-zinc-900 dark:text-zinc-100">
                      {order.email}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
