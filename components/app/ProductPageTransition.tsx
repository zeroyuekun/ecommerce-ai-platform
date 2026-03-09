"use client";

import { useEffect, useState, useRef } from "react";

interface ProductPageTransitionProps {
  productSlug: string;
  children: React.ReactNode;
}

export function ProductPageTransition({
  productSlug,
  children,
}: ProductPageTransitionProps) {
  const [opacity, setOpacity] = useState(1);
  const prevSlugRef = useRef(productSlug);

  useEffect(() => {
    if (productSlug !== prevSlugRef.current) {
      // New content has arrived from server — brief fade-in
      setOpacity(0);
      // Force a repaint so the browser registers opacity:0 before transitioning to 1
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1);
          prevSlugRef.current = productSlug;
        });
      });
    }
  }, [productSlug]);

  return (
    <div
      className="transition-opacity duration-300 ease-out"
      style={{ opacity }}
    >
      {children}
    </div>
  );
}
