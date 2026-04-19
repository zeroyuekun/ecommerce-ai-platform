import { auth, currentUser } from "@clerk/nextjs/server";
import { gateway, generateText } from "ai";
import { safeParseJson } from "@/lib/ai/json-extract";
import {
  ORDER_STATUS_DISTRIBUTION_QUERY,
  ORDERS_LAST_7_DAYS_QUERY,
  PRODUCTS_INVENTORY_QUERY,
  REVENUE_BY_PERIOD_QUERY,
  TOP_SELLING_PRODUCTS_QUERY,
  UNFULFILLED_ORDERS_QUERY,
} from "@/lib/sanity/queries/stats";
import { client } from "@/sanity/lib/client";

interface OrderItem {
  quantity: number;
  priceAtPurchase: number;
  productName: string;
  productId: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  itemCount: number;
  items: OrderItem[];
}

interface StatusDistribution {
  paid: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

interface ProductSale {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface UnfulfilledOrder {
  _id: string;
  orderNumber: string;
  total: number;
  createdAt: string;
  email: string;
  itemCount: number;
}

interface RevenuePeriod {
  currentPeriod: number;
  previousPeriod: number;
  currentOrderCount: number;
  previousOrderCount: number;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return Response.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch all analytics data in parallel
    const [
      recentOrders,
      statusDistribution,
      productSales,
      productsInventory,
      unfulfilledOrders,
      revenuePeriod,
    ] = await Promise.all([
      client.fetch<Order[]>(ORDERS_LAST_7_DAYS_QUERY, {
        startDate: sevenDaysAgo.toISOString(),
      }),
      client.fetch<StatusDistribution>(ORDER_STATUS_DISTRIBUTION_QUERY),
      client.fetch<ProductSale[]>(TOP_SELLING_PRODUCTS_QUERY),
      client.fetch<Product[]>(PRODUCTS_INVENTORY_QUERY),
      client.fetch<UnfulfilledOrder[]>(UNFULFILLED_ORDERS_QUERY),
      client.fetch<RevenuePeriod>(REVENUE_BY_PERIOD_QUERY, {
        currentStart: sevenDaysAgo.toISOString(),
        previousStart: fourteenDaysAgo.toISOString(),
      }),
    ]);

    // Aggregate top selling products
    const productSalesMap = new Map<
      string,
      { name: string; totalQuantity: number; revenue: number }
    >();

    for (const sale of productSales) {
      if (!sale.productId) continue;
      const existing = productSalesMap.get(sale.productId);
      if (existing) {
        existing.totalQuantity += sale.quantity;
        existing.revenue += sale.quantity * (sale.productPrice || 0);
      } else {
        productSalesMap.set(sale.productId, {
          name: sale.productName || "Unknown",
          totalQuantity: sale.quantity,
          revenue: sale.quantity * (sale.productPrice || 0),
        });
      }
    }

    const topProducts = Array.from(productSalesMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    // Single pass over inventory: bifurcate into restock/slow-moving buckets.
    // Reuses productSalesMap directly — no duplicate Map.
    const needsRestockAll: Product[] = [];
    const slowMovingAll: Product[] = [];
    let lowStockCount = 0;
    for (const p of productsInventory) {
      if (p.stock <= 5) lowStockCount += 1;
      const salesQty = productSalesMap.get(p._id)?.totalQuantity ?? 0;
      if (p.stock <= 5 && salesQty > 0) needsRestockAll.push(p);
      else if (p.stock > 10 && salesQty === 0) slowMovingAll.push(p);
    }

    const needsRestock = needsRestockAll
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);
    const slowMoving = slowMovingAll.slice(0, 5);

    // Helper to calculate days since order
    const getDaysSinceOrder = (createdAt: string) => {
      const orderDate = new Date(createdAt);
      const diffTime = now.getTime() - orderDate.getTime();
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // Calculate metrics
    const currentRevenue = revenuePeriod.currentPeriod || 0;
    const previousRevenue = revenuePeriod.previousPeriod || 0;
    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
          ? 100
          : 0;

    const avgOrderValue =
      recentOrders.length > 0
        ? recentOrders.reduce((sum, o) => sum + (o.total || 0), 0) /
          recentOrders.length
        : 0;

    // Prepare data summary for AI
    const dataSummary = {
      salesTrends: {
        currentWeekRevenue: currentRevenue,
        previousWeekRevenue: previousRevenue,
        revenueChangePercent: revenueChange.toFixed(1),
        currentWeekOrders: revenuePeriod.currentOrderCount || 0,
        previousWeekOrders: revenuePeriod.previousOrderCount || 0,
        avgOrderValue: avgOrderValue.toFixed(2),
        topProducts: topProducts.map((p) => ({
          name: p.name,
          unitsSold: p.totalQuantity,
          revenue: p.revenue.toFixed(2),
        })),
      },
      inventory: {
        needsRestock: needsRestock.map((p) => ({
          name: p.name,
          stock: p.stock,
          category: p.category,
        })),
        slowMoving: slowMoving.map((p) => ({
          name: p.name,
          stock: p.stock,
          category: p.category,
        })),
        totalProducts: productsInventory.length,
        lowStockCount,
      },
      operations: {
        statusDistribution,
        unfulfilledOrders: unfulfilledOrders.map((o) => ({
          orderNumber: o.orderNumber,
          total: o.total,
          daysSinceOrder: getDaysSinceOrder(o.createdAt),
          itemCount: o.itemCount,
        })),
        urgentOrders: unfulfilledOrders.filter(
          (o) => getDaysSinceOrder(o.createdAt) > 2,
        ).length,
      },
    };

    // Generate AI insights
    const { text } = await generateText({
      model: gateway("anthropic/claude-sonnet-4"),
      system: `You are an expert e-commerce analytics assistant. Analyze the provided store data and generate actionable insights for the store admin.

Your response must be valid JSON with this exact structure:
{
  "salesTrends": {
    "summary": "2-3 sentence summary of sales performance",
    "highlights": ["highlight 1", "highlight 2", "highlight 3"],
    "trend": "up" | "down" | "stable"
  },
  "inventory": {
    "summary": "2-3 sentence summary of inventory status",
    "alerts": ["alert 1", "alert 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "actionItems": {
    "urgent": ["urgent action 1", "urgent action 2"],
    "recommended": ["recommended action 1", "recommended action 2"],
    "opportunities": ["opportunity 1", "opportunity 2"]
  }
}

Guidelines:
- Be specific with numbers and product names
- Prioritize actionable insights
- Keep highlights, alerts, and recommendations concise (under 100 characters each)
- Focus on what the admin can do TODAY
- Use $ for currency`,
      prompt: `Analyze this e-commerce store data and provide insights:

${JSON.stringify(dataSummary, null, 2)}

Generate insights in the required JSON format.`,
    });

    // Parse AI response
    let insights: {
      salesTrends: {
        summary: string;
        highlights: string[];
        trend: "up" | "down" | "stable";
      };
      inventory: {
        summary: string;
        alerts: string[];
        recommendations: string[];
      };
      actionItems: {
        urgent: string[];
        recommended: string[];
        opportunities: string[];
      };
    };
    try {
      // Try direct parse first — model usually returns clean JSON.
      // Fall back to balanced-brace extraction if there's preamble/trailing text.
      insights = safeParseJson<typeof insights>(text);
    } catch {
      // Fallback insights if parsing fails
      insights = {
        salesTrends: {
          summary: `Revenue this week: $${currentRevenue.toFixed(2)} (${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs last week)`,
          highlights: [
            `${revenuePeriod.currentOrderCount || 0} orders this week`,
            `Average order value: $${avgOrderValue.toFixed(2)}`,
            topProducts[0]
              ? `Top seller: ${topProducts[0].name}`
              : "No sales data yet",
          ],
          trend:
            revenueChange > 5 ? "up" : revenueChange < -5 ? "down" : "stable",
        },
        inventory: {
          summary: `${needsRestock.length} products need restocking. ${slowMoving.length} products have no recent sales.`,
          alerts: needsRestock
            .slice(0, 2)
            .map((p) => `${p.name} has only ${p.stock} left`),
          recommendations: [
            "Review low stock items before the weekend",
            "Consider promotions for slow-moving inventory",
          ],
        },
        actionItems: {
          urgent:
            unfulfilledOrders.length > 0
              ? [`Ship ${unfulfilledOrders.length} pending orders`]
              : ["All orders fulfilled!"],
          recommended: ["Review inventory levels", "Check product listings"],
          opportunities: ["Featured products drive more sales"],
        },
      };
    }

    return Response.json({
      success: true,
      insights,
      rawMetrics: {
        currentRevenue,
        previousRevenue,
        revenueChange: revenueChange.toFixed(1),
        orderCount: revenuePeriod.currentOrderCount || 0,
        avgOrderValue: avgOrderValue.toFixed(2),
        unfulfilledCount: unfulfilledOrders.length,
        lowStockCount,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to generate insights:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to generate insights. Please try again later.",
      },
      { status: 500 },
    );
  }
}
