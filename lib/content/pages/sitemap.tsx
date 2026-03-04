import Link from "next/link";
import type { PageContent } from "./types";

const sections = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/" },
      { label: "Shop All Products", href: "/?category=all" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Story", href: "/pages/story" },
      { label: "Customer Reviews", href: "/pages/reviews" },
      { label: "Blog", href: "/pages/blog" },
      { label: "Style Sourcebook", href: "/pages/style-sourcebook" },
    ],
  },
  {
    title: "Customer Service",
    links: [
      { label: "Contact Us", href: "/pages/contact" },
      { label: "My Account / Orders", href: "/orders" },
      { label: "Returns & Exchanges", href: "/pages/returns" },
      { label: "Help Centre", href: "/pages/helpdesk" },
    ],
  },
  {
    title: "Information",
    links: [
      { label: "FAQ", href: "/pages/faq" },
      { label: "Shipping & Delivery", href: "/pages/shipping-returns" },
      { label: "Privacy & Security", href: "/pages/privacy" },
      { label: "Terms & Conditions", href: "/pages/terms" },
      { label: "Warranty", href: "/pages/warranty" },
    ],
  },
];

function Content() {
  return (
    <div className="space-y-10">
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Browse all pages on the Kozy. website.
      </p>

      <div className="grid gap-8 sm:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-3">
              {section.title}
            </h2>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export const sitemapPage: PageContent = {
  meta: {
    title: "Sitemap",
    description: "Browse all pages on the Kozy. website. Find what you're looking for quickly.",
  },
  content: Content,
};
