import Link from "next/link";

const faqs = [
  {
    category: "Orders & Payment",
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept Visa, Mastercard, American Express, PayPal, Apple Pay, and Afterpay. You can also pay with Zip for eligible orders.",
      },
      {
        q: "Can I modify or cancel my order?",
        a: "If your order hasn't been dispatched, we can modify or cancel it. Please contact our team as soon as possible at hello@kozy.com.au or call 02 9000 1234.",
      },
      {
        q: "How do I track my order?",
        a: "Once your order is dispatched, you'll receive a tracking email with a link to follow your delivery in real time. You can also check your order status in your account.",
      },
    ],
  },
  {
    category: "Shipping & Delivery",
    questions: [
      {
        q: "How long does delivery take?",
        a: "Standard delivery takes 5-10 business days for metro areas and 10-15 business days for regional areas. Express delivery (2-5 business days) is available for select items.",
      },
      {
        q: "Do you offer free shipping?",
        a: "We offer free standard shipping on orders over $500 to metro areas across Australia. A flat rate of $49.95 applies to orders under $500.",
      },
      {
        q: "Do you deliver to regional areas?",
        a: "Yes, we deliver Australia-wide. Regional delivery may take a few extra days and a surcharge may apply depending on the location.",
      },
    ],
  },
  {
    category: "Returns & Warranty",
    questions: [
      {
        q: "What is your return policy?",
        a: "We offer a 30-day return policy. Items must be unused and in their original packaging. Please see our Returns page for full details.",
      },
      {
        q: "What warranty do you offer?",
        a: "All Kozy furniture comes with a 2-year structural warranty covering manufacturing defects. This does not cover normal wear and tear or accidental damage.",
      },
    ],
  },
  {
    category: "Products & Care",
    questions: [
      {
        q: "How do I care for my furniture?",
        a: "Each product comes with specific care instructions. Generally, we recommend dusting regularly with a soft cloth, avoiding direct sunlight, and using coasters to protect surfaces.",
      },
      {
        q: "Do you offer fabric swatches?",
        a: "Yes! Contact our team and we'll send you complimentary fabric swatches so you can see and feel the materials before ordering.",
      },
      {
        q: "Is assembly required?",
        a: "Most larger items require some assembly. Clear instructions and all necessary hardware are included. We also offer a professional assembly service for an additional fee.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            Find answers to common questions about orders, shipping, returns,
            and more.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-16">
          {faqs.map((section) => (
            <section key={section.category}>
              <h2 className="text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
                {section.category}
              </h2>
              <div className="mt-6 space-y-8">
                {section.questions.map((item) => (
                  <div
                    key={item.q}
                    className="border-b border-zinc-100 pb-8 last:border-0 dark:border-zinc-800"
                  >
                    <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                      {item.q}
                    </h3>
                    <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Can&apos;t find what you&apos;re looking for?{" "}
            <Link
              href="/contact"
              className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
            >
              Contact our team
            </Link>{" "}
            for further assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
