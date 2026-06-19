import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Clock, Search, CheckCircle, Ribbon } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyRewards, submitRewardClaim } from "@/lib/rewards.functions";
import { getProfile } from "@/lib/profile.functions";
import type { RewardEligibility, RewardClaim, ClaimStatus, PaymentMethodType } from "@/lib/rewards.functions";
import type { UserProfile } from "@/lib/profile.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TOWNSHIPS } from "@/lib/reports/townships";

export const Route = createFileRoute("/profile/rewards")({
  head: () => ({ meta: [{ title: "My Rewards · Community Safety Tracker" }] }),
  component: RewardsPage,
});

// ── SA ID checksum (Luhn-based) ────────────────────────────────────────────
function validateSAId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let odd = 0, even = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(id[i]);
    if (i % 2 === 0) odd += d;
    else even += parseInt(String(d * 2).split("").reduce((s, c) => s + parseInt(c), 0).toString());
  }
  const check = (10 - ((odd + even) % 10)) % 10;
  return check === parseInt(id[12]);
}

function formatRand(amount: number) {
  return `R${amount.toLocaleString("en-ZA")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function isNearDeadline(iso: string) {
  return new Date(iso).getTime() - Date.now() < 14 * 86400000;
}

// ── View state ─────────────────────────────────────────────────────────────
type View =
  | { type: "dashboard" }
  | { type: "claim-step1"; reward: RewardEligibility }
  | { type: "claim-step2"; reward: RewardEligibility; identity: Identity }
  | { type: "claim-step3"; reward: RewardEligibility; identity: Identity; payment: Payment }
  | { type: "claim-success"; claim_id: string }
  | { type: "claim-detail"; reward: RewardEligibility };

interface Identity { full_name: string; id_number: string; }
interface Payment { method: PaymentMethodType; details: Record<string, string>; }

// ── Root component ─────────────────────────────────────────────────────────

function RewardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>({ type: "dashboard" });
  const [rewards, setRewards] = useState<RewardEligibility[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getMyRewards(), getProfile()])
      .then(([r, p]) => { setRewards(r); setProfile(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleClaimSubmit(reward: RewardEligibility, identity: Identity, payment: Payment) {
    try {
      const { claim_id } = await submitRewardClaim({
        report_id: reward.report_id,
        full_name: identity.full_name,
        id_number: identity.id_number,
        payment_method_type: payment.method,
        payment_details: payment.details,
      });
      // Refresh rewards
      const updated = await getMyRewards();
      setRewards(updated);
      setView({ type: "claim-success", claim_id });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submission failed. Please try again.");
    }
  }

  if (loading) return <PageShell><Skeleton className="h-64 rounded-xl" /></PageShell>;

  if (view.type === "claim-step1") {
    return <ClaimStep1
      reward={view.reward} profile={profile}
      onBack={() => setView({ type: "dashboard" })}
      onNext={(identity) => setView({ type: "claim-step2", reward: view.reward, identity })}
    />;
  }
  if (view.type === "claim-step2") {
    return <ClaimStep2
      reward={view.reward} identity={view.identity}
      onBack={() => setView({ type: "claim-step1", reward: view.reward })}
      onNext={(payment) => setView({ type: "claim-step3", reward: view.reward, identity: view.identity, payment })}
    />;
  }
  if (view.type === "claim-step3") {
    return <ClaimStep3
      reward={view.reward} identity={view.identity} payment={view.payment}
      onBack={() => setView({ type: "claim-step2", reward: view.reward, identity: view.identity })}
      onSubmit={() => handleClaimSubmit(view.reward, view.identity, view.payment)}
    />;
  }
  if (view.type === "claim-success") {
    return <ClaimSuccess claimId={view.claim_id} onDone={() => setView({ type: "dashboard" })} />;
  }
  if (view.type === "claim-detail") {
    return <ClaimDetail reward={view.reward} onBack={() => setView({ type: "dashboard" })} />;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  const eligible = rewards.filter(r => r.eligibility_status === "eligible");
  const inProgress = rewards.filter(r => r.eligibility_status === "claimed" && r.claim?.claim_status !== "paid" && r.claim?.claim_status !== "rejected");
  const completed = rewards.filter(r => r.eligibility_status === "paid" || r.claim?.claim_status === "paid" || r.claim?.claim_status === "rejected");
  const expired = rewards.filter(r => r.eligibility_status === "expired");

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/profile" })} aria-label="Back to profile" tabIndex={0}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-bold text-primary">My Rewards</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        When a report you submitted helps resolve a case, it may become eligible for a reward. SAPS reviews each case individually.
      </p>

      {rewards.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Ribbon className="size-14 text-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-primary">No Rewards Yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            If a report you submit helps resolve a case, SAPS may determine it's eligible for a reward, and it will appear here.
          </p>
          <Button asChild variant="outline"><Link to="/profile/reports">View My Reports</Link></Button>
        </div>
      )}

      {eligible.length > 0 && (
        <section aria-labelledby="sec-eligible" className="mb-6">
          <h3 id="sec-eligible" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Available to Claim</h3>
          <div className="space-y-3">
            {eligible.map(r => (
              <EligibleCard key={r.id} reward={r}
                onClaim={() => setView({ type: "claim-step1", reward: r })} />
            ))}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section aria-labelledby="sec-progress" className="mb-6">
          <h3 id="sec-progress" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Claim in Progress</h3>
          <div className="space-y-3">
            {inProgress.map(r => (
              <InProgressCard key={r.id} reward={r}
                onClick={() => setView({ type: "claim-detail", reward: r })} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section aria-labelledby="sec-completed" className="mb-6">
          <h3 id="sec-completed" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Completed</h3>
          <div className="space-y-3">
            {completed.map(r => (
              <CompletedCard key={r.id} reward={r}
                onClick={() => setView({ type: "claim-detail", reward: r })} />
            ))}
          </div>
        </section>
      )}

      {expired.length > 0 && (
        <section aria-labelledby="sec-expired">
          <h3 id="sec-expired" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Expired</h3>
          <div className="space-y-3">
            {expired.map(r => <ExpiredCard key={r.id} reward={r} />)}
          </div>
        </section>
      )}
    </PageShell>
  );
}

// ── Reward cards ───────────────────────────────────────────────────────────

function CaseThumb({ reward }: { reward: RewardEligibility }) {
  return reward.case_photo
    ? <img src={reward.case_photo} alt="" className="size-[50px] rounded-full object-cover shrink-0" aria-hidden="true" />
    : <div className="size-[50px] rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0" aria-hidden="true">{reward.case_name?.[0] ?? "?"}</div>;
}

function CaseTypeLabel({ type }: { type: "wanted" | "missing" }) {
  return <span className={cn("text-xs font-medium", type === "wanted" ? "text-destructive" : "text-blue-600")}>
    {type === "wanted" ? "Wanted Person" : "Missing Person"}
  </span>;
}

function EligibleCard({ reward, onClaim }: { reward: RewardEligibility; onClaim: () => void }) {
  const near = isNearDeadline(reward.claim_deadline);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-3 items-start">
          <CaseThumb reward={reward} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{reward.case_name ?? "Unknown"}</p>
            <CaseTypeLabel type={reward.case_type} />
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{reward.report_id}</p>
            <p className="text-lg font-bold text-accent mt-1">{formatRand(reward.reward_amount)}</p>
            <p className="text-xs text-muted-foreground">Eligible since {formatDate(reward.eligibility_date)}</p>
            <p className={cn("text-xs mt-0.5", near ? "text-destructive font-medium" : "text-muted-foreground")}>
              Claim by {formatDate(reward.claim_deadline)}
            </p>
          </div>
        </div>
        <Button className="w-full bg-accent text-accent-foreground" onClick={onClaim} style={{ minHeight: 44 }}>
          Claim This Reward
        </Button>
      </CardContent>
    </Card>
  );
}

const CLAIM_STATUS_MAP: Record<ClaimStatus, { label: string; icon: React.ElementType; className: string }> = {
  submitted: { label: "Claim Submitted", icon: Clock, className: "bg-blue-100 text-blue-800" },
  verification_pending: { label: "Verifying Your Details", icon: Search, className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved — Payment Processing", icon: Shield, className: "bg-primary/10 text-primary" },
  paid: { label: "Paid", icon: CheckCircle, className: "bg-accent/20 text-accent-foreground" },
  rejected: { label: "Not Approved", icon: CheckCircle, className: "bg-muted text-muted-foreground" },
};

function InProgressCard({ reward, onClick }: { reward: RewardEligibility; onClick: () => void }) {
  const claim = reward.claim!;
  const s = CLAIM_STATUS_MAP[claim.claim_status];
  const Icon = s.icon;
  return (
    <button className="w-full text-left" onClick={onClick} aria-label={`Claim ${claim.claim_id} — ${s.label}`}>
      <Card className="hover:bg-muted/40 transition-colors">
        <CardContent className="p-4 flex gap-3 items-start">
          <CaseThumb reward={reward} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{reward.case_name ?? "Unknown"}</p>
            <CaseTypeLabel type={reward.case_type} />
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{reward.report_id}</p>
            <p className="text-base font-bold text-accent">{formatRand(reward.reward_amount)}</p>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium mt-1", s.className)}>
              <Icon className="size-3" aria-hidden="true" /> {s.label}
            </span>
            <p className="text-xs font-mono text-muted-foreground mt-1">{claim.claim_id}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function CompletedCard({ reward, onClick }: { reward: RewardEligibility; onClick: () => void }) {
  const claim = reward.claim;
  const paid = claim?.claim_status === "paid" || reward.eligibility_status === "paid";
  return (
    <button className="w-full text-left" onClick={onClick}>
      <Card className="hover:bg-muted/40 transition-colors">
        <CardContent className="p-4 flex gap-3 items-start">
          <CaseThumb reward={reward} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{reward.case_name ?? "Unknown"}</p>
            <CaseTypeLabel type={reward.case_type} />
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{reward.report_id}</p>
            <p className="text-base font-bold text-accent">{formatRand(reward.reward_amount)}</p>
            {paid
              ? <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent/20 text-accent-foreground mt-1"><CheckCircle className="size-3" /> Paid</span>
              : <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground mt-1">Not Approved</span>}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function ExpiredCard({ reward }: { reward: RewardEligibility }) {
  return (
    <Card className="opacity-60">
      <CardContent className="p-4 flex gap-3 items-start">
        <CaseThumb reward={reward} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-muted-foreground">{reward.case_name ?? "Unknown"}</p>
          <CaseTypeLabel type={reward.case_type} />
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{reward.report_id}</p>
          <p className="text-base font-bold text-muted-foreground">{formatRand(reward.reward_amount)}</p>
          <p className="text-xs text-muted-foreground mt-1">This reward's claim period has ended.</p>
          {reward.conversation_id && (
            <Link to="/chats/$id" params={{ id: reward.conversation_id }} className="text-xs text-primary underline-offset-4 hover:underline">
              Contact SAPS via conversation
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1 mb-4" aria-label={`Step ${current} of 3`}>
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div className={cn(
            "size-7 rounded-full flex items-center justify-center text-xs font-bold",
            s < current ? "bg-accent text-accent-foreground" :
            s === current ? "border-2 border-accent text-accent" :
            "border-2 border-muted text-muted-foreground"
          )} aria-current={s === current ? "step" : undefined}>
            {s < current ? "✓" : s}
          </div>
          {s < 3 && <div className={cn("h-0.5 w-8", s < current ? "bg-accent" : "bg-muted")} />}
        </div>
      ))}
    </div>
  );
}

function CaseContextHeader({ reward }: { reward: RewardEligibility }) {
  return (
    <div className="flex gap-3 items-center mb-4 p-3 rounded-xl bg-muted/40">
      <CaseThumb reward={reward} />
      <div>
        <p className="font-semibold">{reward.case_name ?? "Unknown"}</p>
        <CaseTypeLabel type={reward.case_type} />
        <p className="text-lg font-bold text-accent">{formatRand(reward.reward_amount)}</p>
      </div>
    </div>
  );
}

// ── Step 1: Confirm Identity ───────────────────────────────────────────────

function ClaimStep1({ reward, profile, onBack, onNext }: {
  reward: RewardEligibility; profile: UserProfile | null;
  onBack: () => void; onNext: (i: Identity) => void;
}) {
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState("");

  // Prerequisite: must have email verified
  if (!profile?.email_verified) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-12 text-center max-w-sm mx-auto">
          <Shield className="size-12 text-accent" />
          <h1 className="text-xl font-bold text-primary">Verify Your Details First</h1>
          <p className="text-sm text-muted-foreground">Before claiming a reward, please verify your email and phone number. This helps SAPS confirm your identity for payment.</p>
          <ul className="text-sm text-left space-y-2 w-full">
            {!profile?.email_verified && <li className="flex gap-2"><span>○</span> Email verification</li>}
            {!profile?.phone_verified && <li className="flex gap-2"><span>○</span> Phone verification</li>}
          </ul>
          <Button asChild className="w-full bg-accent text-accent-foreground">
            <Link to="/profile">Go to Profile Settings</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  function handleContinue() {
    if (!validateSAId(idNumber)) { setError("Please check your ID number and try again"); return; }
    onNext({ full_name: profile!.full_name, id_number: idNumber });
  }

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back" tabIndex={0}><ArrowLeft className="size-5" /></Button>
        <div>
          <StepIndicator current={1} />
          <h1 className="text-lg font-bold text-primary">Step 1 of 3: Confirm Your Identity</h1>
        </div>
      </div>
      <CaseContextHeader reward={reward} />

      {/* Anonymity reassurance banner */}
      <div className="flex gap-3 items-start bg-primary text-primary-foreground rounded-xl p-4 mb-4">
        <Shield className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          This information is used only for reward payment. It does not affect the anonymity of any reports you've submitted — SAPS officers reviewing your reports still cannot see your identity through the reporting system.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Full Name (from your profile)</label>
            <p className="text-sm mt-1 font-medium" tabIndex={0} aria-label={`Full Name, read only, ${profile?.full_name}`}>{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              To change this, <Link to="/profile" className="underline">update your profile first</Link>.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="id-number" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              South African ID Number
            </label>
            <input
              id="id-number"
              type="text"
              inputMode="numeric"
              maxLength={13}
              value={idNumber}
              onChange={e => { setIdNumber(e.target.value.replace(/\D/g, "")); setError(""); }}
              className="w-full h-10 rounded border border-input px-3 text-sm bg-background font-mono"
              aria-invalid={!!error}
              aria-describedby={error ? "id-error" : "id-hint"}
            />
            {error
              ? <p id="id-error" className="text-xs text-destructive" role="alert">{error}</p>
              : <p id="id-hint" className="text-xs text-muted-foreground">Your ID number is used only to verify your identity for this reward payment and is kept securely with this claim record.</p>}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full mt-4 bg-accent text-accent-foreground" style={{ minHeight: 44 }}
        disabled={idNumber.length !== 13} onClick={handleContinue}>
        Continue to Payment Method
      </Button>
    </PageShell>
  );
}

// ── Step 2: Payment Method ─────────────────────────────────────────────────

const SA_BANKS = ["ABSA", "Capitec", "FNB", "Nedbank", "Standard Bank", "African Bank", "Discovery Bank", "Other"];

function ClaimStep2({ reward, identity, onBack, onNext }: {
  reward: RewardEligibility; identity: Identity;
  onBack: () => void; onNext: (p: Payment) => void;
}) {
  const [method, setMethod] = useState<PaymentMethodType | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(k: string, v: string) { setDetails(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (method === "bank_transfer") {
      if (!details.bank) e.bank = "Required";
      if (!details.account_holder) e.account_holder = "Required";
      if (!details.account_number || !/^\d{9,11}$/.test(details.account_number)) e.account_number = "Enter a valid account number (9-11 digits)";
      if (!details.account_type) e.account_type = "Required";
    } else if (method === "mobile_money") {
      if (!details.provider) e.provider = "Required";
      if (!details.mobile_number || !/^(0\d{9}|\+27\d{9})$/.test(details.mobile_number.replace(/\s/g, "")))
        e.mobile_number = "Enter a valid South African phone number";
    } else if (method === "cash_pickup") {
      // preferred_station is optional
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleContinue() {
    if (!method) return;
    if (!validate()) return;
    onNext({ method, details });
  }

  const selectedClass = "border-accent ring-1 ring-accent";

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back" tabIndex={0}><ArrowLeft className="size-5" /></Button>
        <div>
          <StepIndicator current={2} />
          <h1 className="text-lg font-bold text-primary">Step 2 of 3: Choose Payment Method</h1>
        </div>
      </div>
      <CaseContextHeader reward={reward} />

      <div className="space-y-3 mb-4">
        {([
          { id: "bank_transfer" as const, label: "Bank Transfer", desc: "Paid directly to your South African bank account. Typically 5–10 business days after approval." },
          { id: "mobile_money" as const, label: "Mobile Money", desc: "Sent to your mobile money account (e.g. MTN Mobile Money, Vodacom). Typically faster than bank transfer." },
          { id: "cash_pickup" as const, label: "Cash Pickup at Police Station", desc: "Collect your reward in person at a SAPS station with ID verification. You'll receive a pickup code." },
        ] as const).map(opt => (
          <button key={opt.id} onClick={() => setMethod(opt.id)} style={{ minHeight: 44 }}
            className={cn("w-full text-left rounded-xl border p-4 transition-colors", method === opt.id ? selectedClass : "border-border hover:bg-muted/40")}
            aria-pressed={method === opt.id}>
            <div className="flex items-start gap-2">
              <div className={cn("size-4 rounded-full border-2 mt-0.5 shrink-0", method === opt.id ? "border-accent bg-accent" : "border-muted-foreground")} aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {method === "bank_transfer" && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <Field label="Bank Name" error={errors.bank}>
              <select value={details.bank ?? ""} onChange={e => set("bank", e.target.value)}
                className="w-full h-10 rounded border border-input px-2 text-sm bg-background">
                <option value="">Select bank</option>
                {SA_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Account Holder Name" error={errors.account_holder}>
              <input className="w-full h-10 rounded border border-input px-3 text-sm bg-background"
                value={details.account_holder ?? identity.full_name}
                onChange={e => set("account_holder", e.target.value)} />
              <p className="text-xs text-muted-foreground">Must match the name on your bank account — edit if different from your profile name.</p>
            </Field>
            <Field label="Account Number" error={errors.account_number}>
              <input className="w-full h-10 rounded border border-input px-3 text-sm bg-background font-mono"
                inputMode="numeric" value={details.account_number ?? ""}
                onChange={e => set("account_number", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Account Type" error={errors.account_type}>
              <div className="flex gap-4">
                {["Cheque/Current Account", "Savings Account"].map(t => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer" style={{ minHeight: 44 }}>
                    <input type="radio" name="account_type" value={t} checked={details.account_type === t}
                      onChange={() => set("account_type", t)} className="accent-primary" /> {t}
                  </label>
                ))}
              </div>
            </Field>
            <p className="text-xs text-muted-foreground">Your bank details are encrypted and only used to process this reward payment.</p>
          </CardContent>
        </Card>
      )}

      {method === "mobile_money" && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <Field label="Provider" error={errors.provider}>
              <select value={details.provider ?? ""} onChange={e => set("provider", e.target.value)}
                className="w-full h-10 rounded border border-input px-2 text-sm bg-background">
                <option value="">Select provider</option>
                <option>MTN Mobile Money</option>
                <option>Vodacom M-Pesa</option>
                <option>Other</option>
              </select>
            </Field>
            {details.provider === "Other" && (
              <Field label="Provider Name" error={errors.provider_name}>
                <input className="w-full h-10 rounded border border-input px-3 text-sm bg-background"
                  value={details.provider_name ?? ""} onChange={e => set("provider_name", e.target.value)} />
              </Field>
            )}
            <Field label="Mobile Number" error={errors.mobile_number}>
              <input className="w-full h-10 rounded border border-input px-3 text-sm bg-background"
                type="tel" value={details.mobile_number ?? ""}
                onChange={e => set("mobile_number", e.target.value)} />
              <p className="text-xs text-muted-foreground">Make sure this number is registered for mobile money with your provider.</p>
            </Field>
          </CardContent>
        </Card>
      )}

      {method === "cash_pickup" && (
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm">You'll receive a unique pickup code by SMS once your claim is approved. Bring this code and your South African ID to any SAPS station to collect your reward.</p>
            <Field label="Which area's police station would you prefer?" error="">
              <select value={details.preferred_station ?? ""} onChange={e => set("preferred_station", e.target.value)}
                className="w-full h-10 rounded border border-input px-2 text-sm bg-background">
                <option value="">No preference</option>
                {TOWNSHIPS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">You can collect from any SAPS station with your pickup code.</p>
            </Field>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 mt-2">
        <Button variant="ghost" onClick={onBack} style={{ minHeight: 44 }}>Back</Button>
        <Button className="flex-1 bg-accent text-accent-foreground" style={{ minHeight: 44 }}
          disabled={!method} onClick={handleContinue}>
          Continue to Review
        </Button>
      </div>
    </PageShell>
  );
}

function Field({ label, error, children }: { label: string; error: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

// ── Step 3: Review & Submit ────────────────────────────────────────────────

function maskLast4(s: string) { return `ending in ${s.slice(-4)}`; }

const METHOD_LABEL: Record<PaymentMethodType, string> = {
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  cash_pickup: "Cash Pickup at Police Station",
};

function ClaimStep3({ reward, identity, payment, onBack, onSubmit }: {
  reward: RewardEligibility; identity: Identity; payment: Payment;
  onBack: () => void; onSubmit: () => Promise<void>;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit();
    setSubmitting(false);
  }

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back" tabIndex={0}><ArrowLeft className="size-5" /></Button>
        <div>
          <StepIndicator current={3} />
          <h1 className="text-lg font-bold text-primary">Step 3 of 3: Review and Submit</h1>
        </div>
      </div>
      <CaseContextHeader reward={reward} />

      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Your Identity</h2>
            <button className="text-xs text-primary underline" onClick={onBack} aria-label="Edit identity information">Edit</button>
          </div>
          <p className="text-sm">{identity.full_name}</p>
          <p className="text-sm text-muted-foreground" aria-label={`ID ${maskLast4(identity.id_number)}`}>
            ID {maskLast4(identity.id_number)}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Payment Method</h2>
            <button className="text-xs text-primary underline" onClick={() => onBack()} aria-label="Edit payment method">Edit</button>
          </div>
          <p className="text-sm font-medium">{METHOD_LABEL[payment.method]}</p>
          {payment.method === "bank_transfer" && (
            <>
              <p className="text-sm text-muted-foreground">{payment.details.bank}</p>
              <p className="text-sm text-muted-foreground" aria-label={`Account ${maskLast4(payment.details.account_number ?? "")}`}>
                Account {maskLast4(payment.details.account_number ?? "0000")}
              </p>
            </>
          )}
          {payment.method === "mobile_money" && (
            <>
              <p className="text-sm text-muted-foreground">{payment.details.provider}</p>
              <p className="text-sm text-muted-foreground" aria-label={`Number ${maskLast4(payment.details.mobile_number ?? "")}`}>
                Number {maskLast4(payment.details.mobile_number ?? "0000")}
              </p>
            </>
          )}
          {payment.method === "cash_pickup" && (
            <p className="text-sm text-muted-foreground">{payment.details.preferred_station || "No preference"}</p>
          )}
        </CardContent>
      </Card>

      <label className="flex items-start gap-3 mb-4 cursor-pointer" style={{ minHeight: 44 }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
          className="accent-primary size-4 mt-0.5" aria-required="true" />
        <span className="text-sm">I confirm the information above is accurate. I understand providing false information for a reward claim may result in the claim being rejected.</span>
      </label>

      <Button className="w-full bg-accent text-accent-foreground" style={{ minHeight: 44 }}
        disabled={!confirmed || submitting} onClick={handleSubmit}>
        {submitting ? "Submitting your claim…" : "Submit Claim"}
      </Button>
    </PageShell>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────

function ClaimSuccess({ claimId, onDone }: { claimId: string; onDone: () => void }) {
  return (
    <PageShell>
      <div className="flex flex-col items-center gap-4 py-12 text-center max-w-sm mx-auto">
        <div className="size-16 rounded-full bg-primary flex items-center justify-center">
          <Shield className="size-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-primary">Claim Submitted</h1>
        <p className="text-sm text-muted-foreground">
          Thank you. SAPS will review your claim and verify your details before processing payment.
        </p>
        <div className="w-full rounded-xl border-2 border-accent p-4">
          <p className="text-xs text-muted-foreground mb-1">Your Claim Reference</p>
          <p className="text-lg font-mono font-bold text-primary">{claimId}</p>
          <button
            className="mt-2 text-xs text-primary underline"
            onClick={() => navigator.clipboard?.writeText(claimId).then(() => toast.success("Copied!"))}
          >
            Copy Reference Number
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          You can track this claim's status anytime from My Rewards in your profile. If SAPS needs more information, they may contact you through the conversation linked to your original report.
        </p>
        <Button className="w-full bg-accent text-accent-foreground" onClick={onDone} style={{ minHeight: 44 }}>
          Return to My Rewards
        </Button>
      </div>
    </PageShell>
  );
}

// ── Claim detail view ──────────────────────────────────────────────────────

function ClaimDetail({ reward, onBack }: { reward: RewardEligibility; onBack: () => void }) {
  const claim = reward.claim!;

  const timeline: { label: string; done: boolean; current: boolean; ts?: string }[] = [
    { label: "Claim Submitted", done: true, current: false, ts: claim.submitted_at },
    {
      label: "Verification",
      done: ["approved", "paid"].includes(claim.claim_status),
      current: claim.claim_status === "verification_pending",
    },
    {
      label: "Approved",
      done: ["paid"].includes(claim.claim_status),
      current: claim.claim_status === "approved",
    },
    {
      label: "Payment Sent",
      done: claim.claim_status === "paid",
      current: false,
    },
  ];

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to rewards" tabIndex={0}><ArrowLeft className="size-5" /></Button>
        <h1 className="text-lg font-bold text-primary">Claim Details</h1>
      </div>
      <CaseContextHeader reward={reward} />
      <p className="text-xs font-mono text-muted-foreground mb-4">{claim.claim_id}</p>

      {claim.claim_status === "rejected" ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold text-primary">Claim Not Approved</h2>
            {claim.rejection_reason && <p className="text-sm text-muted-foreground">{claim.rejection_reason}</p>}
            <p className="text-sm text-muted-foreground">
              This does not affect your other reports or any other rewards you may be eligible for.
              {reward.conversation_id && <> If you have questions, <Link to="/chats/$id" params={{ id: reward.conversation_id }} className="underline text-primary">reach out through the conversation</Link> linked to your original report.</>}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <ul className="space-y-4">
              {timeline.map((step) => (
                <li key={step.label} className="flex gap-3 items-start">
                  <div className={cn(
                    "size-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-xs",
                    step.done ? "bg-accent border-accent text-accent-foreground" :
                    step.current ? "border-primary text-primary" :
                    "border-muted-foreground text-muted-foreground"
                  )} aria-hidden="true">
                    {step.done ? "✓" : ""}
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", step.current && "text-primary")}>{step.label}</p>
                    {step.ts && <p className="text-xs text-muted-foreground">{formatDate(step.ts)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
