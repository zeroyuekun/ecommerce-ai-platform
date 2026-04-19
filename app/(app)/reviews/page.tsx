import { Star } from "lucide-react";

const reviews = [
  {
    name: "Sarah M.",
    location: "Sydney, NSW",
    rating: 5,
    title: "Absolutely love my new sofa!",
    text: "The quality exceeded my expectations. Delivery was quick and the team was so helpful with setup. The fabric feels premium and it looks even better in person.",
    date: "2 weeks ago",
    product: "The Rorie Sofa",
  },
  {
    name: "James T.",
    location: "Melbourne, VIC",
    rating: 5,
    title: "Best furniture shopping experience",
    text: "From browsing online to delivery, the whole process was seamless. The dining table is stunning and the craftsmanship is evident in every detail.",
    date: "1 month ago",
    product: "Oak Dining Table",
  },
  {
    name: "Priya K.",
    location: "Brisbane, QLD",
    rating: 4,
    title: "Great quality, stylish design",
    text: "Bought the bookshelf and bedside tables. Both are beautiful and well-made. Took a bit longer to deliver than expected but well worth the wait.",
    date: "1 month ago",
    product: "Walnut Bookshelf",
  },
  {
    name: "David L.",
    location: "Perth, WA",
    rating: 5,
    title: "Transformed our living room",
    text: "We furnished our entire living room with Kozy pieces and couldn't be happier. The cohesive aesthetic and build quality are outstanding.",
    date: "2 months ago",
    product: "Living Room Collection",
  },
  {
    name: "Emma W.",
    location: "Adelaide, SA",
    rating: 5,
    title: "Customer service is top notch",
    text: "Had a question about fabric options and the team responded within hours with swatches. The armchair is perfect in our reading nook.",
    date: "2 months ago",
    product: "Linen Armchair",
  },
  {
    name: "Michael R.",
    location: "Gold Coast, QLD",
    rating: 4,
    title: "Solid and stylish",
    text: "The bed frame is sturdy and looks fantastic. Assembly was straightforward with clear instructions. Very happy with the purchase.",
    date: "3 months ago",
    product: "Timber Bed Frame",
  },
];

export default function ReviewsPage() {
  const averageRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Customer Reviews
          </h1>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div
              className="flex"
              role="img"
              aria-label={`Average rating ${averageRating} out of 5`}
            >
              {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                <Star
                  key={k}
                  aria-hidden
                  className="h-5 w-5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {averageRating}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              ({reviews.length} reviews)
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {reviews.map((review) => (
            <div
              key={review.name}
              className="border-b border-zinc-100 pb-8 last:border-0 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div
                    className="flex gap-0.5"
                    role="img"
                    aria-label={`Rated ${review.rating} out of 5 stars`}
                  >
                    {["s1", "s2", "s3", "s4", "s5"].map((k, starIndex) => (
                      <Star
                        key={k}
                        aria-hidden
                        className={`h-4 w-4 ${
                          starIndex < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-zinc-200 dark:text-zinc-700"
                        }`}
                      />
                    ))}
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {review.title}
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">{review.date}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {review.text}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  {review.name}
                </span>
                <span>&middot;</span>
                <span>{review.location}</span>
                <span>&middot;</span>
                <span>{review.product}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
