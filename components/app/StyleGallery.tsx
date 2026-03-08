"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { X, Hand, Leaf, Shield, Truck } from "lucide-react";

const originalGalleryImages = [
  { src: "https://cdn.decorilla.com/online-decorating/wp-content/uploads/2024/01/High-end-brands-furniture-Cameron-Design-House-1024x574.jpeg?width=900", alt: "High end brands furniture - Cameron Design House" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-brands-furniture-Amelia-R-750x.jpeg", alt: "High end brands furniture - Amelia R" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/Best-high-end-furniture-companies-in-a-contemporary-dining-room-Katerina-P-750x.jpeg", alt: "High end furniture in a contemporary dining room - Katerina P" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-brands-furniture-Meral-Y-750x.jpeg", alt: "High end brands furniture - Meral Y" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-furniture-websites-Dina-H-750x.jpeg", alt: "High end furniture - Dina H" },
  { src: "https://www.decorilla.com/online-decorating/wp-content/uploads/2026/01/Serene-boho-modern-bedroom-interior-by-Decorilla.jpg", alt: "Serene boho modern bedroom interior by Decorilla" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-furniture-retailers-Sonia-C-750x.jpg", alt: "High end furniture retailers - Sonia C" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-furniture-stores-near-me-Kelly-Wearstler-750x.jpg", alt: "High end furniture - Kelly Wearstler" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-furniture-outlet-Nathalie-I-750x.jpeg", alt: "High end furniture outlet - Nathalie I" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/Best-high-end-furniture-stores-Tov-Furniture-750x.jpg", alt: "Best high end furniture stores - Tov Furniture" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/Best-high-end-furniture-Erin-R-750x.jpg", alt: "Best high end furniture - Erin R" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-furniture-retailers-Natuzzi-750x.jpg", alt: "High end furniture retailers - Natuzzi" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/High-end-furniture-stores-near-me-Arlen-A-750x.jpg", alt: "High end furniture stores - Arlen A" },
  { src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2022/07/Best-high-end-furniture-stores-Vitra-750x.jpg", alt: "Best high end furniture stores - Vitra" },
];

const craftmanshipImages = [
  {
    src: "https://www.decorilla.com/online-decorating/wp-content/uploads/2026/01/Serene-modern-bedroom-by-Decorilla-designer-Sharene-M.jpg",
    alt: "Serene modern bedroom by Decorilla designer Sharene M",
  },
  {
    src: "https://www.decorilla.com/online-decorating/wp-content/uploads/2023/05/Bohemian-bedroom-interior-by-Decorilla.jpg",
    alt: "Bohemian bedroom interior by Decorilla",
  },
  {
    src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2024/02/Organic-open-plan-living-room-with-furnishings-from-Black-owned-furniture-stores-by-Decorilla-designer-Leanna-S-2048x1362.jpg",
    alt: "Organic open plan living room by Decorilla designer Leanna S",
  },
  {
    src: "https://cdn-bnokp.nitrocdn.com/QNoeDwCprhACHQcnEmHgXDhDpbEOlRHH/assets/images/optimized/rev-a662fd0/www.decorilla.com/online-decorating/wp-content/uploads/2024/02/Curated-living-room-with-furnishings-from-Black-owned-furniture-stores-by-Decorilla-designer-Catherine-W-2048x2048.jpg",
    alt: "Curated living room by Decorilla designer Catherine W",
  },
];

function useShuffledOrder(count: number) {
  return useMemo(() => {
    const indices = Array.from({ length: count }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [count]);
}

export function StyleGallery() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set());
  const [craftVisible, setCraftVisible] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const craftRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const hasCraftAnimated = useRef(false);
  const shuffledOrder = useShuffledOrder(originalGalleryImages.length);

  const openLightbox = useCallback((index: number) => {
    setSelectedImage(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedImage(null);
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          shuffledOrder.forEach((imageIndex, order) => {
            setTimeout(() => {
              setVisibleImages((prev) => new Set([...prev, imageIndex]));
            }, order * 150);
          });
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shuffledOrder]);

  useEffect(() => {
    const el = craftRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasCraftAnimated.current) {
          hasCraftAnimated.current = true;
          setCraftVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white pt-12 pb-8 dark:bg-zinc-950">
      {/* Original 14-image grid */}
      <div className="mx-auto max-w-2xl px-4 pb-8 text-center sm:px-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          Your Style, Our Pieces
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Explore curated interiors for furniture inspiration
        </p>
      </div>

      <div ref={gridRef} className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 space-y-2">
        {/* Top section: 5 equal cols, big-left spans 2x2 */}
        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-2 row-span-2">
            <GalleryImage image={originalGalleryImages[0]} onClick={() => openLightbox(0)} visible={visibleImages.has(0)} />
          </div>
          {originalGalleryImages.slice(1, 7).map((img, i) => (
            <GalleryImage key={i} image={img} onClick={() => openLightbox(i + 1)} visible={visibleImages.has(i + 1)} />
          ))}
        </div>

        {/* Bottom section: 5 equal cols, big-right spans 2x2 */}
        <div className="grid grid-cols-5 gap-2">
          {originalGalleryImages.slice(7, 13).map((img, i) => (
            <GalleryImage key={i} image={img} onClick={() => openLightbox(i + 7)} visible={visibleImages.has(i + 7)} />
          ))}
          <div className="col-span-2 row-span-2" style={{ gridColumn: '4 / 6', gridRow: '1 / 3' }}>
            <GalleryImage image={originalGalleryImages[13]} onClick={() => openLightbox(13)} visible={visibleImages.has(13)} />
          </div>
        </div>
      </div>

      {/* Tradition of Craftmanship section */}
      <div className="mx-auto max-w-2xl px-4 pt-20 pb-14 text-center sm:px-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          The Tradition of Craftmanship
        </h2>
      </div>

      <div ref={craftRef} className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-end gap-6 pb-16">
          {craftmanshipImages.map((img, i) => {
            const isOdd = i % 2 === 0;
            return (
              <div
                key={i}
                className="relative w-1/4 overflow-hidden h-[260px] sm:h-[370px]"
                style={{
                  marginBottom: isOdd ? "4rem" : "0",
                  transform: craftVisible
                    ? "translateY(0)"
                    : isOdd
                      ? "translateY(50px)"
                      : "translateY(-50px)",
                  opacity: craftVisible ? 1 : 0,
                  transition: `transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) ${i * 200}ms, opacity 0.9s ease-out ${i * 200}ms`,
                }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 260px"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Why Choose Kozy */}
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold uppercase tracking-[0.15em] text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            Why Choose Kozy
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Furniture that feels like home. We put quality materials and thoughtful design into every piece, so you can create spaces you actually want to spend time in.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-y-8 gap-x-6 sm:grid-cols-4">
          {[
            { icon: Hand, title: "Handcrafted", desc: "Made by skilled artisans" },
            { icon: Leaf, title: "Sustainable", desc: "Responsibly sourced materials" },
            { icon: Shield, title: "Built to Last", desc: "Premium quality guaranteed" },
            { icon: Truck, title: "Free Delivery", desc: "White-glove service included" },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center text-center">
              <item.icon className="h-6 w-6 text-zinc-900 dark:text-zinc-100" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200" />
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 animate-in fade-in duration-300 delay-150"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="relative animate-in zoom-in-50 duration-500 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={originalGalleryImages[selectedImage].src.replace(/w=\d+/, 'w=1200')}
              alt={originalGalleryImages[selectedImage].alt}
              className="max-h-[85vh] max-w-[85vw] object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface GalleryImageProps {
  image: { src: string; alt: string };
  onClick: () => void;
  visible: boolean;
}

function GalleryImage({ image, onClick, visible }: GalleryImageProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-square w-full bg-zinc-100 dark:bg-zinc-800 cursor-pointer hover:z-10"
      style={{
        transform: visible ? "scale(1)" : "scale(0)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out",
      }}
      onMouseEnter={(e) => {
        if (visible) e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        if (visible) e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 20vw"
      />
    </button>
  );
}
