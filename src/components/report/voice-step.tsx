import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blobToDataUrl } from "@/lib/reports/exif-strip";
import type { ReportDraft } from "@/lib/reports/types";

const MAX_SECONDS = 180;

type RecState = "idle" | "permission" | "denied" | "recording" | "ready";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function VoiceStep({
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
  const [state, setState] = useState<RecState>(draft.voice ? "ready" : "idle");
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  async function startRecording() {
    setState("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const previewUrl = URL.createObjectURL(blob);
        const dataUrl = await blobToDataUrl(blob);
        onChange({
          voice: {
            previewUrl,
            dataUrl,
            mimeType: blob.type,
            durationSec: elapsed,
            sizeBytes: blob.size,
          },
        });
        setState("ready");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRef.current = mr;
      mr.start();
      setElapsed(0);
      setState("recording");
      tickRef.current = window.setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setState("denied");
    }
  }

  function stopRecording() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    mediaRef.current?.stop();
  }

  function recordAgain() {
    if (!confirm("Are you sure? This will delete your current recording.")) return;
    if (draft.voice?.previewUrl) URL.revokeObjectURL(draft.voice.previewUrl);
    onChange({ voice: undefined });
    setElapsed(0);
    setState("idle");
  }

  if (state === "denied") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">
          Microphone access required for voice recording. You can switch to text reporting instead.
        </p>
        <Button onClick={onSwitchToText} className="bg-accent text-accent-foreground hover:bg-accent/90">
          Switch to Text Report
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-primary">Record Your Voice</h2>
        <p className="text-xs text-muted-foreground">
          Speak clearly and describe what you saw. Mention the time, location, and what the person was doing.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/30 p-8">
        {state === "ready" && draft.voice ? (
          <>
            <div className="flex h-16 w-full max-w-xs items-end gap-1">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary/70"
                  style={{ height: `${20 + ((i * 13) % 70)}%` }}
                />
              ))}
            </div>
            <audio
              ref={audioRef}
              src={draft.voice.previewUrl}
              onEnded={() => setPlaying(false)}
              hidden
            />
            <div className="text-sm text-muted-foreground">
              Recording: {fmt(draft.voice.durationSec)} · {(draft.voice.sizeBytes / 1024).toFixed(0)} KB
            </div>
            <div className="flex gap-2">
              <Button
                size="lg"
                onClick={() => {
                  if (playing) {
                    audioRef.current?.pause();
                    setPlaying(false);
                  } else {
                    audioRef.current?.play();
                    setPlaying(true);
                  }
                }}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {playing ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Play
                  </>
                )}
              </Button>
              <Button variant="outline" size="lg" onClick={recordAgain}>
                <RotateCcw className="h-4 w-4" /> Record Again
              </Button>
            </div>
            {draft.voice.durationSec < 10 && (
              <p className="text-xs text-muted-foreground">
                Your recording is very brief. You can record again to add more detail.
              </p>
            )}
            <p className="text-xs font-medium text-accent-foreground">
              ✓ Voice report saved to draft
            </p>
          </>
        ) : state === "recording" ? (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="grid h-20 w-20 animate-pulse place-items-center rounded-full bg-destructive text-destructive-foreground shadow-lg ring-4 ring-destructive/30"
              aria-label="Stop recording"
            >
              <Square className="h-8 w-8" />
            </button>
            <p className="font-mono text-2xl font-bold text-primary">{fmt(elapsed)}</p>
            <p className="text-sm font-medium text-primary">Recording…</p>
            {MAX_SECONDS - elapsed <= 90 && (
              <p className="text-xs text-destructive">
                {fmt(MAX_SECONDS - elapsed)} remaining
              </p>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="grid h-20 w-20 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-105"
              aria-label="Start recording"
            >
              <Mic className="h-8 w-8" />
            </button>
            <p className="text-sm text-muted-foreground">Tap to Start Recording</p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!draft.voice}
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Use This Recording
        </Button>
      </div>
    </div>
  );
}