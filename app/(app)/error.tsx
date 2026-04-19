"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
        Something went wrong
      </h2>
      <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        We couldn&apos;t load this page. Please try again or head back to the
        homepage.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="border border-zinc-200 px-6 py-2 text-xs font-medium uppercase tracking-[0.15em] text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Try Again
        </button>
        <a
          href="/"
          className="border border-zinc-900 bg-zinc-900 px-6 py-2 text-xs font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
