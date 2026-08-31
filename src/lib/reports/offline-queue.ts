import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dataUrlToBlob } from "@/lib/reports/exif-strip";
import { submitReport } from "@/lib/reports/reports.functions";
import type { ReportMethod } from "@/lib/reports/types";

const KEY = "report_offline_queue";

/** Everything needed to finish a submission later, including un-uploaded media. */
export interface QueuedReport {
  queuedAt: string;
  caseId: string;
  caseType: string;
  reporterAnonCode: string;
  methods: ReportMethod[];
  sightingDate: string | null;
  sightingTime: string | null;
  textDescription: string | null;
  companionDescription: string | null;
  confidenceLevel: number | null;
  locationApproximate: { lat: number; lng: number } | null;
  locationTownship: string | null;
  locationLandmarks: string[];
  locationPrivacyLevel: string;
  ownerId: string;
  voice: { dataUrl: string } | null;
  photos: { dataUrl: string; mimeType: string; caption: string }[];
}

function read(): QueuedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedReport[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedReport[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full — nothing more we can do */
  }
  window.dispatchEvent(new Event("report-queue-changed"));
}

export function queueCount(): number {
  return read().length;
}

export function enqueueReport(item: QueuedReport) {
  write([...read(), item]);
}

/** Uploads any queued media and submits the report. Throws on failure. */
export async function submitQueuedReport(item: QueuedReport): Promise<string> {
  let voicePath: string | null = null;
  if (item.voice) {
    const blob = dataUrlToBlob(item.voice.dataUrl);
    const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("ogg") ? "ogg" : "audio";
    const path = `${item.ownerId}/${item.reporterAnonCode}/${Date.now()}-voice.${ext}`;
    const up = await supabase.storage
      .from("report-voice")
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (up.error) throw new Error(`Voice upload failed: ${up.error.message}`);
    voicePath = up.data.path;
  }

  const uploadedPhotos: { path: string; caption: string }[] = [];
  for (let i = 0; i < item.photos.length; i++) {
    const p = item.photos[i];
    const blob = dataUrlToBlob(p.dataUrl);
    const path = `${item.ownerId}/${item.reporterAnonCode}/${Date.now()}-${i}.jpg`;
    const up = await supabase.storage
      .from("report-photos")
      .upload(path, blob, { contentType: p.mimeType, upsert: false });
    if (up.error) throw new Error(`Photo upload failed: ${up.error.message}`);
    uploadedPhotos.push({ path: up.data.path, caption: p.caption });
  }

  const res = await submitReport({
    data: {
      caseId: item.caseId,
      caseType: item.caseType,
      reporterAnonCode: item.reporterAnonCode,
      methods: item.methods,
      sightingDate: item.sightingDate,
      sightingTime: item.sightingTime,
      textDescription: item.textDescription,
      companionDescription: item.companionDescription,
      confidenceLevel: item.confidenceLevel,
      voiceRecordingPath: voicePath,
      photos: uploadedPhotos,
      locationApproximate: item.locationApproximate,
      locationTownship: item.locationTownship,
      locationLandmarks: item.locationLandmarks,
      locationPrivacyLevel: item.locationPrivacyLevel,
      safetyAcknowledgment: true,
      accuracyConfirmed: true,
      voluntaryConfirmed: true,
    },
  } as never);
  return (res as { reportId: string }).reportId;
}

/** Attempts every queued report; successful ones are removed from the queue. */
export async function flushReportQueue(): Promise<{ sent: string[]; remaining: number }> {
  const items = read();
  if (!items.length) return { sent: [], remaining: 0 };

  const sent: string[] = [];
  const keep: QueuedReport[] = [];
  for (const item of items) {
    try {
      sent.push(await submitQueuedReport(item));
    } catch {
      keep.push(item);
    }
  }
  write(keep);
  return { sent, remaining: keep.length };
}

/**
 * Keeps the queue count in sync and drains it whenever the device comes back
 * online, so a report captured with no signal is never silently lost.
 */
export function useOfflineReportQueue(onSent?: (refs: string[]) => void) {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setPending(queueCount());
    sync();
    setOnline(navigator.onLine);

    const flush = async () => {
      setOnline(true);
      const { sent } = await flushReportQueue();
      setPending(queueCount());
      if (sent.length && onSent) onSent(sent);
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("report-queue-changed", sync);
    window.addEventListener("online", flush);
    window.addEventListener("offline", goOffline);
    if (navigator.onLine) void flush();

    return () => {
      window.removeEventListener("report-queue-changed", sync);
      window.removeEventListener("online", flush);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pending, online };
}
