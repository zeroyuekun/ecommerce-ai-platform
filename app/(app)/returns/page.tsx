import Link from "next/link";

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Returns & Warranty
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            We want you to love your Kozy purchase. Here&apos;s our returns
            policy.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              30-Day Returns
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              If you&apos;re not completely satisfied with your purchase, you may
              return it within 30 days of delivery for a full refund or exchange.
              Items must be unused, in their original packaging, and in the same
              condition you received them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              How to Return
            </h2>
            <ol className="mt-4 space-y-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-3">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">1.</span>
                Contact our customer service team at{" "}
                <Link href="/contact" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
                  hello@kozy.com.au
                </Link>{" "}
                or call 02 9000 1234.
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">2.</span>
                Provide your order number and the reason for your return.
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">3.</span>
                Our team will arrange a pick-up or provide you with a return
                shipping label.
              </li>
              <li className="flex gap-3">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">4.</span>
                Once we receive and inspect the item, we&apos;ll process your
                refund within 5&ndash;7 business days.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Damaged or Faulty Items
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              If your item arrives damaged or faulty, please contact us within 48
              hours of delivery with photos of the damage. We&apos;ll arrange a
              replacement or full refund at no extra cost to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Warranty
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              All Kozy furniture comes with a 2-year structural warranty covering
              manufacturing defects. This warranty does not cover normal wear and
              tear, accidental damage, or improper use. For warranty claims, please
              contact our support team with your order details and photos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Non-Returnable Items
            </h2>
            <ul className="mt-4 space-y-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Custom or made-to-order items
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Gift vouchers
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Items marked as final sale
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Items that have been assembled and used
              </li>
            </ul>
          </section>

          <div className="border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Need help with a return?{" "}
              <Link
                href="/contact"
                className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
              >
                Contact our team
              </Link>{" "}
              and we&apos;ll be happy to assist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
