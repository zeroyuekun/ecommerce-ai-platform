import Link from "next/link";

const posts = [
  {
    title: "5 Tips for Styling Your Living Room",
    excerpt:
      "Create a space that feels both inviting and stylish with these expert tips on furniture arrangement, colour palettes, and accessorising.",
    date: "February 28, 2026",
    category: "Interior Design",
    readTime: "5 min read",
  },
  {
    title: "The Art of Scandinavian Minimalism",
    excerpt:
      "Discover how to embrace the clean lines, natural materials, and functional beauty that define Scandinavian design philosophy.",
    date: "February 15, 2026",
    category: "Design Trends",
    readTime: "4 min read",
  },
  {
    title: "Choosing the Perfect Dining Table",
    excerpt:
      "From size and shape to material and finish, here's everything you need to know to find the dining table that suits your home.",
    date: "January 30, 2026",
    category: "Buying Guides",
    readTime: "6 min read",
  },
  {
    title: "Sustainable Furniture: What to Look For",
    excerpt:
      "Learn about sustainable materials, ethical manufacturing, and how to make environmentally conscious choices for your home.",
    date: "January 12, 2026",
    category: "Sustainability",
    readTime: "5 min read",
  },
  {
    title: "Small Space, Big Style",
    excerpt:
      "Maximise your small living space with clever furniture choices and arrangement techniques that make every square metre count.",
    date: "December 20, 2025",
    category: "Interior Design",
    readTime: "4 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Blog
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-500 dark:text-zinc-400">
            Design inspiration, buying guides, and tips for creating your
            perfect home.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-10">
          {posts.map((post) => (
            <article
              key={post.title}
              className="group border-b border-zinc-100 pb-10 last:border-0 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {post.category}
                </span>
                <span>&middot;</span>
                <span>{post.date}</span>
                <span>&middot;</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="mt-3 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                {post.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {post.excerpt}
              </p>
              <Link
                href="#"
                className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
              >
                Read more
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
