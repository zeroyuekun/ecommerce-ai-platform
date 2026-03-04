"use client";

import { useChatActions, useIsChatOpen } from "@/lib/store/chat-store-provider";

export function ChatFab() {
  const { openChat } = useChatActions();
  const isChatOpen = useIsChatOpen();

  if (isChatOpen) return null;

  return (
    <button
      onClick={openChat}
      aria-label="Open AI Shopping Assistant"
      className="fixed bottom-20 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#5c5c3d] shadow-lg shadow-zinc-200/60 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-zinc-300/60 active:scale-95 dark:shadow-zinc-900/40 dark:hover:shadow-zinc-700/50"
    >
      {/* Speech bubble with dots */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Bubble shape */}
        <path
          d="M12 2C6.48 2 2 5.58 2 10c0 2.24 1.12 4.26 2.92 5.7L4 20l4.35-2.17C9.5 18.27 10.72 18.5 12 18.5c5.52 0 10-3.58 10-8S17.52 2 12 2Z"
          fill="currentColor"
          opacity="1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Three dots */}
        <circle cx="8" cy="10" r="1.25" fill="white" />
        <circle cx="12" cy="10" r="1.25" fill="white" />
        <circle cx="16" cy="10" r="1.25" fill="white" />
      </svg>
    </button>
  );
}
