import type { PageContent } from "./types";

function Content() {
  return (
    <div className="space-y-10 text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Our 30-Day Return Policy
        </h2>
        <p>
          At Kozy., we want you to love every piece you bring home. If something isn&apos;t quite
          right, you can return most unused and unopened items within 30 days of receiving your order
          for a full refund or exchange. We believe furniture shopping should be stress-free, so
          we&apos;ve made our returns process as simple as possible.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Eligibility
        </h2>
        <p className="mb-3">To be eligible for a return, items must be:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Within 30 days of delivery</li>
          <li>In their original, unused condition</li>
          <li>In the original packaging with all parts, hardware, and assembly instructions included</li>
          <li>Free from damage, stains, pet hair, or signs of use</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          How to Initiate a Return
        </h2>
        <ol className="list-decimal pl-5 space-y-3">
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Contact us</span> —
            Email us at returns@kozy.com.au or call 1800 KOZY with your order number and reason for
            return.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Receive your return authorisation
            </span>{" "}
            — Our team will review your request and provide a Return Authorisation Number (RAN) and
            return instructions within 1-2 business days.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Pack your item</span> —
            Carefully repack the item in its original packaging. Please include the RAN on the
            outside of the box.
          </li>
          <li>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Ship it back</span> —
            Send the item to the address provided in your return authorisation. Return shipping costs
            are the responsibility of the customer for change-of-mind returns.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Refund Processing
        </h2>
        <p className="mb-3">
          Once we receive and inspect your return, we&apos;ll process your refund within 5-7 business
          days. Refunds will be issued to your original payment method.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Credit/debit card refunds may take an additional 3-5 business days to appear on your statement</li>
          <li>PayPal refunds are typically processed within 24 hours of approval</li>
          <li>Original shipping fees are non-refundable for change-of-mind returns</li>
          <li>If the return is due to a fault or error on our part, we&apos;ll cover the return shipping costs</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Exchanges
        </h2>
        <p>
          Want a different colour, size, or product? We&apos;re happy to arrange an exchange.
          Simply follow the return process above and let us know what you&apos;d like instead. If the
          replacement item is a different price, we&apos;ll charge or refund the difference
          accordingly. Exchanges are subject to stock availability.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Non-Returnable Items
        </h2>
        <p className="mb-3">
          For hygiene and safety reasons, the following items cannot be returned:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Mattresses and mattress protectors (unless faulty)</li>
          <li>Assembled flat-pack furniture that has been modified or assembled incorrectly</li>
          <li>Items marked as &quot;Final Sale&quot; or &quot;Clearance&quot;</li>
          <li>Custom or made-to-order items</li>
          <li>Items damaged through misuse or normal wear and tear</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Damaged or Faulty Items
        </h2>
        <p>
          If your item arrives damaged or faulty, please contact us within 48 hours of delivery with
          photos of the damage. We&apos;ll arrange a replacement or full refund at no extra cost to
          you, including return shipping. Your rights under the Australian Consumer Law are not
          affected by this policy.
        </p>
      </section>
    </div>
  );
}

export const returnsPage: PageContent = {
  meta: {
    title: "Returns & Exchanges",
    subtitle: "Hassle-free returns within 30 days",
    description:
      "Kozy. offers a 30-day return policy on most items. Learn about our returns process, eligibility, and refund timeline.",
    lastUpdated: "March 2026",
  },
  content: Content,
};
