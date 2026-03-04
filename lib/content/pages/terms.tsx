import type { PageContent } from "./types";

function Content() {
  return (
    <div className="space-y-10 text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          1. Acceptance of Terms
        </h2>
        <p>
          By accessing and using the Kozy. website (kozy.com.au), you agree to be bound by these
          Terms &amp; Conditions. If you do not agree with any part of these terms, please do not use
          our website. We reserve the right to update these terms at any time, and continued use of
          the site constitutes acceptance of any changes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          2. Use of Website
        </h2>
        <p className="mb-3">When using our website, you agree to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide accurate and up-to-date information when creating an account or placing orders</li>
          <li>Keep your account credentials secure and confidential</li>
          <li>Use the website for lawful purposes only</li>
          <li>Not attempt to interfere with the website&apos;s functionality or security</li>
          <li>Not reproduce, distribute, or modify any content without our written permission</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          3. Products &amp; Pricing
        </h2>
        <p className="mb-3">
          We make every effort to ensure that product descriptions, images, and prices on our website
          are accurate. However:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Colours may vary slightly due to monitor settings and photography</li>
          <li>Product dimensions are approximate and may vary slightly</li>
          <li>
            All prices are displayed in Australian Dollars (AUD) and include GST unless otherwise
            stated
          </li>
          <li>
            We reserve the right to correct any pricing errors and to cancel orders affected by
            such errors
          </li>
          <li>Prices and availability are subject to change without notice</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          4. Orders &amp; Payment
        </h2>
        <p className="mb-3">
          Placing an order on Kozy. constitutes an offer to purchase. We reserve the right to accept
          or decline any order. An order is only confirmed once you receive an order confirmation
          email from us.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Payment is required at the time of placing your order</li>
          <li>We accept Visa, Mastercard, PayPal, Apple Pay, and American Express</li>
          <li>All transactions are processed through secure, PCI-compliant payment gateways</li>
          <li>
            We may cancel orders if products are unavailable, if there is a pricing error, or if
            we suspect fraudulent activity
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          5. Shipping &amp; Delivery
        </h2>
        <p>
          Delivery timeframes are estimates and may vary depending on your location and stock
          availability. Kozy. is not responsible for delays caused by circumstances beyond our
          control, including but not limited to weather events, carrier delays, or public holidays.
          For full details, please see our{" "}
          <a
            href="/pages/shipping-returns"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Shipping &amp; Delivery
          </a>{" "}
          page.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          6. Returns &amp; Refunds
        </h2>
        <p>
          Our returns policy allows you to return most unused items within 30 days of delivery for a
          refund or exchange. Certain conditions apply. For full details, please refer to our{" "}
          <a
            href="/pages/returns"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Returns &amp; Exchanges
          </a>{" "}
          page.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          7. Intellectual Property
        </h2>
        <p>
          All content on the Kozy. website — including text, images, logos, graphics, and software —
          is the property of Kozy. or its licensors and is protected by Australian and international
          copyright laws. You may not reproduce, distribute, or create derivative works from any
          content without our prior written consent.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          8. Limitation of Liability
        </h2>
        <p>
          To the maximum extent permitted by law, Kozy. shall not be liable for any indirect,
          incidental, special, or consequential damages arising from the use of our website or
          products. Our total liability for any claim shall not exceed the amount paid by you for the
          relevant product. Nothing in these terms excludes or limits liability that cannot be
          excluded under Australian Consumer Law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          9. Governing Law
        </h2>
        <p>
          These Terms &amp; Conditions are governed by the laws of Australia. Any disputes arising
          from or in connection with these terms shall be subject to the exclusive jurisdiction of
          the courts of Australia. Nothing in these terms is intended to exclude, restrict, or modify
          any consumer rights under the Australian Consumer Law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          10. Contact
        </h2>
        <p>
          If you have any questions about these Terms &amp; Conditions, please contact us at{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">hello@kozy.com.au</span>{" "}
          or call{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">1800 KOZY</span>.
        </p>
      </section>
    </div>
  );
}

export const termsPage: PageContent = {
  meta: {
    title: "Terms & Conditions",
    description:
      "Read the terms and conditions for using the Kozy. website and purchasing our products.",
    lastUpdated: "March 2026",
  },
  content: Content,
};
