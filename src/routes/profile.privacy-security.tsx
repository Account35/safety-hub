import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Monitor, Smartphone } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordChangeForm } from "@/components/password-change-form";
import { getPrivacySettings, updatePrivacySettings, changePassword, deleteAccount } from "@/lib/profile.functions";
import type { PrivacySettings } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/privacy-security")({
  head: () => ({ meta: [{ title: "Privacy & Security · Community Safety Tracker" }] }),
  component: PrivacySecurityPage,
});

function PrivacySecurityPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPwForm, setShowPwForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!user) return;
    getPrivacySettings().then(setPrivacy).catch(() => {}).finally(() => setLoading(false));
    loadSessions();
  }, [user]);

  async function loadSessions() {
    // Supabase doesn't expose session list in client SDK — show current device only
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setSessions([{ id: "current", label: getBrowserLabel(), lastActive: "Active now", isCurrent: true }]);
    }
  }

  async function updatePrivacy(patch: Partial<PrivacySettings>) {
    if (!privacy) return;
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    await updatePrivacySettings(patch);
    toast.success("Settings saved");
  }

  async function handlePasswordChange(current: string, next: string) {
    await changePassword({ currentPassword: current, newPassword: next });
    toast.success("Password changed successfully");
    setShowPwForm(false);
  }

  async function handleSignOutAll() {
    await supabase.auth.signOut({ scope: "others" });
    toast.success("All other devices signed out.");
  }

  async function handleDeleteAccount() {
    await deleteAccount({ confirmation: "DELETE" });
    await signOut();
    toast.success("Your account has been deleted. Thank you for contributing to community safety.");
    navigate({ to: "/" });
  }

  if (loading) return <PageShell><Skeleton className="h-96 rounded-xl" /></PageShell>;

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/profile" })} aria-label="Back to profile" tabIndex={0}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-bold text-primary">Privacy & Security</h1>
      </div>

      {/* ── Privacy ───────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Privacy</h2>

      <Card className="mb-4 border-primary/20 bg-primary text-primary-foreground">
        <CardContent className="p-4 flex gap-3 items-start">
          <Shield className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm leading-relaxed">
            Your identity is never shared with SAPS officers, regardless of these settings. These controls affect only the level of location detail included in future reports.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Default Location Sharing</h3>
          {([
            { value: "township", label: "Township Level Only", desc: "Future reports will show only your township, like 'Soweto'" },
            { value: "neighborhood", label: "Neighborhood Level", desc: "Future reports will show your neighborhood within the township, like 'Orlando East, Soweto'" },
            { value: "landmark", label: "Near Landmark", desc: "Future reports will show a nearby landmark you describe." },
          ] as const).map(({ value, label, desc }) => (
            <label key={value} className="flex items-start gap-3 cursor-pointer" style={{ minHeight: 44 }}>
              <input type="radio" name="location-level" value={value}
                checked={privacy?.location_sharing_level === value}
                onChange={() => updatePrivacy({ location_sharing_level: value })}
                className="accent-primary size-4 mt-0.5" />
              <div>
                <span className="text-sm font-medium">{label}</span>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Data retention */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">How Long We Keep Your Information</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reports and conversations are kept as part of SAPS investigation records. Your account information is kept while your account is active. If you delete your account, your personal profile information is removed, but submitted reports remain part of investigation records as required by law — these reports were always anonymous to SAPS and remain so.
          </p>
          {!privacy?.data_retention_acknowledged && (
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" className="accent-primary size-4"
                onChange={() => updatePrivacy({ data_retention_acknowledged: true })} />
              <span className="text-sm">I understand</span>
            </label>
          )}
          {privacy?.data_retention_acknowledged && (
            <p className="text-xs text-green-700 mt-2">✓ Acknowledged</p>
          )}
        </CardContent>
      </Card>

      {/* ── Account Security ──────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Account Security</h2>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Password</span>
            {!showPwForm && (
              <Button size="sm" variant="outline" onClick={() => setShowPwForm(true)} style={{ minHeight: 44 }}>
                Change Password
              </Button>
            )}
          </div>
          {showPwForm && (
            <PasswordChangeForm
              onSubmit={handlePasswordChange}
              onCancel={() => setShowPwForm(false)}
            />
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Active Sessions</h3>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                {s.label.toLowerCase().includes("mobile") || s.label.toLowerCase().includes("android") || s.label.toLowerCase().includes("iphone")
                  ? <Smartphone className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
                  : <Monitor className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.lastActive}</p>
                </div>
                {s.isCurrent
                  ? <span className="text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5">This Device</span>
                  : <Button size="sm" variant="outline" style={{ minHeight: 44 }}
                      onClick={() => supabase.auth.signOut({ scope: "others" })}>Sign Out</Button>}
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => {
            if (confirm("This will sign you out of all devices except this one. Continue?")) handleSignOutAll();
          }}>
            Sign Out All Other Devices
          </Button>
        </CardContent>
      </Card>

      {/* Account deletion */}
      {!showDeleteConfirm ? (
        <button
          className="text-sm text-destructive underline-offset-4 hover:underline mt-2 mb-8 block"
          onClick={() => setShowDeleteConfirm(true)}
          tabIndex={0}
        >
          Delete My Account
        </button>
      ) : (
        <Card className="mb-8 border-destructive">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-destructive">Delete Your Account</h3>
            <p className="text-sm text-muted-foreground">
              Your profile information, including your name and email, will be permanently deleted. Reports you've submitted remain part of SAPS investigation records but were always anonymous and will stay that way. This cannot be undone.
            </p>
            <p className="text-sm font-medium">Type DELETE to confirm:</p>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              className="w-full h-10 rounded border border-input px-3 text-sm bg-background font-mono"
              aria-label="Type DELETE to confirm account deletion"
              aria-describedby="delete-hint"
            />
            <p id="delete-hint" className="text-xs text-muted-foreground">Case-sensitive — type exactly: DELETE</p>
            <Button className="w-full bg-primary text-primary-foreground" onClick={() => setShowDeleteConfirm(false)}>
              Cancel, Keep My Account
            </Button>
            <Button
              className="w-full bg-destructive text-destructive-foreground"
              disabled={deleteInput !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Permanently Delete Account
            </Button>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

interface Session { id: string; label: string; lastActive: string; isCurrent: boolean; }

function getBrowserLabel(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Android/i.test(ua)) return "Chrome on Android";
  if (/iPhone/i.test(ua)) return "Safari on iPhone";
  if (/iPad/i.test(ua)) return "Safari on iPad";
  if (/Firefox/i.test(ua)) return "Firefox on Desktop";
  if (/Edg/i.test(ua)) return "Edge on Desktop";
  return "Chrome on Desktop";
}
