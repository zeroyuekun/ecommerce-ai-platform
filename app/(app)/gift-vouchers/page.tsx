import Link from "next/link";
import { Gift } from "lucide-react";

const voucherAmounts = [50, 100, 150, 200, 500];

export default function GiftVouchersPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Gift Vouchers
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            Give the gift of beautiful furniture. Perfect for any occasion.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <Gift className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
          <h2 className="mt-4 text-xl font-medium text-zinc-900 dark:text-zinc-100">
            Choose an Amount
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Select from our preset amounts or enter a custom value.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {voucherAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              className="border border-zinc-200 bg-white px-4 py-6 text-center transition-all hover:border-zinc-900 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-400"
            >
              <p className="text-2xl font-light text-zinc-900 dark:text-zinc-100">
                ${amount}
              </p>
            </button>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Recipient&apos;s Email
              </label>
              <input
                type="email"
                className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                placeholder="recipient@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Personal Message (optional)
              </label>
              <textarea
                rows={3}
                className="mt-1 w-full border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
                placeholder="Add a personal touch..."
              />
            </div>
            <button
              type="button"
              className="w-full border border-zinc-900 bg-zinc-900 px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-zinc-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100"
            >
              Purchase Gift Voucher
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            How it works
          </h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                1. Choose
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Select a voucher amount and add a personal message.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                2. Send
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                We&apos;ll email the voucher directly to your recipient.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                3. Enjoy
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                They can shop the full Kozy collection online or in-store.
              </p>
            </div>
          </div>

          <div className="mt-8 border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Gift vouchers are valid for 12 months from date of purchase and
              can be used on any product at{" "}
              <Link
                href="/shop"
                className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
              >
                kozy.com.au
              </Link>
              . Vouchers cannot be exchanged for cash.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
