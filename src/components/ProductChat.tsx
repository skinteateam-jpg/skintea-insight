import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Is this good for oily skin?",
  "Does it pill under sunscreen?",
  "Worth the price?",
];

const placeholderReply =
  "Based on aggregated reviews, most users with dry or normal skin love it, while a few oily-skin users find it too rich. Pilling is rare unless layered with silicone-heavy SPFs.";

export function ProductChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! Ask me anything about this product based on real user reviews.",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { role: "assistant", content: placeholderReply }]);
    }, 500);
  };

  return (
    <section className="mb-16">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        Ask about this product
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Get answers based on real reviews from TikTok, Reddit, and Instagram.
      </p>

      <Card className="mt-5 overflow-hidden border border-border bg-background p-0 shadow-none">
        <div ref={scrollRef} className="max-h-80 overflow-y-auto px-4 py-5 sm:px-5">
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm"
                      : "flex max-w-[85%] gap-2"
                  }
                  style={
                    m.role === "user"
                      ? { background: "#FDF8F5", color: "#1C0A00", border: "0.5px solid #E8DDD4" }
                      : undefined
                  }
                >
                  {m.role === "assistant" && (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "#FDF8F5", border: "0.5px solid #E8DDD4" }}>
                      <Sparkles className="h-3 w-3" style={{ color: "#1C0A00" }} />
                    </div>
                  )}
                  {m.role === "assistant" ? (
                    <div className="rounded-2xl rounded-tl-sm bg-secondary px-3.5 py-2 text-sm text-foreground">
                      {m.content}
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-background px-4 pb-4 pt-3 sm:px-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="h-10 flex-1 rounded-full border-border bg-background px-4"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              style={{ background: "#1C0A00", color: "#FFFCF8" }}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </section>
  );
}
