export type CaseType = "wanted" | "missing";
export type ReportMethod = "text" | "voice" | "photo";
export type PrivacyLevel = "township" | "neighborhood" | "landmark";

export interface DraftPhoto {
  /** session-local id */
  id: string;
  /** object URL for preview */
  previewUrl: string;
  /** base64 dataURL of EXIF-stripped image, used for upload at submit */
  dataUrl: string;
  mimeType: string;
  caption: string;
  width: number;
  height: number;
}

export interface DraftVoice {
  /** object URL for playback */
  previewUrl: string;
  /** base64 dataURL of the audio, used for upload at submit */
  dataUrl: string;
  mimeType: string;
  durationSec: number;
  sizeBytes: number;
}

export interface ReportDraft {
  caseType: CaseType;
  caseId: string;
  safetyAcknowledged: boolean;
  methods: ReportMethod[];
  // Text
  sightingDate?: string; // YYYY-MM-DD
  sightingTime?: string; // HH:MM
  textDescription?: string;
  companionDescription?: string;
  confidence?: 1 | 2 | 3 | 4 | 5;
  // Voice (kept in session memory only — see useReportDraft)
  voice?: DraftVoice;
  // Photos
  photos: DraftPhoto[];
  // Location
  locationApproximate?: { lat: number; lng: number };
  locationTownship?: string;
  locationLandmarks: string[];
  locationPrivacyLevel: PrivacyLevel;
  // Confirmations
  accuracyConfirmed: boolean;
  voluntaryConfirmed: boolean;
  // meta
  startedAt: string;
}

export const STEPS = [
  "safety",
  "method",
  "text",
  "voice",
  "photo",
  "location",
  "preview",
  "done",
] as const;
export type Step = (typeof STEPS)[number];