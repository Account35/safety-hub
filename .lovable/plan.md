# Phase 3 — Multi-Channel Reporting System

A guided, privacy-first reporting wizard launched from any case detail page. Six steps: safety → methods → text/voice/photo (one or more) → location → preview → confirmation. Reference codes `RPT-YYYY-MMDD-XXXX` feed Phases 4/6/9.

## Backend (Lovable Cloud)

Two migrations (approval required):

1. **`reports` table**
   - `id uuid PK`, `report_id text unique` (RPT-YYYY-MMDD-XXXX)
   - `case_id uuid`, `case_type text` ('wanted' | 'missing')
   - `reporter_id uuid` (auth.uid, nullable for guests)
   - `reporter_anon_code text` (always present — shown to SAPS)
   - `reporting_methods text[]`, `sighting_date date`, `sighting_time time`
   - `location_approximate jsonb` (fuzzed lat/lng, 2-decimal), `location_township text`, `location_landmarks text[]`, `location_privacy_level text`
   - `text_description text`, `companion_description text`, `confidence_level int` (1-5)
   - `voice_recording_path text`, `photos jsonb` (array of `{path, caption}`)
   - `safety_acknowledgment bool`, `accuracy_confirmed bool`, `voluntary_confirmed bool`
   - `status text` default `'submitted'`, `submission_timestamp timestamptz`, timestamps
   - GRANTs + RLS: `authenticated` can `INSERT` (own user_id or null) and `SELECT` own rows; `anon` can `INSERT` (guest reports, no select); `service_role` full.

2. **Storage buckets** (private): `report-voice`, `report-photos`
   - RLS on `storage.objects`: authenticated users can INSERT into their own `report-drafts/{auth.uid}/...` path; service_role full read.

## Server functions (`src/lib/reports/reports.functions.ts`)

- `createReport` — `requireSupabaseAuth` optional (allow anon via separate variant); validates full payload with Zod, generates `report_id`, inserts row, returns reference.
- `getCaseSummary({ caseType, caseId })` — public; returns `{ name, photo, type }` for the persistent header (admin client, safe columns).

Voice/photo files uploaded directly from browser via `supabase.storage` to a draft folder, then path references attached at submit.

## Frontend wizard

Route: `src/routes/report.tsx` replaces existing stub. Uses URL search params `caseType`, `caseId` (already wired from Phase 2) plus `step` for deep linking. Draft state kept in `sessionStorage` keyed by `{caseType}:{caseId}` via a `useReportDraft` hook.

```
src/routes/report.tsx                 # Wizard shell, step routing
src/lib/reports/
  draft.ts                            # session-storage hook + types
  reference.ts                        # RPT-YYYY-MMDD-XXXX generator
  reports.functions.ts                # server fn
  schema.ts                           # Zod schemas per step
  fuzz.ts                             # GPS fuzzing
  exif-strip.ts                       # canvas re-encode → strips EXIF
  townships.ts                        # SA township list
src/components/report/
  case-context-header.tsx
  safety-modal.tsx                    # wanted (red) / missing (navy) variants
  step-indicator.tsx
  method-selection.tsx
  text-step.tsx                       # date/time, description + chips, companion, confidence
  voice-step.tsx                      # MediaRecorder, 3 min cap, waveform, playback
  photo-step.tsx                      # wanted warning, EXIF strip, captions, basic edit (crop/rotate/blur)
  location-step.tsx                   # 3 cards, fuzz, privacy tier, summary
  preview-step.tsx                    # collapsible sections w/ edit links, 2 confirms
  confirmation-step.tsx               # ref number, copy, CTAs, draft cleanup
  draft-resume-banner.tsx             # surfaced on case detail pages
```

Case detail pages (`cases.wanted.$id.tsx`, `cases.missing.$id.tsx`) get the resume banner when a draft for that case exists in sessionStorage. The existing "Report Sighting" button already links to `/report` with the search params.

## Key behaviors

- **Safety modal**: mandatory checkbox before any step renders. Variant by case_type.
- **EXIF stripping**: re-render image through `<canvas>` and re-encode JPEG/PNG before upload — guarantees no EXIF/GPS survives. Show "Privacy protected ✓".
- **Voice**: `MediaRecorder` API, `audio/webm`, max 3:00, pulsing record indicator, blob stored in sessionStorage as object URL until submit.
- **GPS fuzz**: random ±500m offset → round to 2 decimals; never store raw. Reverse geocoding skipped (no API) — derive township from nearest match in `townships.ts` via Haversine, fallback to "Approximate area".
- **Submission**: upload voice + photos to storage with paths `drafts/{anonCode}/{report_id}/...`, then call `createReport` with paths. Generate `reporter_anon_code` = `ANON-{6 hex}` (stable per session for guests, derived from user id hash for auth users).
- **Reference number** persisted in `localStorage` under `report_refs[]` for guest tracking.

## Design

Reuses Phase 1 SAPS tokens (`saps-navy`, `saps-gold`, `alert-red`). All controls ≥ 44×44px. Step indicator: numbered circles, gold filled = done, gold outline = current. Wizard is full-screen on mobile, centered max-w-2xl modal-style card on desktop.

## Out of scope (later phases)

Officer review, chat, rewards, AI scoring, campaigns, report history page.

## Approval needed

1. Migration: `reports` table + GRANTs + RLS.
2. Storage buckets `report-voice` and `report-photos` (private) + object policies.

Want me to proceed with this plan?
