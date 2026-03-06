"use client";

import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export function HeroBanner() {
  return (
    <div className="relative w-full min-h-[450px] sm:min-h-[550px] lg:min-h-[620px]">
      {/* Full-width background image */}
      <Image
        src="https://content.api.news/v3/images/bin/b4ea9a457d17d689690773bfbf6594ab"
        alt="Made for Life's Moments - Premium furniture collection"
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />
      <div className="absolute inset-0 bg-black/20" />

      {/* Centered text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            New Collection
          </p>
          <h1 className="mt-4 text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
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
              <Link href="/category/living-room">
                Shop Now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
