# Feature Audit & Gap Analysis — Community Safety Tracker

## Summary

Roughly **70% of the defined scope is built**. The citizen-facing product (auth, cases, reporting, chat, rewards, profile, campaigns, multilingual/accessibility) is largely complete. The **entire police/admin side is missing**, along with several dashboard "awareness" widgets.

## Implemented

| Scope area | Status | Where it lives |
| --- | --- | --- |
| SAPS branding, mobile-first shell, bottom nav | FULL | `src/styles.css`, `components/saps/page-shell.tsx`, `header.tsx`, `bottom-nav.tsx` |
| Guest + registered auth, profile page | FULL | `lib/auth-context.tsx`, `routes/auth.tsx`, `routes/profile.tsx`, `_authenticated/route.tsx` |
| Dashboard clock + dynamic greeting | FULL | `components/saps/dashboard-widgets.tsx` (`TimeAndGreeting`) |
| Approximate location / area indicator | PARTIAL | `LocationCard` — free-text area only, not the Phase 3 township list |
| Wanted & missing galleries, filters, detail views | FULL (grid, not carousel) | `routes/cases.*`, `components/cases/*` |
| Report Sighting + Share on detail views | FULL | `components/cases/share-button.tsx`, `lib/reports/navigation.ts` |
| Multi-channel reporting wizard (text/voice/photo) | FULL | `routes/report.tsx`, `components/report/*` |
| Safety warnings (red wanted / gentle missing) | FULL | `components/report/safety-modal.tsx` |
| EXIF stripping + location fuzzing | FULL | `lib/reports/exif-strip.ts`, `lib/reports/fuzz.ts` |
| Anonymous two-way chat with reference codes | PARTIAL | `routes/chats.tsx`, `chats.$id.tsx`, `components/chat-*` — no quick-reply templates |
| Rewards claim via reference code + report history | PARTIAL | `routes/profile.rewards.tsx`, `profile.reports.tsx` — no leaderboard |
| AI analysis, clustering, SAPS campaigns | FULL (beyond scope) | `lib/ai/*`, `lib/campaigns/*`, `routes/campaigns.*` |
| Multilingual (EN/AF) + accessibility | FULL | `lib/i18n/*`, `lib/accessibility/*`, `routes/profile.language.tsx` |

## Missing or incomplete

1. **Weather widget** (dashboard) — MISSING. Needs a server function calling a weather API keyed on the user's township, plus a card in `dashboard-widgets.tsx`. Depends on the location indicator.
2. **News ticker** (dashboard) — MISSING. Can reuse existing `campaigns` rows as the feed source; needs a marquee component respecting reduce-motion.
3. **Safety tips carousel** — MISSING. `components/ui/carousel.tsx` exists but is unused. Content can come from `campaigns` where `campaign_type = 'safety_tip'`.
4. **Crime statistics modal** — MISSING. No stats source, no aggregation function, no modal. Needs a `crime_stats` table (or aggregation over cases by township) plus filters and a "last updated" stamp.
5. **Police station finder** — INCOMPLETE. `StationCard` is hardcoded to "Johannesburg Central SAPS". Needs a `police_stations` table (name, address, phone, township, lat/lng), a nearest-station lookup from the approximate area, and a stations list route.
6. **Real-time admin alert dashboard** — MISSING. No admin routes exist. `user_roles` + `has_role()` are already in place; needs an `/admin` gated layout, a realtime reports feed, priority flagging (red wanted / blue missing), and status transitions writing back to `reports.status`.
7. **Admin case management (CRUD, bulk upload, heatmaps)** — MISSING. `wanted_persons` / `missing_persons` are read-only to clients; needs admin-only write policies, create/edit/archive forms, CSV bulk upload, and a heatmap over report locations.
8. **Chat quick-reply templates** — MISSING. Small addition to `components/chat-input.tsx` for the officer side.
9. **Rewards leaderboard** — MISSING. Needs an anonymous, reference-code-based aggregation so no identity is exposed.
10. **Carousel presentation on the dashboard** — INCOMPLETE. Scope asks for horizontal scrollable case carousels on the home screen; today only full-page grids exist.

## Technical notes

- Admin work is the largest remaining block and the only part needing new write policies: every admin write must go through `public.has_role(auth.uid(), 'admin')`, never a role column on `profiles`.
- The heatmap must use `reports.location_approximate` (already fuzzed) — never raw coordinates.
- Weather is the only feature requiring an external API key; everything else can be served from existing or new tables.
- Reduce-motion must gate the ticker and any carousel auto-slide via the existing `AccessibilityProvider`.

## Recommended next step

Build the **admin panel foundation + real-time report alert feed** — the single largest gap, and it unblocks case management, status tracking, and officer-side chat.

Suggested next prompt:

```text
Build the SAPS Admin Panel foundation and real-time report alert feed.
Add an /admin route group gated by public.has_role(auth.uid(), 'admin') (with
'detective'/'analyst' read access), redirecting everyone else. Inside it, build a
live report feed subscribed to realtime inserts on reports: newest first, red
left-border for wanted cases and blue for missing, showing reference number,
township, reporting methods, AI quality score from report_ai_analysis, and
relative submission time. Add filter chips for New / Under Review / Being
Investigated / Case Resolved and a status control on each row that updates
reports.status through an admin-only server function. Include a detail drawer
with the full report, photos, voice playback, fuzzed location, and a button to
open or start the anonymous conversation with the reporter.
```