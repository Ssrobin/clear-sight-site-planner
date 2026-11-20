import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import assistantAvatar from "@/assets/optoline-assistant.webp";

const STORAGE_KEY = "optoline-assistant-chat-v1";
const SUGGESTIONS = [
  "Mere face ke liye kaunsa frame theek hai?",
  "Bachon ke liye glasses dikhao",
  "Blue-light glasses kya hoti hain?",
  "Delivery aur payment kaise hogi?",
];

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

export function AssistantPanel() {
  const initial = useMemo(loadMessages, []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: "optoline-assistant",
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => {
      const msg = e.message?.includes("429") ? "Too many questions right now. Please wait a moment." : "The assistant couldn't reply. Please try again.";
      toast.error(msg);
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready" || status === "error") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      textareaRef.current?.focus();
    }
  }, [messages, status]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    void sendMessage({ text: t });
  };

  const reset = () => {
    stop();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b py-3 pl-4 pr-14">
        <img src={assistantAvatar} alt="" className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <p className="font-display text-sm font-semibold">Opti · AI Assistant</p>
          <p className="text-xs text-muted-foreground">Frames, lenses, prices & eye tests</p>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary" aria-label="Start a new conversation">
            <RotateCcw className="h-3.5 w-3.5" /> New
          </button>
        )}
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="gap-5 p-4">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="mt-2 flex flex-col items-center gap-3">
                <img src={assistantAvatar} alt="" className="h-16 w-16 rounded-full" />
                <div className="space-y-1 text-center">
                  <p className="font-display text-base font-semibold">Assalam o Alaikum! I'm Opti.</p>
                  <p className="text-sm text-muted-foreground">Ask about glasses, lenses or eye tests — English ya Urdu, dono chalega.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-xs hover:border-primary hover:text-primary">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent className={m.role === "user" ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground" : ""}>
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse key={i} className="[&_a]:font-medium [&_a]:text-primary [&_a]:underline">{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                      )
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Opti is thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && status === "error" && (
            <p className="text-center text-xs text-destructive">The last reply failed. Please try sending again.</p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={(msg) => send(msg.text)}>
          <PromptInputTextarea ref={textareaRef} placeholder="Type your question…" className="min-h-12" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
