import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero Section — full-width image with overlay */}
      <div className="relative h-[60vh] min-h-[400px] w-full">
        <Image
          src="https://www.decorilla.com/online-decorating/wp-content/uploads/2025/02/Contemporary-trendy-living-room-interior-design-styles-by-Decorilla-designer-Leanna-S.jpeg"
          alt="Kozy — Thoughtfully designed furniture"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">
              About Kozy
            </p>
            <h1 className="mt-4 text-4xl font-light leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Story Behind Kozy
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
              How a passion for honest design and quality craftsmanship became
              Australia&apos;s home for modern living.
            </p>
          </div>
        </div>
      </div>

      {/* Our Story — image left, text right */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src="https://www.decorilla.com/online-decorating/wp-content/uploads/2025/02/Modern-farmhouse-living-room-decor-around-a-TV-by-Decorilla-scaled.jpeg"
              alt="Kozy living room furniture"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400">
              Our Story
            </p>
            <h2 className="mt-4 text-3xl font-light leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Born from a Simple Belief
            </h2>
            <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Kozy was founded in Sydney, Australia with a simple idea: everyone
              deserves a home that feels like a sanctuary. We set out to create
              furniture that blends timeless design with modern functionality —
              pieces you&apos;ll love for years to come.
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              What started as a small studio has grown into a destination for
              those who believe that great design should be accessible, not
              exclusive. Every piece we create tells a story of craftsmanship,
              care, and intention.
            </p>
          </div>
        </div>
      </div>

      {/* Design Philosophy — text left, image right */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="order-2 max-w-xl lg:order-1">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400">
                Design Philosophy
              </p>
              <h2 className="mt-4 text-3xl font-light leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                Where Form Meets Function
              </h2>
              <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                We believe in the power of thoughtful design. Every piece in our
                collection is carefully curated to bring warmth, comfort, and
                style to your living spaces. Clean lines, natural materials, and
                a neutral palette define the Kozy aesthetic.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                Our designers draw inspiration from the Australian landscape —
                the warmth of natural timber, the softness of coastal textures,
                and the calm of open spaces. The result is furniture that feels
                both modern and timeless.
              </p>
            </div>
            <div className="relative order-1 aspect-[4/5] overflow-hidden lg:order-2">
              <Image
                src="https://www.decorilla.com/online-decorating/wp-content/uploads/2024/04/luxury-master-bathroom-renovation-scaled.jpeg"
                alt="Kozy design philosophy"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full-width quote banner */}
      <div className="relative h-[50vh] min-h-[350px] w-full">
        <Image
          src="https://www.decorilla.com/online-decorating/wp-content/uploads/2025/01/Romantic-living-room-ideas-by-Decorilla-designer-Lacy-H-scaled.jpg"
          alt="Kozy interior design"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-3xl px-6 text-center">
            <blockquote className="text-2xl font-light italic leading-relaxed text-white sm:text-3xl lg:text-4xl">
              &ldquo;A home should be a collection of things you love, brought
              together in a way that feels entirely your own.&rdquo;
            </blockquote>
          </div>
        </div>
      </div>

      {/* Quality & Craftsmanship — image left, text right */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src="https://www.decorilla.com/online-decorating/wp-content/uploads/2026/01/Custom-curated-open-plan-living-room-interior-design-by-Decorilla-designer-Megan-W-scaled.jpg"
              alt="Kozy showroom and craftsmanship"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400">
              Quality & Craftsmanship
            </p>
            <h2 className="mt-4 text-3xl font-light leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Built to Last a Lifetime
            </h2>
            <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              From the selection of raw materials to the final finishing
              touches, we maintain the highest standards of quality. Our
              furniture is designed in Australia and crafted using time-honoured
              techniques combined with modern innovation.
            </p>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              We work with skilled artisans who share our passion for
              excellence. Every joint, every stitch, every surface is crafted
              with care — because the details are what make a house a home.
            </p>
          </div>
        </div>
      </div>

      {/* Sustainability — text left, image right */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="order-2 max-w-xl lg:order-1">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-zinc-400">
                Sustainability
              </p>
              <h2 className="mt-4 text-3xl font-light leading-[1.15] tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                Caring for Tomorrow
              </h2>
              <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                We&apos;re committed to reducing our environmental footprint. We
                source responsibly, use eco-friendly packaging, and partner with
                manufacturers who share our values. Because caring for the
                planet is part of caring for your home.
              </p>
              <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                From sustainably harvested timber to recycled metals and
                low-impact fabrics, every material is chosen with intention. Our
                goal is to create furniture that&apos;s beautiful today and
                responsible for the future.
              </p>
            </div>
            <div className="relative order-1 aspect-[4/5] overflow-hidden lg:order-2">
              <Image
                src="https://www.decorilla.com/online-decorating/wp-content/uploads/2021/02/Spring-decorating-ideas-by-Decorilla-scaled.jpeg"
                alt="Sustainable design at Kozy"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
