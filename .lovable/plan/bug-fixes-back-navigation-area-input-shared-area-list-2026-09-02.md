# Bug fixes: back navigation, area input, shared area list

Three focused UI/data-consistency fixes. No changes to chat, admin case workflows, staff onboarding, or map/station features.

## 1. Back icon returns to the actual previous page

Today every back arrow in the profile section hard-codes navigation to `/profile`, so a user who arrived from the dashboard, activity list, or a case page is dropped somewhere they were not.

Fix: back buttons go back in history, falling back to `/profile` only when there is no history entry (direct link, refresh).

Screens affected: Profile > Notifications, Privacy & Security, My Reports, Rewards, Language.

## 2. Area input keeps typed value and clears its placeholder

The area input appears in three places and each mishandles state:

- Dashboard "Your area" card — free-text input with a hint value; typed text is discarded if the profile refreshes mid-edit, and the hint reads like a real value.
- Profile > Primary Township — placeholder shown as if it were data; typed text resets when the row re-renders.
- Report wizard location step — picking "use my current location" writes the literal filler text "Approximate area" into the report as if the user had chosen it, and the township search box loses its state when stepping back and forward.

Fix: placeholders stay visually distinct hint text only (never saved, never treated as a value), the in-progress typed value is preserved while editing and across step/page navigation, and the report's auto-location no longer stores filler text as the area name.

## 3. One shared area list for citizens and officers

Right now the citizen side validates against a curated 70-area township list, the dashboard area card accepts any free text, the coordinate map covers only 43 of those areas, and the admin/officer report filter matches whatever string happened to be saved. Result: an area a citizen selects can fail to match the officer dashboard's area filter.

Fix: make the curated township list the single source of truth. Every area picker — dashboard card, profile field, report wizard, and the officer/admin area filter — selects from that same list, so values always match exactly. Areas that were missing coordinates get them added so weather and nearest-station lookups work for every option.

## Technical notes

- Back nav: use TanStack Router's `router.history.back()` (guarded by a canGoBack check) in a small shared `BackButton`, replacing `navigate({ to: "/profile" })` in `src/routes/profile.notifications.tsx`, `profile.privacy-security.tsx`, `profile.reports.tsx`, `profile.rewards.tsx`, `profile.language.tsx`.
- Area input: `src/components/profile-field-row.tsx` (draft not resynced/preserved correctly), `src/components/saps/dashboard-widgets.tsx` `LocationCard` (guard the `useEffect` resync while editing), `src/components/report/location-step.tsx` (drop the `"Approximate area"` fallback written into `locationTownship`; keep the township search term in the draft/step state).
- Shared list: keep `src/lib/reports/townships.ts` as the canonical export; convert the dashboard card and profile row to a searchable select over `TOWNSHIPS`; add the missing entries to `TOWNSHIP_COORDS` in `src/lib/geo/townships-geo.ts`; add a `TOWNSHIPS`-driven area filter select to the admin reports list (`src/routes/admin.reports.tsx`) which already filters on `location_township`.
- No database migration required; `profiles.area`, `profiles.primary_township`, and `reports.location_township` stay as-is and simply hold canonical list values going forward.
