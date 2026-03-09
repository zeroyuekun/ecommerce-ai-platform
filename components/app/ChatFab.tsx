"use client";

import { MessageSquareMore } from "lucide-react";
import { useChatActions, useIsChatOpen } from "@/lib/store/chat-store-provider";

export function ChatFab() {
  const { openChat } = useChatActions();
  const isChatOpen = useIsChatOpen();

  if (isChatOpen) return null;

  return (
    <button
      type="button"
      onClick={openChat}
      className="fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full border border-zinc-900 bg-zinc-900 text-white shadow-lg transition-all hover:bg-white hover:text-zinc-900 active:scale-95 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-950 dark:hover:text-zinc-100"
      aria-label="Ask AI"
    >
      <MessageSquareMore className="h-5 w-5" />
    </button>
  );
}
