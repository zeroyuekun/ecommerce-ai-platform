import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PageContent } from "./types";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  items: FaqItem[];
}

const categories: FaqCategory[] = [
  {
    title: "Orders & Shipping",
    items: [
      {
        question: "How long does delivery take?",
        answer:
          "Standard delivery takes 5–7 business days for most metro areas. Express shipping is available for 2–3 business day delivery. Large items may take 7–14 business days. Regional and remote areas may experience longer delivery times.",
      },
      {
        question: "How much does shipping cost?",
        answer:
          "Standard shipping is $9.95, express shipping is $19.95, and large item delivery starts from $29.95. Orders over $150 qualify for free standard shipping Australia-wide.",
      },
      {
        question: "Can I track my order?",
        answer:
          "Yes! Once your order is dispatched, you'll receive a shipping confirmation email with a tracking number. You can also track your order on our website by visiting the Orders page in your account.",
      },
      {
        question: "Do you ship internationally?",
        answer:
          "Currently, we only ship within Australia. We're working on expanding our delivery network and hope to offer international shipping in the future.",
      },
      {
        question: "Can I change or cancel my order after placing it?",
        answer:
          "If your order hasn't been dispatched yet, we can usually make changes or cancel it. Please contact us as soon as possible at hello@kozy.com.au or call 1800 KOZY. Once an order is dispatched, it cannot be cancelled — but you can return it under our 30-day return policy.",
      },
    ],
  },
  {
    title: "Returns & Refunds",
    items: [
      {
        question: "What is your return policy?",
        answer:
          "We offer a 30-day return policy on most unused and unopened items. Items must be in their original packaging with all parts included. Some exclusions apply — see our Returns & Exchanges page for full details.",
      },
      {
        question: "How do I return an item?",
        answer:
          "Contact us at returns@kozy.com.au with your order number and reason for return. We'll provide a Return Authorisation Number and instructions within 1–2 business days. Return shipping costs are the customer's responsibility for change-of-mind returns.",
      },
      {
        question: "How long do refunds take?",
        answer:
          "Once we receive and inspect your return, refunds are processed within 5–7 business days. Credit/debit card refunds may take an additional 3–5 business days to appear on your statement. PayPal refunds are typically processed within 24 hours.",
      },
      {
        question: "My item arrived damaged — what do I do?",
        answer:
          "We're sorry to hear that! Please contact us within 48 hours of delivery with photos of the damage. We'll arrange a replacement or full refund at no extra cost, including return shipping.",
      },
    ],
  },
  {
    title: "Products",
    items: [
      {
        question: "Do I need to assemble the furniture myself?",
        answer:
          "Most of our furniture is flat-packed and requires some assembly. Each product comes with clear step-by-step instructions and all necessary hardware. Assembly typically takes 30–60 minutes. We recommend having a second person help with larger items.",
      },
      {
        question: "Are the product colours accurate on the website?",
        answer:
          "We do our best to ensure photos are as accurate as possible, but colours can vary slightly depending on your screen settings and lighting. Natural materials like timber will also have unique grain patterns and subtle colour variations — this is a feature, not a defect.",
      },
      {
        question: "How do I care for my furniture?",
        answer:
          "Care instructions vary by material. Generally: dust timber furniture regularly with a soft cloth, vacuum upholstery to remove dust, and wipe metal components with a damp cloth. Avoid direct sunlight and harsh chemicals. See our Warranty page for detailed care tips.",
      },
      {
        question: "Do you offer spare parts?",
        answer:
          "Yes, we carry spare parts and replacement hardware for most of our products. Contact our team with your order number and the part you need, and we'll do our best to help.",
      },
    ],
  },
  {
    title: "Account & Payment",
    items: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept Visa, Mastercard, American Express, PayPal, and Apple Pay. All transactions are processed through secure, PCI-compliant payment gateways.",
      },
      {
        question: "Do I need an account to place an order?",
        answer:
          "While you can browse our products without an account, you'll need to sign in to place an order. Creating an account lets you track orders, save your details for faster checkout, and view your order history.",
      },
      {
        question: "Is my payment information secure?",
        answer:
          "Absolutely. We use SSL/TLS encryption for all transactions, and payment details are processed through PCI DSS-compliant providers. We never store your full card details on our servers.",
      },
    ],
  },
];

function Content() {
  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category.title}>
          <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            {category.title}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {category.items.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Can&apos;t find what you&apos;re looking for? Our team is happy to help.{" "}
          <a
            href="/pages/contact"
            className="font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
          >
            Contact us
          </a>{" "}
          or use the chat assistant in the corner of your screen.
        </p>
      </div>
    </div>
  );
}

export const faqPage: PageContent = {
  meta: {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers to common questions",
    description:
      "Find answers to frequently asked questions about Kozy. orders, shipping, returns, products, and payments.",
  },
  content: Content,
};
