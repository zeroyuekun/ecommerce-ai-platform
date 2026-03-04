import type { PageContent } from "./types";
import { storyPage } from "./story";
import { reviewsPage } from "./reviews";
import { blogPage } from "./blog";
import { styleSourcebookPage } from "./style-sourcebook";
import { sitemapPage } from "./sitemap";
import { contactPage } from "./contact";
import { returnsPage } from "./returns";
import { helpdeskPage } from "./helpdesk";
import { faqPage } from "./faq";
import { shippingReturnsPage } from "./shipping-returns";
import { privacyPage } from "./privacy";
import { termsPage } from "./terms";
import { warrantyPage } from "./warranty";

export const PAGE_SLUGS = [
  "story",
  "reviews",
  "blog",
  "style-sourcebook",
  "sitemap",
  "contact",
  "returns",
  "helpdesk",
  "faq",
  "shipping-returns",
  "privacy",
  "terms",
  "warranty",
] as const;

export type PageSlug = (typeof PAGE_SLUGS)[number];

const pages: Record<PageSlug, PageContent> = {
  story: storyPage,
  reviews: reviewsPage,
  blog: blogPage,
  "style-sourcebook": styleSourcebookPage,
  sitemap: sitemapPage,
  contact: contactPage,
  returns: returnsPage,
  helpdesk: helpdeskPage,
  faq: faqPage,
  "shipping-returns": shippingReturnsPage,
  privacy: privacyPage,
  terms: termsPage,
  warranty: warrantyPage,
};

export function getPage(slug: string): PageContent | undefined {
  return pages[slug as PageSlug];
}
