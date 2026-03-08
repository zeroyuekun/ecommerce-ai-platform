import Link from "next/link";
import {
  Truck,
  RotateCcw,
  CreditCard,
  Package,
  MessageCircle,
  Phone,
} from "lucide-react";

const helpTopics = [
  {
    icon: Truck,
    title: "Shipping & Delivery",
    description: "Delivery times, tracking, and shipping costs.",
    href: "/shipping",
  },
  {
    icon: RotateCcw,
    title: "Returns & Warranty",
    description: "Return policy, exchanges, and warranty claims.",
    href: "/returns",
  },
  {
    icon: CreditCard,
    title: "Payment Options",
    description: "Accepted payment methods and buy now, pay later.",
    href: "/faq",
  },
  {
    icon: Package,
    title: "Order Status",
    description: "Track your order and view order history.",
    href: "/orders",
  },
  {
    icon: MessageCircle,
    title: "Contact Us",
    description: "Get in touch with our customer service team.",
    href: "/contact",
  },
  {
    icon: Phone,
    title: "FAQ",
    description: "Find answers to frequently asked questions.",
    href: "/faq",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Help Centre
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            Find the help you need. Browse topics below or contact our team
            directly.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {helpTopics.map((topic) => (
            <Link
              key={topic.title}
              href={topic.href}
              className="group border border-zinc-200 bg-white p-6 transition-all hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
            >
              <topic.icon className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
              <h3 className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {topic.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {topic.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-12 border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-light text-zinc-900 dark:text-zinc-100">
            Still need help?
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Our customer service team is available Monday to Friday, 9am to 5pm
            AEST.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="tel:+61290001234"
              className="inline-flex items-center gap-2 border border-zinc-900 px-6 py-3 text-sm font-medium uppercase tracking-wider text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
            >
              Call 02 9000 1234
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-zinc-900 bg-zinc-900 px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-zinc-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100"
            >
              Send a Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
