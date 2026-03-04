import type { PageContent } from "./types";

function Content() {
  return (
    <div className="space-y-10 text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          How It All Started
        </h2>
        <p className="mb-3">
          Kozy. was born out of a simple frustration: why does good-looking furniture have to cost a
          fortune? In 2018, our founders set out to prove that beautiful, well-made furniture could
          be accessible to everyone — not just those with designer budgets.
        </p>
        <p>
          What started as a small online store operating out of a Brisbane garage has grown into a
          brand loved by thousands of Australian homes. But our mission hasn&apos;t changed: to help
          you create a space that feels like home, without the hefty price tag.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          What We Believe In
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Affordable Design
            </h3>
            <p className="text-sm">
              We cut out the middleman and work directly with manufacturers to bring you
              quality pieces at honest prices. No markups, no gimmicks — just great value.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Quality Materials
            </h3>
            <p className="text-sm">
              Every Kozy. piece is crafted from carefully selected materials — solid timbers,
              premium fabrics, and durable hardware that&apos;s built to last through the everyday
              moments of life.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              Thoughtful Living
            </h3>
            <p className="text-sm">
              We design with real life in mind — growing families, small apartments, first homes.
              Our furniture is practical, versatile, and designed to fit the way you actually live.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Direct to You
        </h2>
        <p className="mb-3">
          By selling directly to you online, we&apos;re able to offer furniture at prices that are
          typically 30–50% less than traditional retail. No showroom overheads, no chain of
          middlemen — just great furniture delivered straight to your door.
        </p>
        <p>
          We also believe in transparency. Every product page shows you exactly what you&apos;re
          getting — accurate dimensions, honest photos, and real customer reviews. Because you
          deserve to know what you&apos;re buying before it arrives.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Designing for Australian Homes
        </h2>
        <p className="mb-3">
          We know Australian homes. From inner-city apartments to coastal retreats, suburban family
          homes to country properties — we design our collections to suit the diverse ways
          Australians live.
        </p>
        <p>
          Our in-house design team draws inspiration from Scandinavian simplicity, mid-century
          warmth, and the relaxed Australian lifestyle. The result? Furniture that&apos;s
          contemporary without being trendy, and timeless without being boring.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-4">
          Looking Forward
        </h2>
        <p className="mb-3">
          We&apos;re committed to doing better — for our customers, our team, and the planet.
          We&apos;re actively working on reducing our environmental footprint through sustainable
          sourcing, recyclable packaging, and carbon-offset shipping.
        </p>
        <p>
          Whether you&apos;re furnishing your first apartment or refreshing your family home,
          we&apos;re here to help you make it feel like home. Welcome to Kozy.
        </p>
      </section>
    </div>
  );
}

export const storyPage: PageContent = {
  meta: {
    title: "Our Story",
    subtitle: "Affordable, stylish furniture for every Australian home",
    description:
      "Learn about Kozy. — how we started, what we believe in, and why we're passionate about making beautiful furniture accessible to everyone.",
  },
  content: Content,
};
