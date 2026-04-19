import { Mail, Phone } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  about: {
    title: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Reviews", href: "/reviews" },
      { label: "Blog", href: "/blog" },
      { label: "Store Locations", href: "/store-locations" },
      { label: "Gift Vouchers", href: "/gift-vouchers" },
    ],
  },
  customerService: {
    title: "Customer Service",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "My Account", href: "/orders" },
      { label: "Order Status", href: "/orders" },
      { label: "Returns", href: "/returns" },
      { label: "Help Centre", href: "/help" },
    ],
  },
  information: {
    title: "Information",
    links: [
      { label: "Frequently Asked Questions", href: "/faq" },
      { label: "Shipping & Delivery", href: "/shipping" },
      { label: "Privacy & Security", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="bg-zinc-100 dark:bg-zinc-900">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Link columns */}
          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16 lg:gap-20">
            {Object.values(footerLinks).map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  {section.title}
                </h3>
                <ul className="mt-5 space-y-3.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact section */}
          <div className="max-w-[280px]">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Any Questions? We Can Help
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Our team is available Monday to Friday, 9am to 5pm AEST.
            </p>
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <Phone className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Call us
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    02 9000 1234
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                <Mail className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    Email us
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    support@kozy.com.au
                  </p>
                </div>
              </div>
            </div>

            {/* Social icons */}
            <div className="mt-6 flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Instagram"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="Facebook"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
                aria-label="YouTube"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-4 py-8 sm:px-6 lg:px-8">
          {[
            { src: "/payments/visa.svg", alt: "Visa" },
            { src: "/payments/mastercard.svg", alt: "Mastercard" },
            { src: "/payments/amex.svg", alt: "American Express" },
            { src: "/payments/paypal.svg", alt: "PayPal" },
            { src: "/payments/applepay.svg", alt: "Apple Pay" },
            { src: "/payments/afterpay.svg", alt: "Afterpay" },
          ].map((card) => (
            <img
              key={card.alt}
              src={card.src}
              alt={card.alt}
              className="h-8 w-auto rounded"
            />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:px-6 lg:px-8">
          {/* Copyright + legal */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex gap-5 text-xs text-zinc-500 dark:text-zinc-400">
              <Link
                href="/terms"
                className="transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
              >
                Privacy &amp; Security
              </Link>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              &copy; {new Date().getFullYear()} Kozy Australia. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
