import type { PageContent } from "./types";

function Content() {
  return (
    <div className="space-y-10 text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Information We Collect
        </h2>
        <p className="mb-3">
          At Kozy., we collect information to provide you with the best possible shopping experience.
          This includes:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Personal details you provide when creating an account (name, email address, phone number)</li>
          <li>Shipping and billing addresses used for order fulfilment</li>
          <li>Payment information processed securely through our third-party payment providers</li>
          <li>Browsing and purchase history to personalise your experience</li>
          <li>Device and browser information collected automatically through cookies</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          How We Use Your Information
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Processing and fulfilling your orders, including delivery and returns</li>
          <li>Communicating with you about your orders, account, or customer service enquiries</li>
          <li>Personalising your shopping experience and product recommendations</li>
          <li>Improving our website, products, and services</li>
          <li>Sending promotional emails and offers (only with your consent — you can opt out at any time)</li>
          <li>Preventing fraud and ensuring the security of our platform</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Information Sharing
        </h2>
        <p className="mb-3">
          We respect your privacy and will never sell your personal information. We may share your
          data with trusted third parties only when necessary:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Delivery partners to ship your orders</li>
          <li>Payment processors to handle transactions securely</li>
          <li>Analytics services to help us understand how our site is used</li>
          <li>Legal authorities when required by law</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Data Security
        </h2>
        <p>
          We take the security of your information seriously. All data is encrypted in transit using
          SSL/TLS technology. Payment details are processed through PCI DSS-compliant providers and
          are never stored on our servers. We regularly review our security practices and update them
          to ensure your data remains protected.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Cookies
        </h2>
        <p className="mb-3">
          Kozy. uses cookies to enhance your browsing experience. These small text files help us:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Remember your preferences and cart contents</li>
          <li>Keep you signed in to your account</li>
          <li>Understand how you navigate our site so we can make improvements</li>
          <li>Deliver relevant content and advertisements</li>
        </ul>
        <p className="mt-3">
          You can manage your cookie preferences through your browser settings at any time.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Your Rights
        </h2>
        <p className="mb-3">You have the right to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of any inaccurate information</li>
          <li>Request deletion of your personal data</li>
          <li>Opt out of marketing communications at any time</li>
          <li>Withdraw consent for data processing where applicable</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Contact Us About Privacy
        </h2>
        <p>
          If you have any questions or concerns about your privacy, please don&apos;t hesitate to
          reach out. You can contact our privacy team at{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">privacy@kozy.com.au</span>{" "}
          or call us on{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">1800 KOZY</span>.
        </p>
      </section>
    </div>
  );
}

export const privacyPage: PageContent = {
  meta: {
    title: "Privacy & Security Policy",
    description:
      "Learn how Kozy. collects, uses, and protects your personal information when you shop with us.",
    lastUpdated: "March 2026",
  },
  content: Content,
};
