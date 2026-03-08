import Link from "next/link";
import Image from "next/image";
import { Hand, Leaf, Shield, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

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
            <h1 className="mt-4 text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              Our Story
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
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
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                Design Philosophy
              </p>
              <h2 className="mt-4 text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              Quality & Craftsmanship
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Built to Last a Lifetime
            </h2>
            <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              From the selection of raw materials to the final finishing touches,
              we maintain the highest standards of quality. Our furniture is
              designed in Australia and crafted using time-honoured techniques
              combined with modern innovation.
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
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                Sustainability
              </p>
              <h2 className="mt-4 text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
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

      {/* Values Grid */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            Why Choose Kozy
          </p>
          <h2 className="mt-4 text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Our Promise to You
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Hand,
              title: "Handcrafted Quality",
              description:
                "Every piece is crafted with care by skilled artisans using time-honoured techniques.",
            },
            {
              icon: Leaf,
              title: "Sustainably Made",
              description:
                "Responsibly sourced materials and eco-friendly practices across our entire supply chain.",
            },
            {
              icon: Shield,
              title: "Built to Last",
              description:
                "Premium materials and construction methods designed to stand the test of time.",
            },
            {
              icon: Truck,
              title: "White Glove Delivery",
              description:
                "Complimentary delivery and setup in your home by our expert team.",
            },
          ].map((value) => (
            <div key={value.title} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <value.icon className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
              </div>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                {value.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Visit Our Stores */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
              Visit Us
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
              Our Showrooms
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-zinc-500 dark:text-zinc-400">
              Experience Kozy in person. Visit one of our showrooms across
              Australia and find your perfect piece.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { city: "Sydney", image: "/stores/sydney.jpg" },
              { city: "Melbourne", image: "/stores/melbourne.jpg" },
              { city: "Brisbane", image: "/stores/brisbane.jpg" },
              { city: "Perth", image: "/stores/perth.jpg" },
              { city: "Adelaide", image: "/stores/adelaide.jpg" },
              { city: "Gold Coast", image: "/stores/goldcoast.jpg" },
            ].map((store) => (
              <div key={store.city} className="group relative aspect-[3/2] overflow-hidden">
                <Image
                  src={store.image}
                  alt={`Kozy ${store.city} showroom`}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/30" />
                <div className="absolute inset-0 flex items-end p-6">
                  <h3 className="text-lg font-medium text-white">
                    {store.city}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            Ready to Find Your Perfect Piece?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-zinc-500 dark:text-zinc-400">
            Explore our full collection of thoughtfully designed furniture for
            every room in your home.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="rounded-none border border-zinc-900 bg-zinc-900 px-10 py-3 text-[13px] font-medium uppercase tracking-[0.15em] text-white hover:bg-transparent hover:text-zinc-900 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-transparent dark:hover:text-zinc-100 h-auto"
            >
              <Link href="/shop">Shop Our Collection</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
