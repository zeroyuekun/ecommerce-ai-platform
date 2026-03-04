import type { PageContent } from "./types";

const reviews = [
  {
    name: "Sarah M.",
    location: "Sydney, NSW",
    rating: 5,
    product: "Osaka Dining Table",
    text: "Absolutely love this table! The quality is incredible for the price. Assembly was straightforward and it looks stunning in our dining room. We get compliments every time we have guests over.",
    date: "February 2026",
  },
  {
    name: "James T.",
    location: "Melbourne, VIC",
    rating: 5,
    product: "Nordic Bookshelf",
    text: "This bookshelf is exactly what I was looking for — clean lines, sturdy build, and fits perfectly in my home office. The natural oak finish is beautiful. Couldn't be happier.",
    date: "January 2026",
  },
  {
    name: "Emma L.",
    location: "Brisbane, QLD",
    rating: 4,
    product: "Soho Coffee Table",
    text: "Really nice coffee table, looks great in our living room. The only reason for 4 stars is that delivery took a little longer than expected, but the product itself is perfect.",
    date: "January 2026",
  },
  {
    name: "David K.",
    location: "Perth, WA",
    rating: 5,
    product: "Luna Bedside Table",
    text: "Bought two of these for our bedroom and they are gorgeous. The drawers glide smoothly and the matte finish is lovely. Excellent value for money.",
    date: "December 2025",
  },
  {
    name: "Olivia R.",
    location: "Adelaide, SA",
    rating: 5,
    product: "Harper Sofa",
    text: "We took a chance ordering a sofa online and it completely exceeded expectations. The fabric is soft but durable, and it's incredibly comfortable. Our whole family fights for the best spot!",
    date: "December 2025",
  },
  {
    name: "Michael W.",
    location: "Hobart, TAS",
    rating: 4,
    product: "Zen TV Unit",
    text: "Solid piece of furniture with a modern look. Fits our 65-inch TV perfectly. Assembly took about an hour but the instructions were clear. Very happy with the purchase.",
    date: "November 2025",
  },
  {
    name: "Amy C.",
    location: "Canberra, ACT",
    rating: 5,
    product: "Coastal Dining Chairs (Set of 4)",
    text: "These chairs are beautiful and so comfortable. The woven backs add a lovely texture to our dining area. I've already recommended Kozy. to all my friends.",
    date: "November 2025",
  },
  {
    name: "Ben H.",
    location: "Gold Coast, QLD",
    rating: 5,
    product: "Studio Desk",
    text: "Perfect desk for my home office. Spacious enough for dual monitors, with a clean minimalist design. The cable management hole is a nice touch. Great quality timber too.",
    date: "October 2025",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={`star-${i}`}
          className={`h-4 w-4 ${i < rating ? "text-amber-400" : "text-zinc-200 dark:text-zinc-700"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Content() {
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="space-y-10">
      {/* Summary */}
      <div className="flex items-center gap-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-4xl font-medium text-zinc-900 dark:text-zinc-100">{avgRating}</p>
          <StarRating rating={Math.round(Number(avgRating))} />
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Based on {reviews.length} reviews
          </p>
        </div>
        <div className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
          <p>
            Our customers love their Kozy. furniture. We&apos;re proud to maintain an average rating
            of {avgRating} out of 5 stars. Every review helps us improve and helps other customers
            make confident decisions.
          </p>
        </div>
      </div>

      {/* Review grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {reviews.map((review) => (
          <div
            key={`${review.name}-${review.product}`}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{review.name}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{review.location}</p>
              </div>
              <StarRating rating={review.rating} />
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              {review.product}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {review.text}
            </p>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">{review.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const reviewsPage: PageContent = {
  meta: {
    title: "Customer Reviews",
    subtitle: "See what our customers are saying",
    description:
      "Read real reviews from Kozy. customers. See why thousands of Australians trust us for their furniture needs.",
  },
  content: Content,
};
