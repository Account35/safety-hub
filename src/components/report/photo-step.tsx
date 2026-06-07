import { useRef, useState } from "react";
import { AlertTriangle, Camera, X, ImagePlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { stripExifToDataUrl } from "@/lib/reports/exif-strip";
import type { ReportDraft, DraftPhoto } from "@/lib/reports/types";

const MAX_PHOTOS = 5;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function PhotoStep({
  draft,
  onChange,
  onBack,
  onContinue,
  onSwitchToText,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSwitchToText: () => void;
}) {
  const isWanted = draft.caseType === "wanted";
  const [acked, setAcked] = useState(!isWanted);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setProcessing(true);
    const remaining = MAX_PHOTOS - draft.photos.length;
    const list = Array.from(files).slice(0, remaining);
    const next: DraftPhoto[] = [...draft.photos];
    for (const f of list) {
      if (!ALLOWED.includes(f.type)) {
        setError("This file type is not supported. Please upload a JPG, PNG, or WebP photo.");
        continue;
      }
      if (f.size > MAX_BYTES) {
        setError(
          "This photo is too large. Please choose a smaller image or take a new photo at lower quality setting.",
        );
        continue;
      }
      try {
        const stripped = await stripExifToDataUrl(f);
        next.push({
          id: crypto.randomUUID(),
          previewUrl: stripped.dataUrl,
          dataUrl: stripped.dataUrl,
          mimeType: stripped.mimeType,
          caption: "",
          width: stripped.width,
          height: stripped.height,
        });
      } catch {
        setError("Could not process that photo. Please try a different image.");
      }
    }
    onChange({ photos: next });
    setProcessing(false);
  }

  function removePhoto(id: string) {
    onChange({ photos: draft.photos.filter((p) => p.id !== id) });
  }

  function setCaption(id: string, caption: string) {
    onChange({
      photos: draft.photos.map((p) => (p.id === id ? { ...p, caption } : p)),
    });
  }

  const canUpload = !isWanted || acked;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-bold text-primary">
          {isWanted ? "Upload a Photo (Caution)" : "Upload a Photo"}
        </h2>
      </header>

      {isWanted && (
        <div className="space-y-3 rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
            <div className="space-y-1 text-sm">
              <p className="font-bold text-destructive">WARNING</p>
              <p className="text-foreground">
                Photographing a dangerous suspect is dangerous and puts you at risk. Suspects may
                react with violence if they notice you taking photos. Text or voice reporting is
                much safer.
              </p>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-3">
            <Checkbox
              checked={acked}
              onCheckedChange={(v) => setAcked(v === true)}
              className="mt-0.5"
            />
            <span className="text-xs leading-snug">
              I understand the risks and confirm any photos I upload were taken safely from a
              distance without the suspect's knowledge.
            </span>
          </label>
          <Button variant="link" className="h-auto p-0 text-destructive" onClick={onSwitchToText}>
            Switch to Text or Voice Instead →
          </Button>
        </div>
      )}

      {!isWanted && (
        <p className="rounded-md border bg-primary/5 p-3 text-sm">
          Photos showing where you saw this person, or recent photos if you know them, can help
          investigators.
        </p>
      )}

      {canUpload && (
        <>
          <p className="text-xs text-muted-foreground">Up to 5 photos, max 8 MB each</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              className="grid min-h-[100px] cursor-pointer place-items-center border-2 border-dashed p-4 text-center hover:bg-accent/5"
            >
              <div className="space-y-1">
                <ImagePlus className="mx-auto h-7 w-7 text-accent" />
                <p className="text-sm font-medium">Choose from Phone Gallery</p>
              </div>
            </Card>
            <Card
              role="button"
              tabIndex={0}
              onClick={() => cameraRef.current?.click()}
              className="grid min-h-[100px] cursor-pointer place-items-center border-2 border-dashed p-4 text-center hover:bg-accent/5"
            >
              <div className="space-y-1">
                <Camera className="mx-auto h-7 w-7 text-accent" />
                <p className="text-sm font-medium">Take New Photo</p>
                {isWanted && (
                  <p className="text-[10px] text-destructive">
                    Only use if safe and at a distance
                  </p>
                )}
              </div>
            </Card>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED.join(",")}
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />

          {processing && (
            <p className="text-sm text-muted-foreground">Checking photo privacy…</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {draft.photos.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-accent-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" /> Privacy protected — metadata
                stripped
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {draft.photos.map((p) => (
                  <div key={p.id} className="space-y-2 rounded-md border bg-card p-2">
                    <div className="relative aspect-video overflow-hidden rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.previewUrl}
                        alt={p.caption || "Uploaded photo"}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        aria-label="Remove photo"
                        className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      value={p.caption}
                      maxLength={150}
                      onChange={(e) => setCaption(p.id, e.target.value)}
                      placeholder="Add a note about this photo"
                    />
                  </div>
                ))}
              </div>
              {draft.photos.length >= MAX_PHOTOS && (
                <p className="text-xs text-muted-foreground">Maximum 5 photos reached.</p>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={onContinue}
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}