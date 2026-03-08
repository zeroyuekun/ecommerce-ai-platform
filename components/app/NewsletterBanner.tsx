"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/lib/actions/newsletter";

export function NewsletterBanner() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    const result = await subscribeNewsletter(email);
    setMessage(result.message);
    if (result.success) {
      setSubmitted(true);
      setEmail("");
    }
    setLoading(false);
  }

  return (
    <section className="bg-zinc-900 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="text-center sm:text-left sm:shrink-0">
            <h2 className="text-lg font-medium tracking-tight text-white sm:text-xl">
              Get 15% Off Your First Order
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Join our newsletter for early access and exclusive deals.
            </p>
          </div>

          {submitted || message ? (
            <p className={`text-sm font-medium ${submitted ? "text-amber-400" : "text-zinc-300"}`}>
              {message}
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:gap-0"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="h-11 flex-1 border border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 sm:border-r-0"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-11 whitespace-nowrap bg-zinc-900 px-6 text-sm font-medium uppercase tracking-wider text-white border border-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? "Signing up..." : "Claim Offer"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
