import Link from "next/link";

const shippingRates = [
  {
    method: "Standard Delivery",
    metro: "$49.95",
    regional: "$69.95",
    timeframe: "5-10 business days",
  },
  {
    method: "Express Delivery",
    metro: "$89.95",
    regional: "$119.95",
    timeframe: "2-5 business days",
  },
  {
    method: "White Glove Delivery",
    metro: "$149.95",
    regional: "Contact us",
    timeframe: "7-14 business days",
  },
];

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Shipping & Delivery
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            Everything you need to know about getting your Kozy furniture
            delivered.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {/* Free Shipping */}
          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Free Shipping
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Enjoy{" "}
              <strong className="text-zinc-900 dark:text-zinc-100">
                free standard shipping
              </strong>{" "}
              on all orders over $500 to metro areas across Australia. Orders
              under $500 are charged a flat rate based on the delivery method
              selected.
            </p>
          </section>

          {/* Shipping Rates */}
          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Shipping Rates
            </h2>
            <div className="mt-6 overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900">
                    <th className="px-5 py-4 text-left font-medium text-zinc-900 dark:text-zinc-100">
                      Method
                    </th>
                    <th className="px-5 py-4 text-left font-medium text-zinc-900 dark:text-zinc-100">
                      Metro
                    </th>
                    <th className="px-5 py-4 text-left font-medium text-zinc-900 dark:text-zinc-100">
                      Regional
                    </th>
                    <th className="px-5 py-4 text-left font-medium text-zinc-900 dark:text-zinc-100">
                      Timeframe
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shippingRates.map((rate) => (
                    <tr
                      key={rate.method}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-5 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {rate.method}
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                        {rate.metro}
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                        {rate.regional}
                      </td>
                      <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                        {rate.timeframe}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* White Glove Delivery */}
          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              White Glove Delivery
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Our premium White Glove service includes delivery to the room of
              your choice, unpacking, assembly, and removal of all packaging
              materials. Available for most furniture items in metro areas.
            </p>
          </section>

          {/* Tracking Your Order */}
          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Tracking Your Order
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Once your order has been dispatched, you&apos;ll receive an email
              with tracking details. You can also view your order status by
              logging into your account and visiting the{" "}
              <Link
                href="/orders"
                className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
              >
                Orders
              </Link>{" "}
              page.
            </p>
          </section>

          {/* Delivery Areas */}
          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Delivery Areas
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              We deliver Australia-wide. Metro areas include Sydney, Melbourne,
              Brisbane, Perth, Adelaide, and the Gold Coast. All other areas are
              classified as regional and may incur additional delivery time.
            </p>
          </section>

          {/* Contact CTA */}
          <div className="border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Have a delivery question?{" "}
              <Link
                href="/contact"
                className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
              >
                Contact our team
              </Link>{" "}
              for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
