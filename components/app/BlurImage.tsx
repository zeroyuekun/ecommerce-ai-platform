"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface BlurImageProps extends Omit<ImageProps, "placeholder" | "blurDataURL"> {
  blurDataURL?: string | null;
}

/**
 * Drop-in replacement for next/image that adds smooth blur-up loading.
 * - With `blurDataURL` (Sanity's asset->metadata.lqip): shows a blurred preview
 *   immediately, then sharpens when the full image arrives.
 * - Without lqip: fades in from transparent over the container background.
 */
export function BlurImage({
  className,
  blurDataURL,
  onLoad,
  ...props
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  if (blurDataURL) {
    // Next.js handles the blur → sharp transition natively via placeholder="blur".
    // We add a subtle opacity fade on top for extra smoothness.
    return (
      <Image
        {...props}
        placeholder="blur"
        blurDataURL={blurDataURL}
        className={cn(
          "transition-opacity duration-700 ease-in-out",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={(e) => {
          setLoaded(true);
          (onLoad as ((e: React.SyntheticEvent<HTMLImageElement>) => void) | undefined)?.(e);
        }}
      />
    );
  }

  // No lqip available: fade in from transparent so images don't pop in
  return (
    <Image
      {...props}
      placeholder="empty"
      className={cn(
        "transition-opacity duration-500 ease-in-out",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
      onLoad={(e) => {
        setLoaded(true);
        (onLoad as ((e: React.SyntheticEvent<HTMLImageElement>) => void) | undefined)?.(e);
      }}
    />
  );
}
