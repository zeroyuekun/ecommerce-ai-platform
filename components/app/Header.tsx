"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MapPin, Package, Search, ShoppingCart, User } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { useCartActions, useTotalItems } from "@/lib/store/cart-store-provider";
import { recordSearch, getPopularSearches } from "@/lib/actions/search";
import type { ALL_CATEGORIES_QUERYResult } from "@/sanity.types";

const subcategoriesMap: Record<string, { label: string; query: string }[]> = {
  "living-room": [
    { label: "Sofas & Sectionals", query: "sofa" },
    { label: "Coffee Tables", query: "coffee table" },
    { label: "Accent Chairs", query: "accent chair" },
    { label: "TV Stands & Media", query: "tv stand" },
    { label: "Side Tables", query: "side table" },
    { label: "Bookshelves", query: "bookshelf" },
  ],
  "dining-room": [
    { label: "Dining Tables", query: "dining table" },
    { label: "Dining Chairs", query: "dining chair" },
    { label: "Bar Stools", query: "bar stool" },
    { label: "Sideboards & Buffets", query: "sideboard" },
    { label: "Dining Sets", query: "dining set" },
    { label: "Benches", query: "bench" },
  ],
  "bedroom": [
    { label: "Beds & Frames", query: "bed" },
    { label: "Bedside Tables", query: "bedside table" },
    { label: "Wardrobes", query: "wardrobe" },
    { label: "Dressers", query: "dresser" },
    { label: "Mattresses", query: "mattress" },
    { label: "Mirrors", query: "mirror" },
  ],
  "baby": [
    { label: "Cots & Cribs", query: "cot" },
    { label: "Changing Tables", query: "changing table" },
    { label: "Nursery Chairs", query: "nursery chair" },
    { label: "Storage & Shelving", query: "storage" },
    { label: "Baby Dressers", query: "dresser" },
  ],
  "kids": [
    { label: "Kids Beds", query: "kids bed" },
    { label: "Desks & Chairs", query: "desk" },
    { label: "Bunk Beds", query: "bunk bed" },
    { label: "Toy Storage", query: "toy storage" },
    { label: "Bookshelves", query: "bookshelf" },
  ],
  "youth": [
    { label: "Teen Beds", query: "teen bed" },
    { label: "Study Desks", query: "study desk" },
    { label: "Lounge Seating", query: "lounge" },
    { label: "Shelving & Storage", query: "shelving" },
    { label: "Wardrobes", query: "wardrobe" },
  ],
  "outdoor": [
    { label: "Outdoor Lounges", query: "outdoor lounge" },
    { label: "Dining Sets", query: "outdoor dining" },
    { label: "Garden Chairs", query: "garden chair" },
    { label: "Patio Tables", query: "patio table" },
    { label: "Sun Loungers", query: "sun lounger" },
    { label: "Parasols & Shade", query: "parasol" },
  ],
  "lighting-decor": [
    { label: "Table Lamps", query: "table lamp" },
    { label: "Floor Lamps", query: "floor lamp" },
    { label: "Pendant Lights", query: "pendant" },
    { label: "Wall Art", query: "wall art" },
    { label: "Candles & Holders", query: "candle" },
    { label: "Vases & Planters", query: "vase" },
  ],
  "office-storage": [
    { label: "Office Desks", query: "office desk" },
    { label: "Office Chairs", query: "office chair" },
    { label: "Filing Cabinets", query: "filing cabinet" },
    { label: "Shelving Units", query: "shelving" },
    { label: "Storage Boxes", query: "storage box" },
    { label: "Desk Accessories", query: "desk accessories" },
  ],
  "furniture-sets": [
    { label: "Living Room Sets", query: "living room set" },
    { label: "Bedroom Sets", query: "bedroom set" },
    { label: "Dining Sets", query: "dining set" },
    { label: "Office Sets", query: "office set" },
    { label: "Outdoor Sets", query: "outdoor set" },
  ],
};

const defaultSuggestions = [
  { label: "Bedside table", query: "bedside table" },
  { label: "Sofa", query: "sofa" },
  { label: "Dining table", query: "dining table" },
  { label: "Bookshelf", query: "bookshelf" },
  { label: "Office desk", query: "office desk" },
  { label: "Outdoor lounge", query: "outdoor lounge" },
  { label: "Kids bed", query: "kids bed" },
  { label: "Coffee table", query: "coffee table" },
];

interface HeaderProps {
  categories: ALL_CATEGORIES_QUERYResult;
}

export function Header({ categories }: HeaderProps) {
  const categoryLinks = categories.map((cat) => ({
    label: cat.title ?? "",
    slug: cat.slug ?? "",
    image: cat.image?.asset?.url ?? "",
    subcategories: subcategoriesMap[cat.slug ?? ""] ?? [],
  }));
  const { openCart } = useCartActions();
  const totalItems = useTotalItems();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(!isHome);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [popularSearches, setPopularSearches] = useState(defaultSuggestions);
  const lastScrollY = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCategoryData = activeCategory
    ? categoryLinks.find((c) => c.slug === activeCategory)
    : null;

  const handleCategoryHover = useCallback((slug: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setActiveCategory(slug);
  }, []);

  const handleCategoryLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveCategory(null);
    }, 150);
  }, []);

  const showDropdown = isFocused && !searchQuery;

  // Fetch popular searches on mount
  useEffect(() => {
    getPopularSearches().then((results) => {
      if (results.length > 0) {
        setPopularSearches(
          results.map((r) => ({
            label: r.query.charAt(0).toUpperCase() + r.query.slice(1),
            query: r.query,
          }))
        );
      }
    });
  }, []);

  // Cleanup hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Reset state on route change
  useEffect(() => {
    if (!isHome) {
      setSolid(true);
    } else {
      setSolid(false);
    }
    setHidden(false);
  }, [isHome]);

  // Scroll behavior: both homepage and other pages hide on scroll down, show on scroll up
  // Homepage: transparent at top + while hiding, solid when reappearing
  // Other pages: always solid
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (delta > 5 && currentY > 10) {
        // Scrolling down — hide header
        setHidden(true);
        if (isHome) setSolid(false);
      } else if (delta < -5) {
        // Scrolling up — show header
        setHidden(false);
        if (isHome) setSolid(currentY > 100);
      }

      // Homepage: always transparent at the very top
      if (isHome && currentY < 10) {
        setHidden(false);
        setSolid(false);
      }

      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const trimmed = searchQuery.trim();
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
    recordSearch(trimmed);
    inputRef.current?.blur();
    setIsFocused(false);
  };

  const handleSuggestionClick = (query: string) => {
    setSearchQuery(query);
    setIsFocused(false);
    router.push(`/shop?q=${encodeURIComponent(query)}`);
    recordSearch(query);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${hidden ? "-translate-y-full" : "translate-y-0"} ${!solid ? "bg-transparent" : "bg-white/95 backdrop-blur-md shadow-sm dark:bg-zinc-950/95"}`}>
      {/* Main header row */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Left: Logo */}
        <a href="/" className="flex shrink-0 items-center">
          <span className={`text-3xl font-bold tracking-tight transition-colors duration-500 ${!solid ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
            Kozy.
          </span>
        </a>

        {/* Center: Search bar */}
        <form onSubmit={handleSearch} className="absolute left-1/2 z-50 hidden -translate-x-1/2 sm:block w-[40%] lg:w-[35%]">
          <div className="relative">
            <Search className={`absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-500 ${!solid ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`} />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Search"
              className={`w-full border-0 border-b-2 bg-transparent py-2.5 pl-6 pr-4 text-sm transition-colors focus:outline-none ${!solid ? "border-white/60 text-white placeholder:text-white/60 focus:border-white" : "border-zinc-900 text-zinc-900 placeholder:text-zinc-400 focus:border-black dark:border-zinc-100 dark:text-zinc-100 dark:focus:border-white"}`}
            />

            {/* Search suggestions dropdown */}
            {showDropdown && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full z-50 mt-1 border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 animate-in slide-in-from-top-2 fade-in duration-200"
              >
                <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Popular searches
                </p>
                {popularSearches.map((s) => (
                  <button
                    key={s.query}
                    type="button"
                    onMouseDown={() => handleSuggestionClick(s.query)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Right: Icons */}
        <div className={`flex shrink-0 items-center gap-1 transition-colors duration-500 ${!solid ? "[&_svg]:text-white [&_button]:text-white" : ""}`}>
          {/* Location */}
          <Button variant="ghost" size="icon" className="hover:bg-transparent dark:hover:bg-transparent" asChild>
            <Link href="/store-locations" title="Store Location">
              <MapPin className="h-5 w-5" />
              <span className="sr-only">Store locator</span>
            </Link>
          </Button>

          {/* My Orders icon */}
          <SignedIn>
            <Button variant="ghost" size="icon" className="hover:bg-transparent dark:hover:bg-transparent" asChild>
              <Link href="/orders" title="My Orders">
                <Package className="h-5 w-5" />
                <span className="sr-only">My Orders</span>
              </Link>
            </Button>
          </SignedIn>

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative cursor-pointer hover:bg-transparent dark:hover:bg-transparent"
            title="Shopping Cart"
            onClick={openCart}
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium ${!solid ? "bg-white text-zinc-900" : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"}`}>
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
            <span className="sr-only">Open cart ({totalItems} items)</span>
          </Button>

          {/* Dark mode */}
          <ThemeToggle />

          {/* User */}
          <SignedIn>
            <UserButton
              afterSwitchSessionUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="My Orders"
                  labelIcon={<Package className="h-4 w-4" />}
                  href="/orders"
                />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost" size="icon" className="hover:bg-transparent dark:hover:bg-transparent" title="Sign In">
                <User className="h-5 w-5" />
                <span className="sr-only">Sign in</span>
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      {/* Category navigation with mega dropdown */}
      <nav
        className={`relative transition-colors duration-500 ${!solid ? "" : "border-b border-zinc-200 dark:border-zinc-800"}`}
        onMouseLeave={handleCategoryLeave}
      >
        <div className="flex items-center justify-center gap-6 overflow-x-auto px-4 py-2.5 sm:px-6 lg:gap-8 lg:px-8 scrollbar-hide">
          {categoryLinks.map((cat) => (
            <div
              key={cat.slug}
              className="relative"
              onMouseEnter={() => handleCategoryHover(cat.slug)}
            >
              <Link
                href={`/shop?category=${cat.slug}`}
                onClick={() => setActiveCategory(null)}
                className={`group relative whitespace-nowrap text-[13px] font-medium tracking-wide transition-colors ${
                  !solid
                    ? activeCategory === cat.slug ? "text-white" : "text-white/80 hover:text-white"
                    : activeCategory === cat.slug ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                }`}
              >
                {cat.label}
                <span
                  className={`absolute -bottom-2.5 left-1/2 h-[2px] -translate-x-1/2 transition-all duration-300 ${!solid ? "bg-white" : "bg-zinc-900 dark:bg-zinc-100"} ${
                    activeCategory === cat.slug ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            </div>
          ))}
        </div>

        {/* Full-width mega dropdown — Crate & Barrel style */}
        {activeCategoryData && (
          <div
            className="absolute left-0 right-0 top-full z-50 origin-top bg-white shadow-xl dark:bg-zinc-950 animate-in fade-in slide-in-from-top-3 duration-300 ease-out"
            onMouseEnter={() => handleCategoryHover(activeCategoryData.slug)}
            onMouseLeave={handleCategoryLeave}
          >
            <div className="mx-auto flex max-w-7xl gap-10 px-8 py-9 lg:px-12">
              {/* Left: subcategory links in three columns */}
              <div className="flex-1">
                <p className="mb-5 text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                  {activeCategoryData.label}
                </p>
                <div className="grid grid-cols-3 gap-x-10 gap-y-0">
                  {activeCategoryData.subcategories.map((sub) => (
                    <Link
                      key={sub.query}
                      href={`/shop?category=${activeCategoryData.slug}&q=${encodeURIComponent(sub.query)}`}
                      onClick={() => setActiveCategory(null)}
                      className="block py-2 text-[13px] text-zinc-600 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
                <div className="mt-6 pt-5">
                  <Link
                    href={`/shop?category=${activeCategoryData.slug}`}
                    onClick={() => setActiveCategory(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900 transition-colors hover:underline dark:text-zinc-100"
                  >
                    Shop All {activeCategoryData.label}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Right: featured category image */}
              <div className="hidden shrink-0 md:block">
                <Link
                  href={`/shop?category=${activeCategoryData.slug}`}
                  onClick={() => setActiveCategory(null)}
                  className="group relative block h-[260px] w-[260px] overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                >
                  <Image
                    src={activeCategoryData.image}
                    alt={activeCategoryData.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="260px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-5">
                    <p className="text-sm font-bold text-white">
                      {activeCategoryData.label}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-white/80">
                      Shop Now <ChevronRight className="h-3 w-3" />
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
