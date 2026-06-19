import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getNotificationPrefs, updateNotificationPrefs } from "@/lib/profile.functions";
import type { NotificationPrefs } from "@/lib/profile.functions";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/profile/notifications")({
  head: () => ({ meta: [{ title: "Notification Settings · Community Safety Tracker" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>("default");
  const [liveAnnounce, setLiveAnnounce] = useState("");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPushStatus(Notification.permission);
    if (user) getNotificationPrefs().then(setPrefs).finally(() => setLoading(false));
  }, [user]);

  async function update(patch: Partial<NotificationPrefs>, announcement?: string) {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (announcement) {
      setLiveAnnounce(announcement);
      setTimeout(() => setLiveAnnounce(""), 3000);
    }
    try {
      await updateNotificationPrefs(patch);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
      setPrefs(prefs);
    }
  }

  async function requestPush() {
    const perm = await Notification.requestPermission();
    setPushStatus(perm);
  }

  if (loading) return <PageShell><Skeleton className="h-64 rounded-xl" /></PageShell>;

  return (
    <PageShell>
      <div role="status" aria-live="polite" className="sr-only">{liveAnnounce}</div>

      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/profile" })} aria-label="Back to profile" tabIndex={0}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-bold text-primary">Notification Settings</h1>
      </div>

      {/* Push permission banner */}
      {pushStatus !== "granted" && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex gap-3 items-start">
            <Bell className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-amber-800">
              {pushStatus === "denied"
                ? "Notifications are blocked in your browser settings. You can still see updates by checking your Conversations and Reports when you open the app."
                : <><p>Push notifications are currently turned off in your browser. To receive alerts, please enable notifications.</p>
                  <Button size="sm" className="mt-2 h-8 bg-amber-600 text-white" onClick={requestPush}>Enable Notifications</Button></>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-4 space-y-5">
          {/* Toggle 1 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="tog-msg" className="font-semibold text-sm">Messages from SAPS Officers</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Get notified when an officer responds to one of your reports</p>
              {!prefs?.new_message_notifications && (
                <p className="text-xs text-amber-600 mt-1" role="alert">You may miss important follow-up questions about your reports</p>
              )}
            </div>
            <Switch
              id="tog-msg"
              checked={prefs?.new_message_notifications ?? true}
              onCheckedChange={(v) => update({ new_message_notifications: v }, `Messages from SAPS Officers notifications turned ${v ? "on" : "off"}`)}
              style={{ minWidth: 44, minHeight: 44 }}
            />
          </div>

          <div className="h-px bg-border" />

          {/* Toggle 2 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="tog-status" className="font-semibold text-sm">Report Status Updates</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Get notified if the status of your report changes</p>
            </div>
            <Switch
              id="tog-status"
              checked={prefs?.report_status_notifications ?? true}
              onCheckedChange={(v) => update({ report_status_notifications: v }, `Report Status Updates notifications turned ${v ? "on" : "off"}`)}
              style={{ minWidth: 44, minHeight: 44 }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery channel */}
      {(prefs?.new_message_notifications || prefs?.report_status_notifications) && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <h2 className="font-semibold text-sm">Delivery Method</h2>
            {(["push", "email", "both"] as const).map((ch) => (
              <label key={ch} className="flex items-center gap-3 cursor-pointer" style={{ minHeight: 44 }}>
                <input type="radio" name="delivery" checked={prefs?.delivery_channel === ch}
                  onChange={() => update({ delivery_channel: ch })}
                  className="accent-primary size-4" />
                <span className="text-sm capitalize">
                  {ch === "push" ? "Push Notifications Only" : ch === "email" ? "Email Notifications Only" : "Both Push and Email"}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quiet hours */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="tog-quiet" className="font-semibold text-sm">Enable Quiet Hours</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Pause notifications during set hours — urgent SAPS messages will still appear when you open the app.</p>
            </div>
            <Switch
              id="tog-quiet"
              checked={prefs?.quiet_hours_enabled ?? false}
              onCheckedChange={(v) => update({ quiet_hours_enabled: v })}
              style={{ minWidth: 44, minHeight: 44 }}
            />
          </div>
          {prefs?.quiet_hours_enabled && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="qh-from" className="text-xs">From</Label>
                  <input id="qh-from" type="time" value={prefs.quiet_hours_start}
                    onChange={e => update({ quiet_hours_start: e.target.value })}
                    className="w-full h-10 rounded border border-input px-2 text-sm bg-background" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="qh-to" className="text-xs">To</Label>
                  <input id="qh-to" type="time" value={prefs.quiet_hours_end}
                    onChange={e => update({ quiet_hours_end: e.target.value })}
                    className="w-full h-10 rounded border border-input px-2 text-sm bg-background" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Notifications paused from {formatTime(prefs.quiet_hours_start)} to {formatTime(prefs.quiet_hours_end)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}
