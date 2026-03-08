"use client";

import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export function HeroBanner() {
  return (
    <div className="relative w-full h-screen">
      <Image
        src="https://content.api.news/v3/images/bin/b4ea9a457d17d689690773bfbf6594ab"
        alt="Made for Life's Moments - Premium furniture collection"
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
            New Collection
          </p>
          <h1 className="mt-1.5 text-4xl font-light leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Made for Life&apos;s Moments
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
            Thoughtfully designed furniture that brings warmth and style to every
            room in your home.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              asChild
              className="rounded-none border border-white bg-transparent px-8 py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-white hover:bg-white hover:text-zinc-900 h-auto"
            >
              <Link href="/shop">
                Shop Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoHeroBanner() {
  return (
    <div className="bg-white px-6 sm:px-14 lg:px-24 dark:bg-zinc-950">
    <div className="relative w-full min-h-[550px] sm:min-h-[650px] lg:min-h-[780px] overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="Fresh Foundations - Luxury furniture showroom"
      >
        <source src="/fresh-foundations.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
            New Season
          </p>
          <h2 className="mt-1.5 text-4xl font-light leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Fresh Foundations
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
            Timeless silhouettes crafted from premium materials. Discover pieces
            that anchor every room with effortless style.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              asChild
              className="rounded-none border border-white bg-transparent px-8 py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-white hover:bg-white hover:text-zinc-900 h-auto"
            >
              <Link href="/shop">
                Explore the Collection
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export function SecondaryHeroBanner() {
  return (
    <div className="flex flex-col">
      {/* Dual banners — side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: The Rorie Bed */}
        <Link href="/shop?category=bedroom" className="group relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
          <Image
            src="https://www.decorilla.com/online-decorating/wp-content/uploads/2026/01/Serene-boho-modern-bedroom-before-and-after-story-by-Decorilla-scaled.jpeg"
            alt="The Rorie Bed - Featuring a low-profile bedhead and curved, sheltering form"
            fill
            className="object-cover object-[center_70%]"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center px-6 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                Introducing
              </p>
              <h2 className="mt-1.5 text-3xl font-light leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
                The Rorie Bed
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/80">
                Featuring a low-profile bedhead and curved, sheltering form.
              </p>
              <div className="mt-5 flex justify-center">
                <Button
                  asChild
                  className="rounded-none border border-white bg-transparent px-8 py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-white hover:bg-white hover:text-zinc-900 h-auto"
                >
                  <span>Shop All Beds</span>
                </Button>
              </div>
            </div>
          </div>
        </Link>

        {/* Right: Lighter Living */}
        <Link href="/shop?category=living-room" className="group relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
          <Image
            src="https://www.decorilla.com/online-decorating/wp-content/uploads/2024/12/Minimal-scandi-living-room-design-by-Decorilla-scaled.jpeg"
            alt="Lighter Living - Bright, airy Scandinavian-inspired living room"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/15" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center px-6 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                New Season
              </p>
              <h2 className="mt-1.5 text-3xl font-light leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
                Lighter Living
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/80">
                Airy silhouettes and natural textures for effortless, everyday spaces.
              </p>
              <div className="mt-5 flex justify-center">
                <Button
                  asChild
                  className="rounded-none border border-white bg-transparent px-8 py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-white hover:bg-white hover:text-zinc-900 h-auto"
                >
                  <span>Shop Furniture Sets</span>
                </Button>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Full-width: The Art of Autumn */}
      <Link href="/shop" className="group relative aspect-[16/7] overflow-hidden">
        <Image
          src="https://www.decorilla.com/online-decorating/wp-content/uploads/2023/07/Decorilla-contemporary-earthy-interior-design-1.jpg"
          alt="The Art of Autumn - Warm earthy tones and natural textures"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center px-6 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
              Autumn Lookbook
            </p>
            <h2 className="mt-1.5 text-4xl font-light leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Art of Autumn
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
              Warm wood, rich textures, and earthy tones. Embrace the season with
              pieces that feel as good as they look.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                asChild
                className="rounded-none border border-white bg-transparent px-8 py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-white hover:bg-white hover:text-zinc-900 h-auto"
              >
                <span>Shop Living Room</span>
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
