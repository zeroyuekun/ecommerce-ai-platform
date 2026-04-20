"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import {
  ChevronRight,
  MapPin,
  Package,
  Search,
  ShoppingCart,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getPopularSearches, recordSearch } from "@/lib/actions/search";
import { subcategoriesMap } from "@/lib/constants/subcategories";
import { useCartActions, useTotalItems } from "@/lib/store/cart-store-provider";
import type { ALL_CATEGORIES_QUERYResult } from "@/sanity.types";

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
    subcategories: (subcategoriesMap[cat.slug ?? ""] ?? []) as {
      label: string;
      query: string;
      type?: string;
    }[],
  }));
  const { openCart } = useCartActions();
  const totalItems = useTotalItems();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [popularSearches, setPopularSearches] = useState(defaultSuggestions);
  const lastScrollY = useRef(0);
  const scrollAccumulator = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newLinkRef = useRef<HTMLDivElement>(null);
  const saleLinkRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

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
    getPopularSearches()
      .then((results) => {
        if (results.length > 0) {
          setPopularSearches(
            results.map((r) => ({
              label: r.query.charAt(0).toUpperCase() + r.query.slice(1),
              query: r.query,
            })),
          );
        }
      })
      .catch(() => {
        // Silently fail — default suggestions will be shown
      });
  }, []);

  // Cleanup hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Set solid state based on scroll position on mount and route change
  useEffect(() => {
    if (!isHome) {
      setSolid(true);
    } else {
      setSolid(window.scrollY > 100);
    }
    setHidden(false);
    lastScrollY.current = window.scrollY;
  }, [isHome]);

  // Scroll behavior: hide on scroll down, show on scroll up
  // Homepage only: transparent when at the very top
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      // Accumulate scroll distance in the current direction
      // Reset accumulator when direction changes
      if (
        (delta > 0 && scrollAccumulator.current < 0) ||
        (delta < 0 && scrollAccumulator.current > 0)
      ) {
        scrollAccumulator.current = 0;
      }
      scrollAccumulator.current += delta;

      if (scrollAccumulator.current > 5 && currentY > 10) {
        // Scrolling down — hide header
        setHidden(true);
        scrollAccumulator.current = 0;
      } else if (scrollAccumulator.current < -5) {
        // Scrolling up — show header
        setHidden(false);
        if (isHome) setSolid(currentY > 100);
        scrollAccumulator.current = 0;
      }

      // Homepage: transparent only at the very top
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
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${hidden ? "-translate-y-full" : "translate-y-0"} ${!solid ? "bg-transparent" : "bg-white/95 backdrop-blur-md shadow-sm dark:bg-zinc-950/95"}`}
    >
      {/* Main header row */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Left: Logo */}
        <a href="/" className="flex shrink-0 items-center">
          <span
            className={`font-serif text-4xl font-medium tracking-wide transition-colors duration-500 ${!solid ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}
          >
            Kozy.
          </span>
        </a>

        {/* Center: Search bar */}
        <form
          onSubmit={handleSearch}
          className="absolute left-1/2 z-50 hidden -translate-x-1/2 sm:block w-[40%] lg:w-[35%]"
        >
          <div className="relative">
            <Search
              className={`absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-500 ${!solid ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}
            />
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
        <div
          className={`flex shrink-0 items-center gap-1 transition-colors duration-500 ${!solid ? "[&_svg]:text-white [&_button]:text-white" : ""}`}
        >
          {/* Location */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent dark:hover:bg-transparent"
            asChild
          >
            <Link href="/store-locations" title="Store Location">
              <MapPin className="h-5 w-5" />
              <span className="sr-only">Store locator</span>
            </Link>
          </Button>

          {/* My Orders icon */}
          <SignedIn>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-transparent dark:hover:bg-transparent"
              asChild
            >
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
              <span
                className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium ${!solid ? "bg-white text-zinc-900" : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"}`}
              >
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
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-transparent dark:hover:bg-transparent"
                title="Sign In"
              >
                <User className="h-5 w-5" />
                <span className="sr-only">Sign in</span>
              </Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      {/* Category navigation with mega dropdown */}
      <nav
        ref={navRef}
        className={`relative transition-colors duration-500 ${!solid ? "" : "border-b border-zinc-200 dark:border-zinc-800"}`}
        onMouseLeave={handleCategoryLeave}
      >
        <div className="flex items-center justify-center gap-6 overflow-x-auto px-4 py-2.5 sm:px-6 lg:gap-8 lg:px-8 scrollbar-hide">
          {/* New — far left */}
          <div ref={newLinkRef} className="relative">
            <Link
              href="/shop?category=new"
              onMouseEnter={() => setActiveCategory(null)}
              onFocus={() => setActiveCategory(null)}
              onClick={() => setActiveCategory(null)}
              className={`group relative whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.12em] transition-colors ${
                !solid
                  ? "text-white/80 hover:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              }`}
            >
              New
              <span
                className={`absolute -bottom-2.5 left-1/2 h-[2px] -translate-x-1/2 transition-all duration-300 ${!solid ? "bg-white" : "bg-zinc-900 dark:bg-zinc-100"} w-0 group-hover:w-full`}
              />
            </Link>
          </div>

          {categoryLinks.map((cat) => (
            <div key={cat.slug} className="relative">
              <Link
                href={`/shop?category=${cat.slug}`}
                onMouseEnter={() => handleCategoryHover(cat.slug)}
                onFocus={() => handleCategoryHover(cat.slug)}
                onClick={() => setActiveCategory(null)}
                className={`group relative whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.12em] transition-colors ${
                  !solid
                    ? activeCategory === cat.slug
                      ? "text-white"
                      : "text-white/80 hover:text-white"
                    : activeCategory === cat.slug
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                }`}
              >
                {cat.label}
                <span
                  className={`absolute -bottom-2.5 left-1/2 h-[2px] -translate-x-1/2 transition-all duration-300 ${!solid ? "bg-white" : "bg-zinc-900 dark:bg-zinc-100"} ${
                    activeCategory === cat.slug
                      ? "w-full"
                      : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            </div>
          ))}

          {/* Sale — far right */}
          <div ref={saleLinkRef} className="relative">
            <Link
              href="/shop?category=sale"
              onMouseEnter={() => setActiveCategory(null)}
              onFocus={() => setActiveCategory(null)}
              onClick={() => setActiveCategory(null)}
              className={`group relative whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.12em] transition-colors ${
                !solid
                  ? "text-white/80 hover:text-white"
                  : "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              }`}
            >
              Sale
              <span
                className={`absolute -bottom-2.5 left-1/2 h-[2px] -translate-x-1/2 transition-all duration-300 ${!solid ? "bg-white" : "bg-red-600 dark:bg-red-400"} w-0 group-hover:w-full`}
              />
            </Link>
          </div>
        </div>

        {/* Mega dropdown — width matches New-to-Sale span */}
        {activeCategoryData &&
          (() => {
            const navRect = navRef.current?.getBoundingClientRect();
            const newRect = newLinkRef.current?.getBoundingClientRect();
            const saleRect = saleLinkRef.current?.getBoundingClientRect();
            const dropdownStyle: React.CSSProperties =
              navRect && newRect && saleRect
                ? {
                    left: newRect.left - navRect.left - 80,
                    width: saleRect.right - newRect.left + 160,
                  }
                : { left: 0, right: 0 };
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: hover-maintained dropdown; inner Links provide keyboard navigation
              <div
                className="absolute top-full z-50 origin-top bg-white shadow-xl dark:bg-zinc-950 animate-in fade-in slide-in-from-top-3 duration-300 ease-out"
                style={dropdownStyle}
                onMouseEnter={() =>
                  handleCategoryHover(activeCategoryData.slug)
                }
                onMouseLeave={handleCategoryLeave}
              >
                <div className="flex gap-8 px-8 py-6">
                  {/* Left: subcategory links in three columns */}
                  <div className="flex-1">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-900 dark:text-zinc-100">
                      {activeCategoryData.label}
                    </p>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-0">
                      {activeCategoryData.subcategories.map((sub) => {
                        const params = new URLSearchParams();
                        params.set("category", activeCategoryData.slug);
                        if (sub.type) params.set("type", sub.type);
                        if (sub.query) params.set("q", sub.query);
                        return (
                          <Link
                            key={sub.type ?? sub.query}
                            href={`/shop?${params.toString()}`}
                            onClick={() => setActiveCategory(null)}
                            className="block py-1 text-[13px] uppercase text-zinc-600 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3">
                      <Link
                        href={`/shop?category=${activeCategoryData.slug}`}
                        onClick={() => setActiveCategory(null)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-900 transition-colors hover:underline dark:text-zinc-100"
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
                        <p className="text-sm font-medium uppercase text-white">
                          {activeCategoryData.label}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-normal uppercase text-white/80">
                          Shop Now <ChevronRight className="h-3 w-3" />
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()}
      </nav>
    </header>
  );
}
