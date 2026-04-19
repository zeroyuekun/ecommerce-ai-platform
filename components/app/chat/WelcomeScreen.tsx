import { Package, Search, ShoppingCart, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (message: { text: string }) => void;
  isSignedIn: boolean;
}

const capabilities = [
  {
    icon: Search,
    label: "Find Furniture",
    description: "Search by style, material, or budget",
    prompt: "I'm looking for living room furniture",
  },
  {
    icon: Sparkles,
    label: "Get Recommendations",
    description: "Tell me about your space and I'll suggest pieces",
    prompt: "Help me find furniture for a small bedroom",
  },
  {
    icon: ShoppingCart,
    label: "Add to Cart",
    description: "Found something you like? I'll add it for you",
    prompt: "Show me dining tables under $500",
  },
];

const orderCapability = {
  icon: Package,
  label: "Track Orders",
  description: "Check the status of your recent orders",
  prompt: "Where's my order?",
};

export function WelcomeScreen({
  onSuggestionClick,
  isSignedIn,
}: WelcomeScreenProps) {
  const allCapabilities = isSignedIn
    ? [...capabilities, orderCapability]
    : capabilities;

  return (
    <div className="flex h-full flex-col items-center justify-center px-2">
      <h3 className="font-serif text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
        Welcome to Kozy
      </h3>
      <p className="mt-2 text-center text-sm text-zinc-400 dark:text-zinc-500 max-w-[260px]">
        Your personal shopping assistant for premium Australian furniture.
      </p>

      {/* Capability cards */}
      <div className="mt-6 w-full max-w-sm space-y-2">
        {allCapabilities.map((cap) => (
          <button
            key={cap.label}
            type="button"
            onClick={() => onSuggestionClick({ text: cap.prompt })}
            className="group flex w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left transition-all duration-200 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700">
              <cap.icon
                className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
                strokeWidth={1.5}
              />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-900 dark:text-zinc-100">
                {cap.label}
              </span>
              <span className="block text-[11px] text-zinc-400 dark:text-zinc-500">
                {cap.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Quick prompts */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {["Oak dining tables", "Bedroom under $300", "What's in stock?"].map(
          (prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSuggestionClick({ text: prompt })}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
            >
              {prompt}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
