export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Privacy & Security
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            How we collect, use, and protect your personal information.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm text-zinc-400">Last updated: March 1, 2026</p>

        <div className="mt-10 space-y-12">
          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Information We Collect
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              When you visit our website or make a purchase, we may collect the
              following information:
            </p>
            <ul className="mt-4 space-y-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Name, email address, phone number, and shipping/billing address
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Payment information (processed securely via our payment
                providers)
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Browsing behaviour and preferences on our website
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Communications you send to us
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              How We Use Your Information
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              We use your personal information to:
            </p>
            <ul className="mt-4 space-y-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Process and fulfil your orders
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Communicate with you about your orders and account
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Improve our website and customer experience
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Send you marketing communications (only with your consent)
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Comply with legal obligations
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Data Security
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              We take the security of your data seriously. All transactions are
              encrypted using SSL technology, and we do not store your payment
              card details on our servers. Access to personal information is
              restricted to authorised personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Third-Party Services
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              We may share your information with trusted third-party service
              providers for order fulfilment, payment processing, and delivery.
              These providers are bound by strict confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Cookies
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Our website uses cookies to enhance your browsing experience,
              analyse site traffic, and personalise content. You can manage your
              cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Your Rights
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              You have the right to:
            </p>
            <ul className="mt-4 space-y-2 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Access the personal data we hold about you
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Request correction of inaccurate data
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Request deletion of your data
              </li>
              <li className="flex gap-2">
                <span className="text-zinc-400">&bull;</span>
                Opt out of marketing communications at any time
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">
              Contact Us
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              If you have questions about our privacy practices, please contact
              us at hello@kozy.com.au or call 02 9000 1234.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
