import type { PageContent } from "./types";

const posts = [
  {
    title: "5 Ways to Style a Small Living Room",
    excerpt:
      "Living in a compact space doesn't mean sacrificing style. Discover our top tips for making the most of your living room, from multi-functional furniture to clever storage solutions.",
    category: "Style Tips",
    date: "28 February 2026",
    readTime: "4 min read",
  },
  {
    title: "The Ultimate Guide to Choosing a Dining Table",
    excerpt:
      "Round or rectangular? Timber or marble? Seating for 4 or 8? We break down everything you need to know to find the perfect dining table for your home.",
    category: "Product Guides",
    date: "21 February 2026",
    readTime: "6 min read",
  },
  {
    title: "Behind the Scenes: How Kozy. Furniture Is Made",
    excerpt:
      "Take a peek inside our manufacturing process — from material selection to quality testing. Learn what goes into every Kozy. piece before it reaches your home.",
    category: "Behind the Scenes",
    date: "14 February 2026",
    readTime: "5 min read",
  },
  {
    title: "Scandinavian vs. Mid-Century: Which Style Suits You?",
    excerpt:
      "Two of the most popular interior design styles — but which one is right for your space? We compare the key elements and help you decide.",
    category: "Style Tips",
    date: "7 February 2026",
    readTime: "5 min read",
  },
  {
    title: "Room Tour: A Coastal Family Home in Byron Bay",
    excerpt:
      "Step inside this stunning Byron Bay home where relaxed coastal vibes meet modern family living. See how Kozy. pieces bring the whole look together.",
    category: "Room Tours",
    date: "31 January 2026",
    readTime: "3 min read",
  },
  {
    title: "How to Care for Your Timber Furniture",
    excerpt:
      "Timber furniture is an investment that gets better with age — if you look after it. Here are our essential care tips to keep your pieces looking their best for years to come.",
    category: "Product Guides",
    date: "24 January 2026",
    readTime: "4 min read",
  },
];

const categoryColours: Record<string, string> = {
  "Style Tips":
    "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  "Product Guides":
    "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  "Behind the Scenes":
    "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  "Room Tours":
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
};

function Content() {
  return (
    <div className="space-y-10">
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Tips, trends, and inspiration to help you create a home that feels just right. From styling
        guides to behind-the-scenes looks at how our furniture is made.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.title}
            className="group rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColours[post.category] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
              >
                {post.category}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{post.readTime}</span>
            </div>
            <h3 className="font-medium text-zinc-900 group-hover:text-zinc-600 dark:text-zinc-100 dark:group-hover:text-zinc-300 mb-2 leading-snug">
              {post.title}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
              {post.excerpt}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">{post.date}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          More articles coming soon. Stay tuned for weekly updates on styling, product care, and home
          inspiration.
        </p>
      </div>
    </div>
  );
}

export const blogPage: PageContent = {
  meta: {
    title: "Blog",
    subtitle: "Tips, trends, and inspiration for your home",
    description:
      "Read the Kozy. blog for furniture styling tips, room tours, product guides, and behind-the-scenes content.",
  },
  content: Content,
};
