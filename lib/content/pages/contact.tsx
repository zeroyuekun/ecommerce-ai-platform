import { Phone, Mail, MessageCircle } from "lucide-react";
import type { PageContent } from "./types";

function Content() {
  return (
    <div className="space-y-10 text-zinc-600 dark:text-zinc-400 leading-relaxed">
      {/* Contact methods */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Phone className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Call Us</h3>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">1800 KOZY</p>
          <p className="text-xs mt-1">Mon–Fri, 9am–5pm AEST</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Mail className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Email Us</h3>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">hello@kozy.com.au</p>
          <p className="text-xs mt-1">We reply within 24 hours</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <MessageCircle className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Live Chat</h3>
          <p className="text-sm">Use the chat icon in the bottom right corner</p>
          <p className="text-xs mt-1">AI assistant available 24/7</p>
        </div>
      </div>

      {/* Business hours */}
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Business Hours
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr>
                <td className="py-2.5 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                  Monday – Friday
                </td>
                <td className="py-2.5">9:00am – 5:00pm AEST</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                  Saturday
                </td>
                <td className="py-2.5">10:00am – 2:00pm AEST</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                  Sunday &amp; Public Holidays
                </td>
                <td className="py-2.5">Closed</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          Our AI shopping assistant is available 24/7 via the chat icon and can help with product
          recommendations, order tracking, and general enquiries.
        </p>
      </section>

      {/* Common enquiries */}
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Common Enquiries
        </h2>
        <p className="mb-3">Before reaching out, you might find your answer on one of these pages:</p>
        <ul className="space-y-2">
          <li>
            <a
              href="/pages/faq"
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Frequently Asked Questions
            </a>{" "}
            — Quick answers to common questions
          </li>
          <li>
            <a
              href="/pages/shipping-returns"
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Shipping &amp; Delivery
            </a>{" "}
            — Delivery times, tracking, and rates
          </li>
          <li>
            <a
              href="/pages/returns"
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Returns &amp; Exchanges
            </a>{" "}
            — How to return or exchange an item
          </li>
          <li>
            <a
              href="/pages/warranty"
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Warranty Information
            </a>{" "}
            — Details on our 365-day warranty
          </li>
        </ul>
      </section>

      {/* Postal address */}
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Postal Address
        </h2>
        <p className="text-sm">
          Kozy. Furniture Pty Ltd
          <br />
          123 Homeware Lane
          <br />
          Fortitude Valley, QLD 4006
          <br />
          Australia
        </p>
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          Please note: This is our business address only. We do not have a physical showroom for
          walk-in customers.
        </p>
      </section>
    </div>
  );
}

export const contactPage: PageContent = {
  meta: {
    title: "Contact Us",
    subtitle: "We're here to help",
    description:
      "Get in touch with the Kozy. team. Call, email, or chat with us. We're here to help with orders, products, and everything in between.",
  },
  content: Content,
};
