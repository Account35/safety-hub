import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Lock } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { ChatHeader } from "@/components/chat-header";
import { MessageList } from "@/components/chat-message-list";
import { ChatInput } from "@/components/chat-input";
import { ChatWelcomeCard } from "@/components/chat-welcome-card";
import { ChatPrivacyModal } from "@/components/chat-privacy-modal";
import { ChatCloseModal } from "@/components/chat-close-modal";
import { ChatSearch } from "@/components/chat-search";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchConversationById,
  fetchMessages,
  sendMessage,
  markMessagesRead,
  closeConversation,
  subscribeToMessages,
  subscribeToConversation,
} from "@/lib/chat-data";
import { useAuth } from "@/lib/auth-context";
import type { Conversation, Message, DeliveryStatus } from "@/lib/chat-types";

export const Route = createFileRoute("/chats/$id")({
  head: () => ({
    meta: [{ title: "Conversation · Community Safety Tracker" }],
  }),
  component: ConversationPage,
});

function ConversationPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [connected, setConnected] = useState(true);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);

  const isClosed = conversation?.status === "closed" || conversation?.status === "archived";

  // Check first-time visit
  useEffect(() => {
    const key = `chat_welcome_${id}`;
    if (!localStorage.getItem(key)) {
      setShowWelcome(true);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    if (!id) return;
    Promise.all([fetchConversationById(id), fetchMessages(id)])
      .then(([conv, msgs]) => {
        setConversation(conv);
        const withStatus: Message[] = msgs.map((m) => ({
          ...m,
          delivery_status: resolveDelivery(m) as DeliveryStatus,
        }));
        setMessages(withStatus);
        setHasMore(msgs.length === 20);
      })
      .finally(() => {
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 50);
      });
  }, [id]);

  // Mark messages read when conversation opens
  useEffect(() => {
    if (id) markMessagesRead(id).catch(() => {});
  }, [id]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const msgSub = subscribeToMessages(id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const withStatus = { ...newMsg, delivery_status: resolveDelivery(newMsg) as DeliveryStatus };
        const scroll = scrollRef.current;
        const nearBottom =
          scroll && scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100;
        if (!nearBottom) setShowNewMsgBtn(true);
        return [...prev, withStatus];
      });
      if (newMsg.sender_type === "officer") markMessagesRead(id).catch(() => {});
    });

    const convSub = subscribeToConversation(id, (updated) => {
      setConversation(updated);
    });

    // Note: connection state derived from subscribe callback in chat-data; kept as-is.

    return () => {
      msgSub.unsubscribe();
      convSub.unsubscribe();
    };
  }, [id]);

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    if (!showNewMsgBtn) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, showNewMsgBtn]);

  async function handleLoadMore() {
    if (!messages.length) return;
    setLoadingMore(true);
    try {
      const older = await fetchMessages(id, messages[0].sent_at);
      setHasMore(older.length === 20);
      setMessages((prev) => [...older.map((m) => ({ ...m, delivery_status: resolveDelivery(m) as DeliveryStatus })), ...prev]);
    } finally {
      setLoadingMore(false);
    }
  }

  const handleSend = useCallback(
    async (content: string, attachment?: string) => {
      if (!id) return;
      const localId = `local-${Date.now()}`;
      const optimistic: Message = {
        id: localId,
        local_id: localId,
        conversation_id: id,
        sender_type: "reporter",
        message_content: content,
        attachment_reference: attachment ?? null,
        is_deleted: false,
        sent_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        delivery_status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const saved = await sendMessage(id, content, attachment);
        setMessages((prev) =>
          prev.map((m) =>
            m.local_id === localId ? { ...saved, delivery_status: "sent" as DeliveryStatus } : m,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.local_id === localId ? { ...m, delivery_status: "failed" as DeliveryStatus } : m,
          ),
        );
      }
    },
    [id],
  );

  async function handleClose() {
    if (!id) return;
    await closeConversation(id);
    setShowClose(false);
    const refreshed = await fetchConversationById(id);
    setConversation(refreshed);
    const msgs = await fetchMessages(id);
    setMessages(msgs.map((m) => ({ ...m, delivery_status: resolveDelivery(m) as DeliveryStatus })));
  }

  function handleExport() {
    if (!conversation || !messages.length) return;
    const lines = [
      `Community Safety Tracker - Conversation Export`,
      `Case: ${conversation.case_name ?? conversation.case_type}`,
      `Report Reference: ${conversation.report_id}`,
      `Exported: ${new Date().toLocaleString("en-ZA")}`,
      ``,
      ...messages
        .filter((m) => m.sender_type !== "system")
        .map(
          (m) =>
            `[${new Date(m.sent_at).toLocaleString("en-ZA")}] ${m.sender_type === "reporter" ? "You" : "SAPS Officer"}: ${m.message_content}`,
        ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Conversation_${conversation.report_id}.txt`;
    a.click();
  }

  function handleNavigateSearch(msgIndex: number) {
    const el = scrollRef.current?.querySelectorAll("li")[msgIndex];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const lastOfficerMsg = [...messages].reverse().find((m) => m.sender_type === "officer")?.message_content;

  if (loading) {
    return (
      <PageShell>
        <div className="space-y-3 px-4 pt-4">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-12 rounded-xl" />)}
        </div>
      </PageShell>
    );
  }

  if (!conversation) {
    return (
      <PageShell>
        <div className="text-center py-16 text-muted-foreground">Conversation not found.</div>
      </PageShell>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      <ChatHeader
        conversation={conversation}
        connected={connected}
        onInfoOpen={() => setShowPrivacy(true)}
        onSearchToggle={() => setShowSearch((s) => !s)}
        onCloseConversation={() => setShowClose(true)}
        onExport={handleExport}
      />

      {showSearch && (
        <ChatSearch
          messages={messages}
          onClose={() => setShowSearch(false)}
          onNavigate={handleNavigateSearch}
        />
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (dist < 100) setShowNewMsgBtn(false);
        }}
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load Earlier Messages"}
            </Button>
          </div>
        )}

        <div className="px-4 pt-4">
          {showWelcome && (
            <ChatWelcomeCard
              onDismiss={() => {
                localStorage.setItem(`chat_welcome_${id}`, "1");
                setShowWelcome(false);
              }}
              onLearnMore={() => {
                localStorage.setItem(`chat_welcome_${id}`, "1");
                setShowWelcome(false);
                setShowPrivacy(true);
              }}
            />
          )}
        </div>

        <MessageList messages={messages} />
        <div ref={bottomRef} />
      </div>

      {showNewMsgBtn && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <Button
            size="sm"
            className="bg-accent text-accent-foreground shadow-lg"
            onClick={() => {
              setShowNewMsgBtn(false);
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            ↓ New Message
          </Button>
        </div>
      )}

      {isClosed ? (
        <div className="border-t border-border bg-muted flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Lock className="size-4" aria-hidden="true" />
          Conversation Closed
        </div>
      ) : (
        <ChatInput
          onSend={handleSend}
          lastOfficerMessage={lastOfficerMsg}
          messageCount={messages.filter((m) => m.sender_type === "reporter").length}
        />
      )}

      <ChatPrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <ChatCloseModal
        open={showClose}
        onConfirm={handleClose}
        onCancel={() => setShowClose(false)}
      />
    </div>
  );
}

function resolveDelivery(m: Message): DeliveryStatus {
  if (m.sender_type !== "reporter") return "sent";
  if (m.read_at) return "read";
  if (m.delivered_at) return "delivered";
  return "sent";
}
