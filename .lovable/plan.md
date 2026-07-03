
# Phase 7 — AI-Assisted Features & Public Awareness Campaigns

Build the AI intelligence layer over Phase 3 reports and the SAPS campaign infrastructure with citizen-facing display. Admin UI is deferred to Phase 9. All AI/analysis access uses `report_id` / `reporter_id` only — never joins to `profiles` / `user_id` / identity.

## 1. Database (single migration)

New tables in `public`, each with GRANTs → RLS → policies:

- **`report_ai_analysis`** (1:1 with `reports.id`)
  - `quality_score int`, `quality_tier` enum(`detailed`,`standard`,`limited`)
  - `quality_factors text[]`, `key_details_extracted jsonb`
  - `suggested_case_matches jsonb` (array of `{case_id, case_type, confidence}`)
  - `cluster_id uuid`, `cluster_confidence` enum(`high`,`medium`), `cluster_role` enum(`primary`,`supporting`), `cluster_primary bool`, `cluster_supporting_count int`, `cluster_contradictions jsonb`, `concentrated_sighting bool`
  - `status` enum(`pending`,`complete`,`partial`,`failed`), `analyst_reviewed bool`
  - RLS: no `authenticated` read/write; `service_role` only (admin surfaces come in Phase 9).

- **`campaigns`**
  - `campaign_type` enum(`safety_tip`,`missing_person_alert`,`wanted_person_alert`,`general_announcement`)
  - `title`, `body_content`, `target_audience` enum(`all_users`,`registered_only`)
  - `target_townships text[]`, `case_id uuid` (nullable, required for alert types via trigger validation)
  - `scheduled_send_timestamp`, `sent_timestamp`, `status` enum(`draft`,`scheduled`,`sent`,`cancelled`)
  - `created_by uuid`, `language_code text default 'en-ZA'`
  - RLS: `authenticated` SELECT only where `status='sent'` (citizens see sent campaigns targeted to them via server fn); writes = `service_role`.

- **`campaign_delivery`**
  - `campaign_id`, `recipient_user_id uuid nullable`, `device_token text nullable`
  - `delivered_timestamp`, `opened_timestamp`
  - RLS: `authenticated` can SELECT/UPDATE own rows (`recipient_user_id = auth.uid()`) to mark opened; writes = `service_role`.

Validation trigger on `campaigns`:
- title 5–80, body 10–500 chars
- `scheduled_send_timestamp >= now() + 15 min` on insert/status→scheduled
- alert types require `case_id`
- each `target_townships` value must exist in a new `townships_ref` seed table (seeded from `src/lib/reports/townships.ts` to enforce Phase 3 consistency)

## 2. AI analysis engine (Prompt 1)

`src/lib/ai/analysis.server.ts` + `src/lib/ai/analysis.functions.ts`:

- `analyzeReport(reportId)` — service-role server fn (called from `submitReport` handler AFTER insert, fire-and-forget with `waitUntil`-style detached promise so it never delays the reference-number response).
- Loads report + linked case (Phase 2). Computes five-dimension score:
  - detail richness (25%), temporal precision (20%), location specificity (25%), method completeness (20%), reporter confidence (10%).
- Uses Lovable AI Gateway (`google/gemini-3-flash-preview`) with structured output (Zod schema via `Output.object`) to:
  - extract `key_details_extracted` (location refs, time refs, clothing, companions, movement), each item flagged confirmed/inferred
  - suggest up to 3 secondary case matches ≥70% confidence by comparing extracted details vs. active Phase 2 cases (candidate pool pre-filtered server-side to same-province/township + active status to keep prompt small)
- Deterministic scoring in TS; AI only handles extraction + narrative `quality_factors[]`.
- 30s timeout → writes `status='partial'`, `analyst_reviewed=false`.
- Maps score → tier (70+ detailed, 40–69 standard, <40 limited).
- Every DB access uses `report_id`; no join to `profiles`. Documented as architectural constraint at top of file.

## 3. Clustering (Prompt 2)

`src/lib/ai/clustering.server.ts`:

- **Real-time hook** inside `analyzeReport`: after analysis, check existing active clusters (last 48h, same `case_id`, matching township, ±2h `sighting_date/time`). If matches all 3 criteria → high; 2/3 → medium. Attach `cluster_id`, set role, update primary's supporting count. If no cluster and another report matches, create new `cluster_id` and mark higher-quality report primary.
- **Daily batch** via `pg_cron` → `/api/public/hooks/cluster-sweep`:
  - Re-cluster last 48h reports, detect contradictions (compare `key_details_extracted.clothing` between cluster members) → write `cluster_contradictions`.
  - Missing-person concentrated sighting: 3+ missing reports within same township + 2h window → `concentrated_sighting=true`.
  - Expire clusters: wanted >7 days, missing >3 days → clear cluster fields.

Notification to assigned officer on cluster growth is a no-op stub in Phase 7 (officer assignment doesn't exist yet); TODO comment referencing Phase 9.

## 4. Campaign infrastructure (Prompt 3)

`src/lib/campaigns/campaigns.functions.ts` (service-role, no public write API in this phase — Phase 9 admin UI will call them; expose typed fns now so Phase 9 has the surface):

- `createCampaign`, `scheduleCampaign`, `cancelCampaign`, `resolveRecipients(campaignId)`, `markDelivered`, `markOpened`.
- Scheduler `/api/public/hooks/campaign-dispatch` (pg_cron every minute):
  - Selects `status='scheduled' AND scheduled_send_timestamp<=now()`.
  - Transitions to `sent` first (dedupe), then resolves recipients from `profiles` (registered) + optional device tokens, filters by `primary_township ∈ target_townships` (empty = national) and `language_preference = language_code` (soft-match: fall back to include all when only en-ZA exists).
  - Bulk-inserts `campaign_delivery` rows.
  - Push delivery uses existing Phase 4 notification stub (`notifyUser` from `chat-utils`); Phase 7 wires campaign payloads through it without inventing new channels.
- Cancellation clears pre-created `campaign_delivery` rows.
- `getMyCampaigns({ limit, offset })` — authenticated citizen fn returning campaigns delivered to the caller, joined to case thumbnail for alert types.

## 5. Citizen-facing campaign display (Prompt 4)

- **`/campaigns/$id`** route (`src/routes/campaigns.$id.tsx`) — SAPS badge, H1 title (SAPS Navy), body text, "From SAPS, {date}", optional "View Case Details" button for alert types linking to `/cases/{wanted|missing}/$id`. Marks `campaign_delivery.opened_timestamp` on mount.
- **`/campaigns`** — paginated history using the Phase 2 pagination component.
- **Activity tab (`src/routes/activity.tsx`)** — add "SAPS Announcements" section below existing conversations:
  - Latest 5 delivered campaigns, card with title, 60-char preview, relative time, SAPS Gold unread dot (unread = no `opened_timestamp`).
  - Alert-type cards include 30×30 circular case thumbnail + "Missing Person" / "Wanted Person" label using Phase 2 badge colors.
  - Tapping alert-type card → Phase 2 case detail route directly (no intermediate). Informational → `/campaigns/$id`.
  - "View All" link when >5.
- **BottomNav badge** (`src/components/saps/bottom-nav.tsx`): extend `getTotalUnread` composition so Activity badge = conversations unread + campaigns unread (additive; conversation tracking untouched). Add `getUnreadCampaigns()` polling the same 5s interval.
- Opening the Activity tab and scrolling the Announcements section marks visible campaigns opened (matches Phase 4 read behavior).

## 6. Accessibility & consistency hardening (Prompt 5)

- Verify `report_ai_analysis` schema has no `user_id`/PII columns — enforced by table definition.
- Campaign detail: SAPS badge alt "Official SAPS communication"; case thumbnail alt "Photograph of {full_name}" (Phase 2 pattern).
- Activity announcements: H2 heading, aria-live "New SAPS announcement: {title}" on new push (extends Phase 4 announcer).
- Township validation trigger enforces exact-string match with Phase 3 list.
- Enum values (`safety_tip` etc.) shared via TS constants imported by both server fns and UI — no duplicate string literals.
- 44×44 tap targets via padding on Announcement cards, "View All", "View Case Details".
- Reuse existing SAPS badge component/asset — no new variant.

## Technical notes

- **Anonymity architectural comment** at top of `analysis.server.ts`, `clustering.server.ts`, and the migration file: "Access reports via report_id/reporter_id only. Never join to profiles/user_id/identity_confirmation."
- **Fire-and-forget analysis**: inside `submitReport` handler, after insert succeeds, invoke `void analyzeReport(reportId).catch(logError)` before returning. In Cloudflare Worker runtime, use `ctx.waitUntil`-equivalent via a top-level detached promise; acceptable because analysis writes to its own table and doesn't affect the response.
- **AI model**: `google/gemini-3-flash-preview` default, structured output via Zod schema.
- **Cron endpoints** live under `src/routes/api/public/hooks/` (cluster-sweep, campaign-dispatch), authenticated via `apikey` header pattern.
- **Migration order**: enums → `townships_ref` seed → `report_ai_analysis` → `campaigns` → `campaign_delivery` → GRANTs → RLS → policies → validation trigger → indexes on `(status, scheduled_send_timestamp)`, `(campaign_id, recipient_user_id)`, `(cluster_id)`.
- No admin UI, no reporter-visible quality score, no heat maps, no facial recognition, no reply/share on campaigns.
