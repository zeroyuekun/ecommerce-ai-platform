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
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            New Collection
          </p>
          <h1 className="mt-1.5 text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
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
    <div className="relative w-full min-h-[450px] sm:min-h-[550px] lg:min-h-[620px] overflow-hidden">
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
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            New Season
          </p>
          <h2 className="mt-1.5 text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
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
  );
}

export function SecondaryHeroBanner() {
  return (
    <div className="relative w-full aspect-[16/7]">
      <Image
        src="https://www.decorilla.com/online-decorating/wp-content/uploads/2026/01/Serene-boho-modern-bedroom-before-and-after-story-by-Decorilla-scaled.jpeg"
        alt="The Rorie Bed - Featuring a low-profile bedhead and curved, sheltering form"
        fill
        className="object-cover object-[center_70%]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/20" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            Introducing
          </p>
          <h2 className="mt-1.5 text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            The Rorie Bed
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
            Featuring a low-profile bedhead and curved, sheltering form.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              asChild
              className="rounded-none border border-white bg-transparent px-8 py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-white hover:bg-white hover:text-zinc-900 h-auto"
            >
              <Link href="/shop?category=bedroom">
                Shop All Beds
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
