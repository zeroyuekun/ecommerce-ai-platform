import { Package, Truck, RotateCcw, Armchair, CreditCard, Shield } from "lucide-react";
import type { PageContent } from "./types";

const topics = [
  {
    title: "Orders & Tracking",
    description: "Track your order, view order history, or manage your purchases",
    href: "/orders",
    icon: Package,
  },
  {
    title: "Shipping & Delivery",
    description: "Delivery times, rates, large item delivery, and tracking info",
    href: "/pages/shipping-returns",
    icon: Truck,
  },
  {
    title: "Returns & Exchanges",
    description: "How to return or exchange items, refund processing, and eligibility",
    href: "/pages/returns",
    icon: RotateCcw,
  },
  {
    title: "Product Care & Warranty",
    description: "Furniture care tips, warranty coverage, and how to make a claim",
    href: "/pages/warranty",
    icon: Armchair,
  },
  {
    title: "Payment & Billing",
    description: "Accepted payment methods, billing enquiries, and payment security",
    href: "/pages/faq",
    icon: CreditCard,
  },
  {
    title: "Account & Privacy",
    description: "Account settings, privacy policy, and data management",
    href: "/pages/privacy",
    icon: Shield,
  },
];

function Content() {
  return (
    <div className="space-y-10">
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Find answers to your questions by browsing the topics below. If you can&apos;t find what
        you&apos;re looking for, our team is always happy to help — reach out via the{" "}
        <a
          href="/pages/contact"
          className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
        >
          Contact Us
        </a>{" "}
        page or use the chat assistant in the corner of your screen.
      </p>

      {/* Topic grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => {
          const Icon = topic.icon;
          return (
            <a
              key={topic.title}
              href={topic.href}
              className="group rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="font-medium text-zinc-900 group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-300 mb-1">
                {topic.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{topic.description}</p>
            </a>
          );
        })}
      </div>

      {/* Quick links */}
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Quick Links
        </h2>
        <ul className="space-y-2">
          <li>
            <a
              href="/pages/faq"
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Frequently Asked Questions
            </a>
          </li>
          <li>
            <a
              href="/pages/terms"
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Terms &amp; Conditions
            </a>
          </li>
          <li>
            <a
              href="/pages/sitemap"
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Sitemap
            </a>
          </li>
        </ul>
      </section>

      {/* Still need help */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          Still need help?
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Our friendly team is available Monday to Friday, 9am to 5pm AEST.
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <a
            href="/pages/contact"
            className="rounded-full border border-zinc-200 px-4 py-2 font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Contact Us
          </a>
          <span className="rounded-full border border-zinc-200 px-4 py-2 font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
            Call 1800 KOZY
          </span>
        </div>
      </div>
    </div>
  );
}

export const helpdeskPage: PageContent = {
  meta: {
    title: "Help Centre",
    subtitle: "Find answers to common questions",
    description:
      "Browse the Kozy. Help Centre for information about orders, shipping, returns, product care, payment, and more.",
  },
  content: Content,
};
