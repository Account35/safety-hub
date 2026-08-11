import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { ConversationCard } from "@/components/chat-conversation-card";
import { fetchConversations, fetchMessages } from "@/lib/chat-data";
import { useAuth } from "@/lib/auth-context";
import type { Conversation, Message } from "@/lib/chat-types";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getMyCampaigns, markCampaignOpened, type CampaignInboxItem } from "@/lib/campaigns/campaigns.functions";
import { setCampaignUnreadCount } from "@/lib/campaigns/campaign-unread";
import { formatRelativeTime } from "@/lib/chat-utils";

export const Route = createFileRoute("/chats/")({
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
  const [campaigns, setCampaigns] = useState<CampaignInboxItem[]>([]);
  const fetchCampaigns = useServerFn(getMyCampaigns);
  const markOpened = useServerFn(markCampaignOpened);

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

  useEffect(() => {
    if (!user) return;
    fetchCampaigns({ data: { limit: 5, offset: 0 } })
      .then((items) => {
        setCampaigns(items);
        const unread = items.filter((i) => !i.opened_timestamp).length;
        setCampaignUnreadCount(unread);
        // Mark all visible campaigns as opened (matches Phase 4 read behaviour)
        for (const it of items) {
          if (!it.opened_timestamp) {
            markOpened({ data: { deliveryId: it.delivery_id } }).catch(() => undefined);
          }
        }
        setCampaignUnreadCount(0);
      })
      .catch(() => undefined);
  }, [user, fetchCampaigns, markOpened]);

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

      {campaigns.length > 0 && (
        <section aria-labelledby="saps-announcements-heading" className="mt-8">
          <h2 id="saps-announcements-heading" className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <Shield className="size-5" aria-hidden="true" /> SAPS Announcements
          </h2>
          <ul className="space-y-3" aria-live="polite">
            {campaigns.map((it) => {
              const alert = it.campaign.campaign_type === "missing_person_alert" || it.campaign.campaign_type === "wanted_person_alert";
              const to = alert && it.campaign.case_id
                ? (it.campaign.campaign_type === "wanted_person_alert" ? "/cases/wanted/$id" : "/cases/missing/$id")
                : "/campaigns/$id";
              const params = alert && it.campaign.case_id ? { id: it.campaign.case_id } : { id: it.campaign.id };
              const unread = !it.opened_timestamp;
              return (
                <li key={it.delivery_id}>
                  <Link
                    to={to}
                    params={params}
                    className="block rounded-xl border border-border bg-card p-4 min-h-[64px] hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring outline-none"
                    aria-label={`Campaign from SAPS, ${it.campaign.title}, ${it.delivered_timestamp ? formatRelativeTime(it.delivered_timestamp) : ""}, ${unread ? "unread" : "read"}`}
                  >
                    <div className="flex items-start gap-3">
                      {alert && it.case_thumbnail && (
                        <img
                          src={it.case_thumbnail}
                          alt={it.case_full_name ? `Photograph of ${it.case_full_name}` : "Case photo"}
                          className="size-8 rounded-full object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-primary truncate">{it.campaign.title}</h3>
                          {unread && <span aria-hidden="true" className="size-2 rounded-full bg-accent" />}
                        </div>
                        {alert && (
                          <p className={`text-xs font-medium ${it.campaign.campaign_type === "wanted_person_alert" ? "text-destructive" : "text-primary"}`}>
                            {it.campaign.campaign_type === "wanted_person_alert" ? "Wanted Person" : "Missing Person"}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {it.campaign.body_content.slice(0, 60)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {it.delivered_timestamp ? formatRelativeTime(it.delivered_timestamp) : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {campaigns.length >= 5 && (
            <div className="mt-3">
              <Link to="/campaigns" className="inline-flex items-center min-h-[44px] text-sm text-primary underline underline-offset-4">
                View all announcements
              </Link>
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}
