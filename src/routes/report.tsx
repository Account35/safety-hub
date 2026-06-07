import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeft, X } from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseContextHeader } from "@/components/report/case-context-header";
import { SafetyModal } from "@/components/report/safety-modal";
import { StepIndicator, type StepDef } from "@/components/report/step-indicator";
import { MethodSelection } from "@/components/report/method-selection";
import { TextStep } from "@/components/report/text-step";
import { VoiceStep } from "@/components/report/voice-step";
import { PhotoStep } from "@/components/report/photo-step";
import { LocationStep } from "@/components/report/location-step";
import { PreviewStep } from "@/components/report/preview-step";
import { ConfirmationStep } from "@/components/report/confirmation-step";
import { useReportDraft } from "@/lib/reports/draft";
import { generateAnonCode } from "@/lib/reports/reference";
import { dataUrlToBlob } from "@/lib/reports/exif-strip";
import { getCaseSummary, submitReport } from "@/lib/reports/reports.functions";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { ReportMethod } from "@/lib/reports/types";

const reportSearchSchema = z.object({
  caseType: fallback(z.enum(["wanted", "missing"]).optional(), undefined),
  caseId: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/report")({
  validateSearch: zodValidator(reportSearchSchema),
  head: () => ({
    meta: [
      { title: "Submit a Report · Community Safety Tracker" },
      {
        name: "description",
        content:
          "Report a sighting safely and anonymously. Your identity is always protected.",
      },
    ],
  }),
  component: ReportPage,
});

type StepKey =
  | "method"
  | "text"
  | "voice"
  | "photo"
  | "location"
  | "preview"
  | "done";

function ReportPage() {
  const { caseType, caseId } = Route.useSearch();
  const navigate = useNavigate();

  if (!caseType || !caseId) {
    return (
      <PageShell>
        <Card className="mx-auto max-w-md">
          <CardContent className="space-y-3 p-8 text-center">
            <h1 className="text-2xl font-bold text-primary">Choose a Case First</h1>
            <p className="text-sm text-muted-foreground">
              Open a case from the gallery and tap "Report Sighting" to start a report.
            </p>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/cases">Browse Cases</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Wizard
        caseType={caseType}
        caseId={caseId}
        onExit={() => navigate({ to: "/cases" })}
      />
    </PageShell>
  );
}

function Wizard({
  caseType,
  caseId,
  onExit,
}: {
  caseType: "wanted" | "missing";
  caseId: string;
  onExit: () => void;
}) {
  const { user } = useAuth();
  const { draft, update, clear } = useReportDraft(caseType, caseId);
  const [safetyOpen, setSafetyOpen] = useState(!draft.safetyAcknowledged);
  const [step, setStep] = useState<StepKey>("method");
  const [reportRef, setReportRef] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const summaryFn = useServerFn(getCaseSummary);
  const submitFn = useServerFn(submitReport);

  const summaryQ = useQuery({
    queryKey: ["case-summary", caseType, caseId],
    queryFn: () => summaryFn({ data: { caseType, caseId } }),
  });

  const stepDefs: StepDef[] = useMemo(() => {
    const list: StepDef[] = [{ key: "method", label: "Method" }];
    if (draft.methods.includes("text")) list.push({ key: "text", label: "Describe" });
    if (draft.methods.includes("voice")) list.push({ key: "voice", label: "Voice" });
    if (draft.methods.includes("photo")) list.push({ key: "photo", label: "Photo" });
    list.push({ key: "location", label: "Location" }, { key: "preview", label: "Review" });
    return list;
  }, [draft.methods]);

  const currentIndex = Math.max(
    0,
    stepDefs.findIndex((s) => s.key === step),
  );

  function next() {
    const idx = stepDefs.findIndex((s) => s.key === step);
    const nxt = stepDefs[idx + 1];
    if (nxt) setStep(nxt.key as StepKey);
  }
  function prev() {
    const idx = stepDefs.findIndex((s) => s.key === step);
    if (idx <= 0) {
      setSafetyOpen(true);
      return;
    }
    setStep(stepDefs[idx - 1].key as StepKey);
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const anonCode = generateAnonCode(user?.id);

      // Upload voice
      let voicePath: string | null = null;
      if (draft.methods.includes("voice") && draft.voice) {
        const blob = dataUrlToBlob(draft.voice.dataUrl);
        const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("ogg") ? "ogg" : "audio";
        const path = `${user?.id ?? "guest"}/${anonCode}/${Date.now()}-voice.${ext}`;
        const up = await supabase.storage.from("report-voice").upload(path, blob, {
          contentType: blob.type,
          upsert: false,
        });
        if (up.error) throw new Error(`Voice upload failed: ${up.error.message}`);
        voicePath = up.data.path;
      }

      // Upload photos
      const uploadedPhotos: Array<{ path: string; caption: string }> = [];
      if (draft.methods.includes("photo") && draft.photos.length > 0) {
        for (let i = 0; i < draft.photos.length; i++) {
          const p = draft.photos[i];
          const blob = dataUrlToBlob(p.dataUrl);
          const path = `${user?.id ?? "guest"}/${anonCode}/${Date.now()}-${i}.jpg`;
          const up = await supabase.storage.from("report-photos").upload(path, blob, {
            contentType: p.mimeType,
            upsert: false,
          });
          if (up.error) throw new Error(`Photo upload failed: ${up.error.message}`);
          uploadedPhotos.push({ path: up.data.path, caption: p.caption });
        }
      }

      const res = await submitFn({
        data: {
          caseId,
          caseType,
          reporterAnonCode: anonCode,
          methods: draft.methods,
          sightingDate: draft.sightingDate ?? null,
          sightingTime: draft.sightingTime ?? null,
          textDescription: draft.textDescription ?? null,
          companionDescription: draft.companionDescription ?? null,
          confidenceLevel: draft.confidence ?? null,
          voiceRecordingPath: voicePath,
          photos: uploadedPhotos,
          locationApproximate: draft.locationApproximate ?? null,
          locationTownship: draft.locationTownship ?? null,
          locationLandmarks: draft.locationLandmarks,
          locationPrivacyLevel: draft.locationPrivacyLevel,
          safetyAcknowledgment: true,
          accuracyConfirmed: true,
          voluntaryConfirmed: true,
        },
      });
      setReportRef(res.reportId);

      // Save to local list of references (useful for guest tracking).
      try {
        const raw = localStorage.getItem("report_refs");
        const list = raw ? (JSON.parse(raw) as string[]) : [];
        list.unshift(res.reportId);
        localStorage.setItem("report_refs", JSON.stringify(list.slice(0, 50)));
      } catch {
        /* ignore */
      }

      clear();
      setStep("done");
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Submission failed. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Safety not yet acknowledged → show only modal over a dimmed shell.
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step !== "done" && (
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <X className="h-4 w-4" /> Save & Exit
          </button>
        )}
      </div>

      <CaseContextHeader summary={summaryQ.data ?? null} />

      {step !== "done" && (
        <StepIndicator steps={stepDefs} currentIndex={currentIndex} />
      )}

      <Card className="p-5 sm:p-6">
        {step === "method" && (
          <MethodSelection
            caseType={caseType}
            selected={draft.methods}
            onChange={(methods) => update({ methods })}
            onContinue={next}
          />
        )}
        {step === "text" && (
          <TextStep
            draft={draft}
            onChange={(p) => update(p)}
            onBack={prev}
            onContinue={next}
          />
        )}
        {step === "voice" && (
          <VoiceStep
            draft={draft}
            onChange={(p) => update(p)}
            onBack={prev}
            onContinue={next}
            onSwitchToText={() => {
              if (!draft.methods.includes("text")) update({ methods: [...draft.methods, "text"] });
              setStep("text");
            }}
          />
        )}
        {step === "photo" && (
          <PhotoStep
            draft={draft}
            onChange={(p) => update(p)}
            onBack={prev}
            onContinue={next}
            onSwitchToText={() => {
              if (!draft.methods.includes("text")) update({ methods: [...draft.methods, "text"] });
              setStep("text");
            }}
          />
        )}
        {step === "location" && (
          <LocationStep
            draft={draft}
            onChange={(p) => update(p)}
            onBack={prev}
            onContinue={next}
          />
        )}
        {step === "preview" && (
          <>
            {submitError && (
              <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {submitError}
              </p>
            )}
            <PreviewStep
              draft={draft}
              summary={summaryQ.data ?? null}
              submitting={submitting}
              onChange={(p) => update(p)}
              onEdit={(s: ReportMethod | "location") => setStep(s as StepKey)}
              onBack={prev}
              onSubmit={handleSubmit}
            />
          </>
        )}
        {step === "done" && reportRef && (
          <ConfirmationStep reportId={reportRef} isAuthenticated={!!user} />
        )}
      </Card>

      <SafetyModal
        open={safetyOpen}
        caseType={caseType}
        onContinue={() => {
          update({ safetyAcknowledged: true });
          setSafetyOpen(false);
        }}
        onCancel={onExit}
      />
    </div>
  );
}