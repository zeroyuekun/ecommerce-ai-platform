import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kozy.com.au";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/studio/", "/checkout/", "/orders/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
