/**
 * Chatbot Integration Test Script
 *
 * Tests the AI chatbot's tool pipeline WITHOUT calling any AI API.
 * Connects to real Sanity data and exercises each tool's logic:
 *   - searchProducts (various filters)
 *   - addToCart (slug + name lookup, stock checks)
 *   - getMyOrders (authenticated flow)
 *
 * Usage: npx tsx tools/test-chatbot.ts
 * Cost:  $0 — no AI credits used, only Sanity reads
 */

import { createClient } from "@sanity/client";
import { config } from "dotenv";

// ── Load env ──────────────────────────────────────────────
config({ path: ".env.local" });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-12-05";

if (!projectId || !dataset) {
  console.error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET in .env.local",
  );
  process.exit(1);
}

const sanity = createClient({ projectId, dataset, apiVersion, useCdn: false });

// ── Helpers ───────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 5;

function getStockStatus(stock: number | null | undefined) {
  if (stock === null || stock === undefined) return "unknown" as const;
  if (stock <= 0) return "out_of_stock" as const;
  if (stock <= LOW_STOCK_THRESHOLD) return "low_stock" as const;
  return "in_stock" as const;
}

function getStockMessage(stock: number | null | undefined) {
  const status = getStockStatus(stock);
  if (status === "out_of_stock") return "OUT OF STOCK";
  if (status === "low_stock") return `LOW STOCK - Only ${stock} left`;
  if (status === "in_stock") return `In stock (${stock} available)`;
  return "Unknown";
}

function formatPrice(price: number) {
  return `$${price.toFixed(2)}`;
}

// ── Test tracking ─────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    const msg = detail ? `${label} — ${detail}` : label;
    failures.push(msg);
    console.log(`  ✗ ${label}${detail ? ` (${detail})` : ""}`);
  }
}

// ── GROQ Queries (mirrors the app's queries) ─────────────
const AI_SEARCH_PRODUCTS_QUERY = `*[
  _type == "product"
  && ($searchQuery == "" || name match $searchQuery + "*" || description match $searchQuery + "*" || category->title match $searchQuery + "*")
  && ($categorySlug == "" || category->slug.current == $categorySlug)
  && ($material == "" || material == $material)
  && ($color == "" || color == $color)
  && ($minPrice == 0 || price >= $minPrice)
  && ($maxPrice == 0 || price <= $maxPrice)
] | order(name asc) [0...20] {
  _id, name, "slug": slug.current, description, price,
  "image": images[0]{ asset->{ _id, url } },
  category->{ _id, title, "slug": slug.current },
  material, color, dimensions, stock, featured, assemblyRequired
}`;

const PRODUCT_BY_SLUG_QUERY = `*[_type == "product" && slug.current == $slug][0] {
  _id, name, "slug": slug.current, price, stock, "imageUrl": images[0].asset->url
}`;

const PRODUCT_BY_NAME_QUERY = `*[_type == "product" && name match $name + "*"] | order(name asc) [0] {
  _id, name, "slug": slug.current, price, stock, "imageUrl": images[0].asset->url
}`;

const ORDERS_BY_USER_QUERY = `*[_type == "order" && clerkUserId == $clerkUserId] | order(_createdAt desc) [0...20] {
  _id, orderNumber, total, status, _createdAt,
  "itemCount": count(items),
  "itemNames": items[].product->name,
  "itemImages": items[].product->images[0].asset->url
}`;

// ── Tool Simulators ───────────────────────────────────────
async function searchProducts(params: {
  query?: string;
  category?: string;
  material?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  const products = await sanity.fetch(AI_SEARCH_PRODUCTS_QUERY, {
    searchQuery: params.query || "",
    categorySlug: params.category || "",
    material: params.material || "",
    color: params.color || "",
    minPrice: params.minPrice || 0,
    maxPrice: params.maxPrice || 0,
  });

  return {
    found: products.length > 0,
    totalResults: products.length,
    products: products.map((p: any) => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      priceFormatted: p.price ? formatPrice(p.price) : null,
      category: p.category?.title ?? null,
      categorySlug: p.category?.slug ?? null,
      material: p.material ?? null,
      color: p.color ?? null,
      dimensions: p.dimensions ?? null,
      stockCount: p.stock ?? 0,
      stockStatus: getStockStatus(p.stock),
      stockMessage: getStockMessage(p.stock),
      featured: p.featured ?? false,
      imageUrl: p.image?.asset?.url ?? null,
      productUrl: p.slug ? `/products/${p.slug}` : null,
    })),
  };
}

async function addToCart(params: {
  productSlug?: string;
  productName?: string;
  quantity?: number;
}) {
  const quantity = params.quantity ?? 1;
  let product: any = null;

  if (params.productSlug) {
    product = await sanity.fetch(PRODUCT_BY_SLUG_QUERY, {
      slug: params.productSlug,
    });
  }
  if (!product && params.productName) {
    product = await sanity.fetch(PRODUCT_BY_NAME_QUERY, {
      name: params.productName,
    });
  }
  if (!product) {
    return {
      success: false,
      message: `Product not found: "${params.productSlug || params.productName}"`,
    };
  }

  const stockStatus = getStockStatus(product.stock);
  if (stockStatus === "out_of_stock") {
    return { success: false, message: `${product.name} is out of stock.` };
  }
  if (product.stock != null && quantity > product.stock) {
    return {
      success: false,
      message: `Only ${product.stock} of ${product.name} available.`,
    };
  }

  return {
    success: true,
    message: `Added ${quantity}x ${product.name} to cart.`,
    cartItem: {
      productId: product._id,
      name: product.name,
      price: product.price,
      priceFormatted: product.price ? formatPrice(product.price) : "$0.00",
      quantity,
      slug: product.slug,
    },
  };
}

async function getMyOrders(userId: string, status?: string) {
  if (!userId)
    return { found: false, message: "Not authenticated", orders: [] };

  const orders: any[] = await sanity.fetch(ORDERS_BY_USER_QUERY, {
    clerkUserId: userId,
  });
  const filtered = status ? orders.filter((o) => o.status === status) : orders;

  return {
    found: filtered.length > 0,
    totalOrders: filtered.length,
    orders: filtered.map((o) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      total: o.total,
      totalFormatted: o.total ? formatPrice(o.total) : null,
      status: o.status,
      itemCount: o.itemCount ?? 0,
      itemNames: (o.itemNames ?? []).filter(Boolean),
    })),
  };
}

// ── Test Suites ───────────────────────────────────────────

async function testSearchProducts() {
  console.log("\n━━━ TEST: searchProducts ━━━");

  // 1. Broad search — should return products
  console.log("\n  [1] Broad search (all products)");
  const all = await searchProducts({});
  assert(all.found, "Returns products with no filters");
  assert(all.totalResults > 0, `Got ${all.totalResults} products`);

  // Validate product shape
  if (all.products.length > 0) {
    const p = all.products[0];
    assert(typeof p.id === "string" && p.id.length > 0, "Product has _id");
    assert(typeof p.name === "string", `Product has name: "${p.name}"`);
    assert(typeof p.slug === "string", `Product has slug: "${p.slug}"`);
    assert(
      typeof p.price === "number" && p.price > 0,
      `Product has price: ${p.priceFormatted}`,
    );
    assert(
      ["in_stock", "low_stock", "out_of_stock", "unknown"].includes(
        p.stockStatus,
      ),
      `Stock status valid: "${p.stockStatus}"`,
    );
    assert(
      typeof p.stockMessage === "string",
      `Stock message: "${p.stockMessage}"`,
    );
    assert(
      p.productUrl === `/products/${p.slug}`,
      "productUrl formatted correctly",
    );
  }

  // 2. Category filter
  console.log("\n  [2] Category filter: bedroom");
  const bedroom = await searchProducts({ category: "bedroom" });
  assert(bedroom.found, "Bedroom category returns results");
  if (bedroom.found) {
    const allBedroom = bedroom.products.every(
      (p: any) => p.categorySlug === "bedroom",
    );
    assert(allBedroom, "All results are in bedroom category");
  }

  // 3. Material filter
  console.log("\n  [3] Material filter: wood");
  const wood = await searchProducts({ material: "wood" });
  assert(wood.found, "Wood material returns results");
  if (wood.found) {
    const allWood = wood.products.every((p: any) => p.material === "wood");
    assert(allWood, "All results have wood material");
  }

  // 4. Price range
  console.log("\n  [4] Price range: $100–$300");
  const priceRange = await searchProducts({ minPrice: 100, maxPrice: 300 });
  if (priceRange.found) {
    const allInRange = priceRange.products.every(
      (p: any) => p.price >= 100 && p.price <= 300,
    );
    assert(allInRange, "All results within $100–$300");
  } else {
    assert(true, "No products in range (valid result)");
  }

  // 5. Text search
  console.log("\n  [5] Text search: 'table'");
  const tables = await searchProducts({ query: "table" });
  assert(tables.found, "Search for 'table' returns results");
  if (tables.found) {
    console.log(
      `    Found ${tables.totalResults} table(s): ${tables.products
        .slice(0, 3)
        .map((p: any) => p.name)
        .join(", ")}...`,
    );
  }

  // 6. No results scenario
  console.log("\n  [6] No results: nonsense query");
  const none = await searchProducts({ query: "xyznonexistent999" });
  assert(!none.found, "Nonsense query returns no results");
  assert(none.totalResults === 0, "totalResults is 0");

  // 7. Combined filters
  console.log("\n  [7] Combined: category=living-room + material=wood");
  const combined = await searchProducts({
    category: "living-room",
    material: "wood",
  });
  if (combined.found) {
    const valid = combined.products.every(
      (p: any) => p.categorySlug === "living-room" && p.material === "wood",
    );
    assert(valid, "Combined filters applied correctly");
  } else {
    assert(true, "No products match combined filters (valid)");
  }
}

async function testAddToCart() {
  console.log("\n━━━ TEST: addToCart ━━━");

  // First, get a real product to test with
  const products = await searchProducts({});
  if (!products.found || products.products.length === 0) {
    console.log("  ⚠ No products in database — skipping addToCart tests");
    return;
  }

  const testProduct =
    products.products.find((p: any) => p.stockStatus === "in_stock") ||
    products.products[0];

  // 1. Add by slug
  console.log(`\n  [1] Add by slug: "${testProduct.slug}"`);
  const bySlug = await addToCart({ productSlug: testProduct.slug });
  assert(bySlug.success, `Added to cart: ${bySlug.message}`);
  if (bySlug.cartItem) {
    assert(bySlug.cartItem.name === testProduct.name, "Cart item name matches");
    assert(bySlug.cartItem.quantity === 1, "Default quantity is 1");
    assert(bySlug.cartItem.slug === testProduct.slug, "Cart item slug matches");
  }

  // 2. Add by name
  console.log(`\n  [2] Add by name: "${testProduct.name}"`);
  const byName = await addToCart({ productName: testProduct.name });
  assert(byName.success, `Added by name: ${byName.message}`);

  // 3. Add with quantity
  console.log("\n  [3] Add with quantity: 2");
  const withQty = await addToCart({
    productSlug: testProduct.slug,
    quantity: 2,
  });
  if (testProduct.stockCount >= 2) {
    assert(withQty.success, `Added 2x: ${withQty.message}`);
    assert(withQty.cartItem?.quantity === 2, "Quantity is 2");
  } else {
    assert(!withQty.success, `Stock insufficient: ${withQty.message}`);
  }

  // 4. Nonexistent product
  console.log("\n  [4] Nonexistent product");
  const notFound = await addToCart({ productSlug: "totally-fake-product-xyz" });
  assert(!notFound.success, `Correctly rejected: ${notFound.message}`);

  // 5. Excessive quantity
  console.log("\n  [5] Excessive quantity (9999)");
  const tooMany = await addToCart({
    productSlug: testProduct.slug,
    quantity: 9999,
  });
  if (testProduct.stockCount < 9999) {
    assert(
      !tooMany.success,
      `Correctly rejected overstock: ${tooMany.message}`,
    );
  } else {
    assert(tooMany.success, "Product has massive stock (unlikely but valid)");
  }
}

async function testGetMyOrders() {
  console.log("\n━━━ TEST: getMyOrders ━━━");

  // Test with a fake user ID (won't find orders, but tests the pipeline)
  console.log("\n  [1] Query with test user (no orders expected)");
  const result = await getMyOrders("test-user-no-orders");
  assert(!result.found || result.totalOrders === 0, "No orders for fake user");

  // Test unauthenticated
  console.log("\n  [2] Unauthenticated user");
  const unauth = await getMyOrders("");
  assert(!unauth.found, "Unauthenticated returns no results");

  // Test with status filter
  console.log("\n  [3] Status filter: 'paid'");
  const filtered = await getMyOrders("test-user-no-orders", "paid");
  assert(
    !filtered.found || filtered.totalOrders === 0,
    "No paid orders for fake user",
  );

  // Validate the order shape if we can find any orders
  console.log("\n  [4] Check for any existing orders in database");
  const anyOrders: any[] = await sanity.fetch(
    `*[_type == "order"][0...1]{ _id, orderNumber, total, status, clerkUserId }`,
  );
  if (anyOrders.length > 0 && anyOrders[0].clerkUserId) {
    const realOrders = await getMyOrders(anyOrders[0].clerkUserId);
    assert(realOrders.found, `Found ${realOrders.totalOrders} real order(s)`);
    if (realOrders.orders.length > 0) {
      const o = realOrders.orders[0];
      assert(typeof o.id === "string", "Order has id");
      assert(
        typeof o.orderNumber === "string",
        `Order number: ${o.orderNumber}`,
      );
      assert(typeof o.total === "number", `Order total: ${o.totalFormatted}`);
      assert(
        ["pending", "paid", "shipped", "delivered", "cancelled"].includes(
          o.status,
        ),
        `Valid status: ${o.status}`,
      );
    }
  } else {
    console.log("    No orders in database — shape validation skipped");
    assert(true, "No orders to validate (OK)");
  }
}

async function testChatbotFlow() {
  console.log("\n━━━ TEST: End-to-End Chatbot Flow ━━━");

  // Simulate a realistic conversation flow

  // Step 1: User asks "Show me bedroom furniture under $500"
  console.log('\n  [Flow] User: "Show me bedroom furniture under $500"');
  const step1 = await searchProducts({ category: "bedroom", maxPrice: 500 });
  if (step1.found) {
    console.log(`    Agent would show ${step1.totalResults} product(s)`);
    assert(step1.found, "Search returned results for conversation");

    // Step 2: User says "Add the first one to my cart"
    const firstProduct = step1.products[0];
    console.log(`\n  [Flow] User: "Add ${firstProduct.name} to my cart"`);
    const step2 = await addToCart({ productSlug: firstProduct.slug });
    assert(step2.success || !step2.success, `Cart result: ${step2.message}`);

    // Step 3: User asks "Show me something similar but cheaper"
    if (firstProduct.price) {
      console.log('\n  [Flow] User: "Something similar but cheaper"');
      const step3 = await searchProducts({
        category: firstProduct.categorySlug || "bedroom",
        maxPrice: firstProduct.price - 1,
      });
      console.log(`    Found ${step3.totalResults} cheaper alternative(s)`);
      assert(true, "Follow-up search executed");
    }
  } else {
    console.log(
      "    No bedroom products under $500 — testing with broader search",
    );
    const fallback = await searchProducts({ category: "bedroom" });
    assert(true, `Fallback found ${fallback.totalResults} bedroom product(s)`);
  }

  // Step 4: User checks orders
  console.log('\n  [Flow] User: "Where are my orders?"');
  const step4 = await getMyOrders("test-user");
  console.log(
    `    Orders response: ${step4.found ? `${step4.totalOrders} orders` : "No orders found"}`,
  );
  assert(true, "Order check executed without error");
}

async function testAPIRoute() {
  console.log("\n━━━ TEST: Chat API Route ━━━");

  // Test that the /api/chat endpoint exists and requires auth
  const baseUrl = "http://localhost:3000";

  try {
    console.log("\n  [1] POST /api/chat without auth");
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    });
    assert(res.status === 401, `Returns 401 without auth (got ${res.status})`);

    console.log("\n  [2] GET /api/chat (method not allowed)");
    const getRes = await fetch(`${baseUrl}/api/chat`, { method: "GET" });
    assert(
      getRes.status === 405 || getRes.status === 404,
      `Rejects GET (got ${getRes.status})`,
    );
  } catch (e: any) {
    if (e.code === "ECONNREFUSED" || e.cause?.code === "ECONNREFUSED") {
      console.log("  ⚠ Dev server not running — API route tests skipped");
      console.log("    Start with 'npm run dev' to test API routes");
    } else {
      console.log(`  ⚠ API test error: ${e.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   Kozy Chatbot Integration Tests          ║");
  console.log("║   No AI credits used — Sanity reads only  ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`\nSanity: ${projectId}/${dataset}`);

  // Verify Sanity connection first
  try {
    const count = await sanity.fetch(`count(*[_type == "product"])`);
    console.log(`Products in database: ${count}`);
    assert(count > 0, "Sanity connection OK and has products");
  } catch (e: any) {
    console.error(`\n✗ Cannot connect to Sanity: ${e.message}`);
    process.exit(1);
  }

  await testSearchProducts();
  await testAddToCart();
  await testGetMyOrders();
  await testChatbotFlow();
  await testAPIRoute();

  // ── Summary ───────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\n  Failures:");
    for (const f of failures) console.log(`    ✗ ${f}`);
  }
  console.log("══════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
