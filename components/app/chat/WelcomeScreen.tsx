import { Package, Search } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (message: { text: string }) => void;
  isSignedIn: boolean;
}

const productSuggestions = [
  "Show me dining tables",
  "What's on sale right now?",
  "Bedroom furniture under $300",
];

const orderSuggestions = [
  "Where's my order?",
  "Show me my recent orders",
  "Has my order shipped?",
];

export function WelcomeScreen({
  onSuggestionClick,
  isSignedIn,
}: WelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-2">
      <h3 className="font-serif text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
        How can I help?
      </h3>
      <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500 max-w-xs">
        {isSignedIn
          ? "Find furniture, check orders, or track deliveries."
          : "Find furniture by style, material, color, or price."}
      </p>

      {/* Product suggestions */}
      <div className="mt-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-3 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
          <Search className="h-3 w-3" />
          Find Products
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {productSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestionClick({ text: suggestion })}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Order suggestions - only for signed in users */}
      {isSignedIn && (
        <div className="mt-5 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
            <Package className="h-3 w-3" />
            Your Orders
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {orderSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestionClick({ text: suggestion })}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
