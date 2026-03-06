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
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900"
      aria-label="Ask AI"
    >
      <MessageSquareMore className="h-6 w-6" />
    </button>
  );
}
