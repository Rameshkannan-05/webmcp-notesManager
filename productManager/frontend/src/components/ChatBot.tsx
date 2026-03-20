import { useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const API_BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");
const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;

type ChatBotProps = {
  onChatSettled?: () => Promise<void> | void;
};

export default function ChatBot({ onChatSettled }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const historyPayload = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setMessages((current) => [...current, { role: "user", content: text }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      const payload = (await response.json()) as {
        reply?: string;
        message?: string;
      };

      const assistantText = response.ok
        ? (payload.reply ?? "")
        : (payload.message ?? "Failed to get assistant response");

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: assistantText || "No response from assistant.",
        },
      ]);

      if (response.ok) {
        await onChatSettled?.();
      }
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "Unable to reach chat server." },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="neon-ring fixed left-450 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-xl text-white shadow-[0_0_30px_rgba(99,102,241,0.7)] transition hover:scale-105"
        aria-label="Toggle AI chat"
      >
        <span className="chat-pulse-ring" />
        AI
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-2 z-50 w-[360px] max-w-[calc(100vw-1rem)] transform transition-all duration-300 sm:right-8 ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-6 opacity-0"
        }`}
      >
        <div className="glass-card flex h-[400px] flex-col overflow-hidden rounded-2xl border border-white/20">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">AI Assistant</p>
              <span className="mt-1 inline-flex rounded-full border border-indigo-400/35 bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-200">
                MCP Tools active
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-slate-200"
            >
              Close
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400">
                Ask me to manage products or summarize catalog state.
              </p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-auto bg-indigo-500 text-white"
                      : "mr-auto border border-white/10 bg-slate-900/70 text-slate-200"
                  }`}
                >
                  {message.content}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendMessage();
                  }
                }}
                className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                placeholder="Type your message..."
              />
              <button
                type="button"
                onClick={() => {
                  void sendMessage();
                }}
                disabled={isSending}
                className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}



