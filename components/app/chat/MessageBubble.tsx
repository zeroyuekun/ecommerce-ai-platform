import { MessageContent } from "./MessageContent";

interface MessageBubbleProps {
  role: string;
  content: string;
  closeChat: () => void;
}

export function MessageBubble({
  role,
  content,
  closeChat,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 text-sm ${
          isUser
            ? "rounded-2xl rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "rounded-2xl rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        <MessageContent
          content={content}
          closeChat={closeChat}
          isUser={isUser}
        />
      </div>
    </div>
  );
}
