import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { auth } from "@clerk/nextjs/server";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  // Require authentication to prevent unauthenticated API cost abuse
  const { userId } = await auth();

  if (!userId) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const agent = createShoppingAgent({ userId });

  return createAgentUIStreamResponse({
    agent,
    messages,
  });
}
