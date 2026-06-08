import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { ConversationCard } from "@/components/chat-conversation-card";
import { fetchConversations, fetchMessages } from "@/lib/chat-data";
import { useAuth } from "@/lib/auth-context";
import type { Conversation, Message } from "@/lib/chat-types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [{ title: "My SAPS Conversations · Community Safety Tracker" }],
  }),
  component: ChatsPage,
});

function ChatsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id)
      .then(async (convs) => {
        setConversations(convs);
        const msgResults = await Promise.all(
          convs.map((c) => fetchMessages(c.id).catch(() => [] as Message[])),
        );
        const lm: Record<string, Message> = {};
        const uc: Record<string, number> = {};
        convs.forEach((c, i) => {
          const msgs = msgResults[i];
          if (msgs.length) lm[c.id] = msgs[msgs.length - 1];
          uc[c.id] = msgs.filter((m) => m.sender_type === "officer" && !m.read_at).length;
        });
        setLastMessages(lm);
        setUnreadCounts(uc);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const active = conversations.filter(
    (c) => c.status !== "closed" && c.status !== "archived",
  );
  const past = conversations.filter(
    (c) => c.status === "closed" || c.status === "archived",
  );

  // sort: unread first, then by last activity
  const sortedActive = [...active].sort((a, b) => {
    const ua = unreadCounts[a.id] ?? 0;
    const ub = unreadCounts[b.id] ?? 0;
    if (ub !== ua) return ub - ua;
    return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
  });

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-primary mb-6">My SAPS Conversations</h1>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && conversations.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Shield className="size-16 text-accent" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-primary">No Messages Yet</h2>
          <p className="text-muted-foreground max-w-xs text-sm">
            If SAPS investigators have questions about your reports, they will contact you here.
            Your identity stays protected.
          </p>
        </div>
      )}

      {!loading && sortedActive.length > 0 && (
        <section aria-label="Active conversations" className="space-y-3 mb-6">
          {sortedActive.map((c) => (
            <ConversationCard
              key={c.id}
              conversation={c}
              lastMessage={lastMessages[c.id]}
              unreadCount={unreadCounts[c.id] ?? 0}
            />
          ))}
        </section>
      )}

      {!loading && past.length > 0 && (
        <section aria-label="Past conversations">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-muted-foreground">Past Conversations</span>
          </div>
          <div className="space-y-3">
            {past.map((c) => (
              <ConversationCard
                key={c.id}
                conversation={c}
                lastMessage={lastMessages[c.id]}
                unreadCount={0}
              />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
