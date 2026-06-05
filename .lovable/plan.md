## Phase 2: Wanted & Missing Persons Gallery System

Build the case discovery system on top of Phase 1 auth/dashboard. Read-only browsing — no reporting (Phase 3), no admin creation (Phase 9), no rewards (Phase 6).

### Scope

**In:**
- `/cases` landing (dual-card decision point)
- `/cases/wanted` gallery + filters + search
- `/cases/missing` gallery + filters + search
- `/cases/wanted/$id` detail view
- `/cases/missing/$id` detail view
- Seed data (~50 wanted, ~30 missing) so galleries are populated
- Accessibility (keyboard nav, alt text, ARIA live regions for filter results)
- Responsive grid (1/2/3 cols)

**Deferred (correctly per spec):** report submission, bookmarking, rewards UI, admin CRUD, comments, real-time updates, statistics.

**Phase 1 deferrals respected:** no infinite-scroll preference toggle (Phase 5 settings), no i18n switching (Phase 8), no dark mode.

### Data model (migration)

Two tables in `public`, both publicly readable (cases are meant for citizen browsing), writeable only by service role for now (admin tools come in Phase 9).

`wanted_persons`:
- identification: full_name, aliases (text[]), age, gender, ethnicity
- physical: height_cm, weight_kg, build, hair_color, eye_color, complexion, distinguishing_features (text[])
- crime: crimes (jsonb — array of {charge, date, severity}), danger_level (enum: high/medium/low), armed (bool), warrant_number, investigating_officer, station
- last seen: last_seen_location, last_seen_at, last_seen_notes, known_associates (text[]), known_hangouts (text[]), vehicle
- reward_amount (numeric, nullable)
- photos (text[] of URLs — use unsplash/placeholder URLs for seed)
- is_active, created_at, updated_at

`missing_persons`:
- identification: full_name, age_at_disappearance, gender, ethnicity
- physical: same as above
- medical: medical_conditions (text[]), cognitive_impairment (bool), special_needs (text[])
- disappearance: circumstances (enum: voluntary/family_conflict/endangered/medical/unknown), circumstances_narrative, last_seen_location, last_seen_at, last_seen_clothing, possessions (text[])
- vulnerability: vulnerability_indicators (text[]), is_endangered (bool)
- contact: family_contact_name, family_contact_phone
- photos (text[])
- case_status (enum: active/found/closed), created_at, updated_at

RLS: `SELECT` open to `anon` + `authenticated` (public safety info); no insert/update/delete policies (service_role only).

### Routes & files

```
src/routes/
  cases.tsx                          → landing (dual cards)
  cases.wanted.tsx                   → wanted gallery
  cases.wanted.$id.tsx               → wanted detail
  cases.missing.tsx                  → missing gallery
  cases.missing.$id.tsx              → missing detail

src/lib/cases/
  cases.functions.ts                 → server fns: listWanted, listMissing, getWanted, getMissing (use supabaseAdmin since public read)
  types.ts                           → DTO types
  filters.ts                         → filter schemas (zod) + helpers (age/time bucketing)

src/components/cases/
  case-card.tsx                      → shared card (variant: wanted | missing)
  filter-panel.tsx                   → slide-in drawer (mobile) / sidebar (desktop) using Sheet
  active-filter-pills.tsx
  search-bar.tsx
  gallery-grid.tsx                   → responsive grid + skeleton + empty state
  pagination.tsx                     → wraps shadcn Pagination
  danger-badge.tsx, vulnerability-badge.tsx
  detail/                            → header, physical-description, crime-info, danger-assessment, last-seen, reward-banner, vulnerability-section, contact-section, action-buttons
```

### Technical approach

- **Filters & search live in URL** via `validateSearch` + `zodValidator` (page, q, danger, crimeCategories[], location, timeAdded, reward, sort for wanted; analogous for missing). Survives navigation to detail and back.
- **Loader pattern:** `ensureQueryData` + `useSuspenseQuery` (TanStack Query, per template default). `loaderDeps` declares the search subset.
- **Server fns** call `supabaseAdmin` (public data, no auth required) — placed under `src/lib/cases/cases.functions.ts`, import `client.server` inside the handler.
- **Pagination** (server-side): 20 per page, total count returned. No infinite scroll for Phase 2 — pagination is simpler, accessible, and matches the spec's "pagination or infinite scroll" allowance.
- **Sort:** newest / oldest / a-z / z-a. "Nearest to you" deferred (no geocoding in Phase 1). "Most relevant" = newest by default.
- **Images:** seed with stable Unsplash portrait URLs; lazy-load via `loading="lazy"`, `aspect-[4/5]` wrapper, `object-cover`.
- **Detail views:** full page (not modal) for simplicity, SSR-friendly head() metadata per case.
- **Action buttons** on detail: "Report Sighting" links to `/report?caseType=wanted&caseId=...` (Phase 3 wires it up); "Share" uses Web Share API with fallback to copy link.
- **Accessibility:** `aria-live="polite"` region announces "Showing X of Y results" after filter changes; filter panel uses Sheet (Radix → focus trap built in); cards are `<Link>` with full descriptive aria-label.

### Seed data

Single migration inserts ~50 wanted + ~30 missing with varied danger levels, crime types, vulnerabilities, locations (Soweto, Johannesburg CBD, Sandton, Pretoria, Durban, Cape Town, Port Elizabeth, etc.), and time-missing ranges. Photo URLs use a deterministic stock-photo source.

### Out of scope reminders

- No bookmarking, no "my township" auto-filter from profile.area (would require profile read on public route; the user's area is shown only as a default suggestion in the location filter if signed in — feasible via client-side enhancement, will keep simple).
- No reward banner content beyond `reward_amount` display.
- No infinite scroll, no pagination/infinite-scroll preference setting.

### Build order

1. Migration: create both tables + RLS + seed data
2. Server fns + types + filter schemas
3. Shared components (card, filter panel, search, grid, pagination)
4. `/cases` landing
5. Wanted gallery + detail
6. Missing gallery + detail
7. Wire `/cases` link in dashboard ActionGrid (already exists from Phase 1)
8. Verify build, fix lints, screenshot a few key views
