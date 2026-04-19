"use client";

import { useChat } from "@ai-sdk/react";
import { useAuth } from "@clerk/nextjs";
import { ImageIcon, Loader2, X as XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  useChatActions,
  useIsChatOpen,
  usePendingMessage,
} from "@/lib/store/chat-store-provider";

import {
  getMessageText,
  getToolParts,
  MessageBubble,
  ToolCallUI,
  WelcomeScreen,
} from "./chat";

export function ChatSheet() {
  const isOpen = useIsChatOpen();
  const { closeChat, clearPendingMessage } = useChatActions();
  const pendingMessage = usePendingMessage();
  const { isSignedIn } = useAuth();
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat();
  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when new messages arrive or streaming updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger scroll on message/loading changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle pending message - send it when chat opens
  useEffect(() => {
    if (isOpen && pendingMessage && !isLoading) {
      sendMessage({ text: pendingMessage });
      clearPendingMessage();
    }
  }, [isOpen, pendingMessage, isLoading, sendMessage, clearPendingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imagePreview) || isLoading) return;

    const text =
      input.trim() || (imagePreview ? "What can you tell me about this?" : "");
    if (imagePreview) {
      const dt = new DataTransfer();
      dt.items.add(imagePreview.file);
      sendMessage({
        text,
        files: dt.files,
      });
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
    } else {
      sendMessage({ text });
    }
    setInput("");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview.url);
    setImagePreview({ url: URL.createObjectURL(file), file });
    e.target.value = "";
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only visible on mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/50 sm:hidden"
        onClick={closeChat}
        aria-hidden="true"
      />

      {/* Chat popup */}
      <div className="fixed z-50 flex flex-col border border-zinc-200 bg-white overscroll-contain dark:border-zinc-800 dark:bg-zinc-950 animate-in slide-in-from-bottom-4 fade-in duration-300 inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-[390px] sm:rounded-2xl sm:shadow-2xl">
        {/* Header */}
        <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex h-16 items-center justify-between px-5">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
              Shopping Assistant
            </span>
            <button
              type="button"
              onClick={closeChat}
              className="text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {messages.length === 0 ? (
            <WelcomeScreen
              onSuggestionClick={sendMessage}
              isSignedIn={isSignedIn ?? false}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const content = getMessageText(message);
                const toolParts = getToolParts(message);
                const hasContent = content.length > 0;
                const hasTools = toolParts.length > 0;

                if (!hasContent && !hasTools) return null;

                return (
                  <div key={message.id} className="space-y-3">
                    {/* Tool call indicators */}
                    {hasTools &&
                      toolParts.map((toolPart) => (
                        <ToolCallUI
                          key={`tool-${message.id}-${toolPart.toolCallId}`}
                          toolPart={toolPart}
                          closeChat={closeChat}
                        />
                      ))}

                    {/* Message content */}
                    {hasContent && (
                      <MessageBubble
                        role={message.role}
                        content={content}
                        closeChat={closeChat}
                      />
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full animate-bounce bg-zinc-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full animate-bounce bg-zinc-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full animate-bounce bg-zinc-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {/* Image preview */}
          {imagePreview && (
            <div className="mb-2 flex items-start gap-2">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={imagePreview.url}
                  alt="Upload preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  <XIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-700 disabled:opacity-30 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about our furniture..."
              disabled={isLoading}
              className="flex-1 border-0 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
            )}
          </form>
        </div>
      </div>
    </>
  );
}
