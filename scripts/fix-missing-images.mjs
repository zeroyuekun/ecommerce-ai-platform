/**
 * Script to fetch product images from mocka.com.au and upload them to Sanity
 * for products that are missing images.
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: "8oups9cq",
  dataset: "production",
  apiVersion: "2026-03-03",
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
});

// Products missing images: Sanity _id → Mocka slug
const MISSING_PRODUCTS = [
  { sanityId: "27c23b82-f6ec-4919-b587-05256d2dde49", slug: "archie-bookcase", name: "Archie Bookcase - Natural" },
  { sanityId: "e09766ba-f2a2-433b-8454-3f444a3185f7", slug: "aspen-classic-cot-white", name: "Aspen Classic Cot - White" },
  { sanityId: "c67c2079-95c1-4b10-b070-d5e16a610e18", slug: "blair-nesting-coffee-tables", name: "Blair Round Nesting Coffee Tables - Oak" },
  { sanityId: "03aaea63-95a0-4d42-9bf3-69f7a38d249b", slug: "boucle-occasional-chair", name: "Boucle Occasional Chair - Beige" },
  { sanityId: "3a9da5d6-5b7a-4794-80db-b92e631d28b0", slug: "canyon-entertainment-unit-large", name: "Canyon Entertainment Unit Large - Natural" },
  { sanityId: "5ec1acd4-dcc4-441e-8329-06bd8bbee69c", slug: "cove-bedside-table", name: "Cove Bedside Table - White" },
  { sanityId: "b156a4b3-cf9f-4862-b686-640ca126c281", slug: "imogen-single-bed-natural", name: "Imogen Single Bed - Natural" },
  { sanityId: "b7a174ce-064c-42ab-a1bf-6d90169d3efe", slug: "inca-bedside-table-black", name: "Inca Bedside Table - Black" },
  { sanityId: "bb1d3c0c-7aa0-4510-b15f-c8f5a99bcf0d", slug: "lacie-loft-bed", name: "Lacie Metal Loft Bed with Desk - Black" },
  { sanityId: "5f59a25e-5abd-4ac6-abc5-96c0920caabf", slug: "lena-arch-mirror", name: "Lena Full Length Arch Oak Mirror" },
  { sanityId: "a9bd8682-06c2-46a6-b85a-a88ab542ad02", slug: "londyn-dining-chairs", name: "Londyn Dining Chairs Set of 2 - Natural" },
  { sanityId: "90f1be95-f86a-4587-8b2a-0414fc868437", slug: "ora-round-dining-table", name: "Ora Four Seater Round Dining Table - Natural" },
  { sanityId: "dd845ff5-be1c-4be0-add9-6cf33b5b5776", slug: "quinn-queen-bed", name: "Quinn Queen Bed - Natural" },
  { sanityId: "bafa8fbd-cf48-4912-a87e-41c184bff51c", slug: "ravello-outdoor-lounge-chair", name: "Ravello Outdoor Lounge Chair - Grey" },
  { sanityId: "30b8f4a6-f74b-4680-bcca-fb287b7c5c30", slug: "soho-wooden-highchair", name: "Soho Wooden Highchair - Natural" },
  { sanityId: "64e0d50f-b1e7-4392-ab3c-4734f8d12c11", slug: "sorrento-outdoor-dining-table", name: "Sorrento Outdoor Dining Table - Natural" },
  { sanityId: "a8c8c9dd-91c0-4439-a48a-247a585aa449", slug: "theo-kids-bookshelf", name: "Theo Kids Bookshelf and Toy Drawer Organiser - White" },
  { sanityId: "43a175bf-0805-4c81-bdf6-e03828a5342b", slug: "urban-desk", name: "Urban Desk - White" },
];

// Alternate slugs to try if the main one fails
const ALTERNATE_SLUGS = {
  "blair-nesting-coffee-tables": ["blair-round-nesting-coffee-tables-oak", "blair-round-nesting-coffee-tables"],
  "boucle-occasional-chair": ["boucle-occasional-chair-beige"],
  "canyon-entertainment-unit-large": ["canyon-entertainment-unit-large-natural"],
  "cove-bedside-table": ["cove-bedside-table-white"],
  "lacie-loft-bed": ["lacie-metal-loft-bed-with-desk-black", "lacie-metal-loft-bed-black", "lacie-loft-bed-black"],
  "lena-arch-mirror": ["lena-full-length-arch-oak-mirror", "lena-arch-oak-mirror"],
  "londyn-dining-chairs": ["londyn-dining-chairs-natural", "londyn-dining-chairs-set-of-2-natural"],
  "ora-round-dining-table": ["ora-four-seater-round-dining-table-natural", "ora-round-dining-table-natural"],
  "quinn-queen-bed": ["quinn-queen-bed-natural"],
  "ravello-outdoor-lounge-chair": ["ravello-outdoor-lounge-chair-grey"],
  "soho-wooden-highchair": ["soho-wooden-highchair-natural", "soho-highchair-natural", "soho-highchair"],
  "sorrento-outdoor-dining-table": ["sorrento-outdoor-dining-table-natural"],
  "theo-kids-bookshelf": ["theo-kids-bookshelf-and-toy-drawer-organiser-white", "theo-bookshelf-white", "theo-kids-bookshelf-white"],
  "urban-desk": ["urban-desk-white"],
};

/**
 * Fetch a product page and extract image URLs from Shopify CDN
 */
async function fetchProductImages(slug) {
  const url = `https://www.mocka.com.au/products/${slug}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    redirect: "follow",
  });

  if (!resp.ok) return null;

  const html = await resp.text();

  // Extract image URLs from Shopify CDN patterns
  const imageUrls = new Set();

  // Pattern 1: cdn/shop/files URLs
  const cdnPattern = /https?:\/\/www\.mocka\.com\.au\/cdn\/shop\/files\/[^\s"'?]+\.(?:jpg|png|webp)/gi;
  for (const match of html.matchAll(cdnPattern)) {
    imageUrls.add(match[0]);
  }

  // Pattern 2: Shopify CDN (cdn.shopify.com)
  const shopifyCdnPattern = /https?:\/\/cdn\.shopify\.com\/s\/files\/[^\s"'?]+\.(?:jpg|png|webp)/gi;
  for (const match of html.matchAll(shopifyCdnPattern)) {
    imageUrls.add(match[0]);
  }

  // Pattern 3: //www.mocka.com.au/cdn/shop/files/ (protocol-relative)
  const relPattern = /\/\/www\.mocka\.com\.au\/cdn\/shop\/files\/[^\s"'?]+\.(?:jpg|png|webp)/gi;
  for (const match of html.matchAll(relPattern)) {
    imageUrls.add("https:" + match[0]);
  }

  // Filter to only product images (typically contain the SKU pattern like T03374_Square)
  // and remove duplicates with different sizes
  const productImages = [];
  const seenBaseNames = new Set();

  for (const url of imageUrls) {
    // Extract the base filename without size suffix
    const baseName = url.replace(/_(grande|large|medium|small|compact|thumb|\d+x\d*)/, "");
    // Only include Square/product images, skip lifestyle/banner/icon images
    if (seenBaseNames.has(baseName)) continue;
    seenBaseNames.add(baseName);
    // Prefer images with "Square" in the name (main product images)
    if (/Square|_01|_02|_03|_04|_05|product/i.test(url)) {
      productImages.push(url);
    }
  }

  // If no "Square" images found, include all product-looking images
  if (productImages.length === 0) {
    for (const url of imageUrls) {
      const baseName = url.replace(/_(grande|large|medium|small|compact|thumb|\d+x\d*)/, "");
      if (!seenBaseNames.has("added:" + baseName)) {
        seenBaseNames.add("added:" + baseName);
        // Skip tiny icons, logos, badges
        if (!/icon|logo|badge|banner|svg/i.test(url)) {
          productImages.push(url);
        }
      }
    }
  }

  // Limit to first 4 images
  return productImages.slice(0, 4);
}

/**
 * Try fetching product with main slug, then alternate slugs
 */
async function fetchWithFallbacks(product) {
  const { slug, name } = product;

  // Try main slug
  let images = await fetchProductImages(slug);
  if (images && images.length > 0) {
    return { ...product, images, usedSlug: slug };
  }

  // Try alternate slugs
  const alternates = ALTERNATE_SLUGS[slug] || [];
  for (const altSlug of alternates) {
    images = await fetchProductImages(altSlug);
    if (images && images.length > 0) {
      return { ...product, images, usedSlug: altSlug };
    }
  }

  console.warn(`  ✗ No images found for: ${name} (tried: ${slug}, ${alternates.join(", ")})`);
  return { ...product, images: [], usedSlug: null };
}

/**
 * Upload an image from URL to Sanity and return the asset reference
 */
async function uploadImageFromUrl(imageUrl) {
  // Add size parameters to get a good resolution
  const fetchUrl = imageUrl + "?width=1200&height=1200";

  const response = await fetch(fetchUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    redirect: "follow",
  });

  if (!response.ok) {
    // Try without size params
    const fallbackResp = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
      redirect: "follow",
    });
    if (!fallbackResp.ok) {
      throw new Error(`Failed to fetch image: ${imageUrl} (${fallbackResp.status})`);
    }
    const buffer = Buffer.from(await fallbackResp.arrayBuffer());
    const contentType = fallbackResp.headers.get("content-type") || "image/jpeg";
    return client.assets.upload("image", buffer, { contentType });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return client.assets.upload("image", buffer, { contentType });
}

/**
 * Patch a Sanity product document with uploaded image references
 */
async function patchProductImages(sanityId, assets) {
  const images = assets.map((asset, i) => ({
    _type: "image",
    _key: `img${i + 1}`,
    asset: {
      _type: "reference",
      _ref: asset._id,
    },
  }));

  await client
    .patch(sanityId)
    .set({ images })
    .commit();
}

// ===== Main =====
async function main() {
  console.log("=== Fixing Missing Product Images ===\n");
  console.log(`Found ${MISSING_PRODUCTS.length} products with missing images.\n`);

  // Step 1: Fetch all product pages and extract image URLs
  console.log("Step 1: Fetching product pages from mocka.com.au...\n");

  const results = [];
  // Process in batches of 4 to avoid overwhelming the server
  for (let i = 0; i < MISSING_PRODUCTS.length; i += 4) {
    const batch = MISSING_PRODUCTS.slice(i, i + 4);
    const batchResults = await Promise.all(batch.map(fetchWithFallbacks));
    results.push(...batchResults);

    for (const r of batchResults) {
      if (r.images.length > 0) {
        console.log(`  ✓ ${r.name}: ${r.images.length} images (slug: ${r.usedSlug})`);
      }
    }
  }

  const productsWithImages = results.filter((r) => r.images.length > 0);
  const productsWithoutImages = results.filter((r) => r.images.length === 0);

  console.log(`\nFound images for ${productsWithImages.length}/${MISSING_PRODUCTS.length} products.`);
  if (productsWithoutImages.length > 0) {
    console.log(`Missing: ${productsWithoutImages.map((p) => p.name).join(", ")}`);
  }

  // Step 2: Upload images to Sanity and patch documents
  console.log("\nStep 2: Uploading images to Sanity and patching documents...\n");

  let successCount = 0;
  for (const product of productsWithImages) {
    try {
      console.log(`  Uploading ${product.images.length} images for: ${product.name}`);

      // Upload all images for this product
      const uploadedAssets = [];
      for (const imgUrl of product.images) {
        try {
          const asset = await uploadImageFromUrl(imgUrl);
          uploadedAssets.push(asset);
          process.stdout.write(".");
        } catch (err) {
          console.warn(`\n    Warning: Failed to upload ${imgUrl}: ${err.message}`);
        }
      }

      if (uploadedAssets.length > 0) {
        // Patch the product document
        await patchProductImages(product.sanityId, uploadedAssets);
        console.log(`\n  ✓ Patched ${product.name} with ${uploadedAssets.length} images`);
        successCount++;
      } else {
        console.log(`\n  ✗ No images uploaded for ${product.name}`);
      }
    } catch (err) {
      console.error(`\n  ✗ Error processing ${product.name}: ${err.message}`);
    }
  }

  console.log(`\n=== Done! Updated ${successCount}/${MISSING_PRODUCTS.length} products. ===`);
}

main().catch(console.error);
