import type { PageContent } from "./types";

function Content() {
  return (
    <div className="space-y-10 text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Shipping Methods &amp; Rates
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 pr-4 text-left font-medium text-zinc-900 dark:text-zinc-100">
                  Method
                </th>
                <th className="py-3 pr-4 text-left font-medium text-zinc-900 dark:text-zinc-100">
                  Estimated Delivery
                </th>
                <th className="py-3 text-left font-medium text-zinc-900 dark:text-zinc-100">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td className="py-3 pr-4">Standard Shipping</td>
                <td className="py-3 pr-4">5–7 business days</td>
                <td className="py-3">$9.95</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Express Shipping</td>
                <td className="py-3 pr-4">2–3 business days</td>
                <td className="py-3">$19.95</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Large Item Delivery</td>
                <td className="py-3 pr-4">7–14 business days</td>
                <td className="py-3">From $29.95</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                  Free Shipping
                </td>
                <td className="py-3 pr-4">5–7 business days</td>
                <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  Orders over $150
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Processing Times
        </h2>
        <p className="mb-3">
          Orders are dispatched from our warehouse on standard business days (Monday to Friday,
          excluding public holidays). Most orders are processed and dispatched within 1–3 business
          days of payment confirmation.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Orders placed before 12pm AEST on business days are typically dispatched the same or next day</li>
          <li>Orders placed after 12pm or on weekends/public holidays will be processed the next business day</li>
          <li>During peak periods (sales events, holidays), processing may take an additional 1–2 business days</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Delivery Areas &amp; Timeframes
        </h2>
        <p className="mb-3">
          We deliver Australia-wide. Estimated delivery times from dispatch vary by region:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 pr-4 text-left font-medium text-zinc-900 dark:text-zinc-100">
                  Region
                </th>
                <th className="py-3 text-left font-medium text-zinc-900 dark:text-zinc-100">
                  Standard Delivery
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td className="py-3 pr-4">Sydney, Melbourne, Brisbane Metro</td>
                <td className="py-3">2–5 business days</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Adelaide, Perth Metro</td>
                <td className="py-3">4–7 business days</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Hobart, Darwin, Canberra</td>
                <td className="py-3">5–8 business days</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Regional &amp; Remote Areas</td>
                <td className="py-3">7–14 business days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Order Tracking
        </h2>
        <p>
          Once your order is dispatched, you&apos;ll receive a shipping confirmation email with a
          tracking number. You can track your delivery through the carrier&apos;s website, or by
          visiting your{" "}
          <a
            href="/orders"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Order Status
          </a>{" "}
          page. If your tracking hasn&apos;t updated after 3 business days, please reach out to our
          team and we&apos;ll investigate.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Large Item Delivery
        </h2>
        <p className="mb-3">
          Larger furniture items (sofas, dining tables, bed frames, etc.) are delivered via our
          specialist furniture courier. Please note:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>You&apos;ll be contacted to arrange a convenient delivery window</li>
          <li>Delivery is to your front door or garage — we do not offer room-of-choice delivery at this time</li>
          <li>Please ensure there is clear access for the delivery driver</li>
          <li>Someone over 18 must be available to receive the delivery and sign for the item</li>
          <li>Please inspect items for visible damage before signing</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Delivery Tips
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Double-check your delivery address before placing your order</li>
          <li>Include any special delivery instructions (gate codes, apartment numbers, etc.)</li>
          <li>Measure doorways and hallways to ensure your new furniture will fit through</li>
          <li>For apartments, check if your building has loading dock access or lift restrictions</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Need Help?
        </h2>
        <p>
          If you have any questions about shipping or delivery, please{" "}
          <a
            href="/pages/contact"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            contact us
          </a>
          . Our team is available Monday to Friday, 9am to 5pm AEST.
        </p>
      </section>
    </div>
  );
}

export const shippingReturnsPage: PageContent = {
  meta: {
    title: "Shipping & Delivery",
    subtitle: "Free shipping on orders over $150",
    description:
      "Find out about Kozy. shipping methods, delivery timeframes, and rates. Free shipping on orders over $150.",
    lastUpdated: "March 2026",
  },
  content: Content,
};
