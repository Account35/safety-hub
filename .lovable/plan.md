
# Phase 8 — Multilingual Support & Accessibility

Delivers a runtime i18n system (English `en-ZA` + Afrikaans `af-ZA`), a language picker in Profile settings, high-contrast mode, four-level text scaling, and reduce-motion — all inherited by every existing screen with no layout rebuilds.

Aligned with the user's pragmatic-phased preference: **translations stored as bundled JSON files in the client, not in the database**. The DB only stores the user's chosen language + accessibility prefs. This avoids a `TRANSLATIONS` table with thousands of rows on the read path of every page. Future languages are added by dropping a new JSON file and toggling `is_active` in a small registry.

---

## 1. Data model (minimal DB footprint)

Migration adds two tables + extends `profiles`:

- `profiles.language_preference text default 'en-ZA'` (add column if missing)
- `public.accessibility_preferences`
  - `user_id uuid pk references auth.users on delete cascade`
  - `high_contrast_enabled bool default false`
  - `text_scale_factor numeric default 1.0` (constrained to 1.0, 1.25, 1.5, 2.0)
  - `reduce_motion_enabled bool default false`
  - RLS: user reads/writes their own row only.
- `public.translation_fallback_log` (monitoring — insert-only from client for missing keys)
  - `translation_key text`, `language_code text`, `logged_at timestamptz default now()`
  - RLS: authenticated may INSERT; SELECT restricted to `admin` role via `has_role`.

Language registry lives in code (`src/lib/i18n/registry.ts`) — no DB table. It's a tiny static list; putting it in Postgres just costs a round-trip.

## 2. Translation infrastructure (`src/lib/i18n/`)

```text
src/lib/i18n/
├── registry.ts        # LANGUAGES = [{ code: 'en-ZA', ... }, { code: 'af-ZA', ... }]
├── en.ts              # existing — extend to full coverage
├── af.ts              # new — full Afrikaans strings
├── types.ts           # TranslationKey union derived from en.ts shape
├── i18n-context.tsx   # Provider: current lang, setLang, t(key, vars), plural()
└── use-translation.ts # hook wrapper
```

- **Keys**: nested object matching dot-notation (`t('reporting.safetyWarning.heading')`). English is the source of truth; `af.ts` mirrors its shape and is type-checked against it.
- **Interpolation**: `{{userName}}` replaced at render.
- **Plurals**: `t.plural('profile.reports.count', n)` picks `_zero | _one | _many`.
- **Fallback**: missing af-ZA key → return en-ZA + fire-and-forget insert into `translation_fallback_log` (debounced/dedup'd in memory).
- **Load**: both bundled statically; language switch is a state change, no network fetch. Sub-second switching is trivial.
- **Persistence**: authenticated → `profiles.language_preference`; guest → `localStorage['cst_language_preference']`. On sign-up, migrate guest value into profile.

## 3. Language selection UI

Row added to `src/routes/profile.tsx` (above notification settings) labelled `Language / Taal` with current language on the right. Tapping opens `src/routes/profile.language.tsx` — list of active languages showing English name, native name, completion badge, gold check on current. Selection saves + shows toast in the *new* language.

## 4. Screen wiring (Prompt 3)

Sweep Phases 1–7 route/component files and replace hardcoded citizen-facing strings with `t('…')`. No layout changes. Explicitly skipped:
- Admin routes (none exist yet — Phase 9)
- User-generated data (case descriptions, chat messages, campaign body content)
- Proper nouns (bank names, `RPT-…` reference IDs)

Special care:
- **Safety warning** (`src/components/report/safety-modal.tsx`): translated body/labels; mandatory checkbox behaviour unchanged.
- **"ARMED AND DANGEROUS"** (wanted detail): translated, same red/uppercase/bold visual weight.
- **"SAPS Officer"** → **"SAPD-Beampte"** in Afrikaans across chat surfaces.

## 5. Accessibility (Prompt 4)

All driven off CSS variables and root font size — every existing screen inherits automatically.

- **High contrast**: `html[data-contrast="high"]` overrides in `src/styles.css` remapping `--background`, `--foreground`, `--primary`, `--accent`, `--destructive`, etc., to WCAG AAA-safe values.
- **Text scale**: `html[data-scale="1.25|1.5|2"]` sets `font-size` on `:root`. Since shadcn/Tailwind sizes are rem-based, everything scales.
- **Reduce motion**: `html[data-reduce-motion="true"]` disables/instantifies transitions and animations project-wide via a small utility block; auto-init from `matchMedia('(prefers-reduced-motion: reduce)')` on first load.
- Settings UI added to `src/routes/profile.privacy-security.tsx` (toggle + radio group + live preview swatch/sentence). Server function saves to `accessibility_preferences`; guest values in `localStorage` under `cst_high_contrast`, `cst_text_scale`, `cst_reduce_motion`.
- **Accessibility summary card** on `profile.tsx` when any pref ≠ default.

Applied at boot in `__root.tsx` via a small `AccessibilityProvider` that sets `data-*` attributes on `<html>` from prefs.

## 6. Verification (Prompt 5)

- Type-level guarantee: `af.ts` must satisfy the type derived from `en.ts` — TS build fails on missing keys, so 100% coverage is enforced at compile time (no runtime audit needed).
- Manual smoke script: log fallback events; expect zero during the Afrikaans test path.
- Confirm `_authenticated/` routes and (future) admin routes are not wrapped by the i18n `t()` calls — only citizen-facing text is translated.
- CSS logical properties note: keep existing utilities; no RTL work needed for SA languages.

## 7. Deliverables (file map)

New:
- `supabase/migrations/<ts>_phase8_i18n_a11y.sql`
- `src/lib/i18n/registry.ts`, `af.ts`, `types.ts`, `i18n-context.tsx`, `use-translation.ts`
- `src/lib/accessibility/accessibility-context.tsx`, `accessibility.functions.ts`
- `src/routes/profile.language.tsx`
- Extend `src/lib/i18n/en.ts` to full key coverage

Edited (wiring only, no layout changes):
- `src/routes/__root.tsx` (providers + `data-*` attributes)
- `src/routes/profile.tsx` (language row + a11y summary)
- `src/routes/profile.privacy-security.tsx` (accessibility section)
- `src/styles.css` (high-contrast + scale + reduce-motion blocks)
- Phase 1–7 route/component files: replace hardcoded strings with `t(...)`

## 8. Out of scope (per spec)

Zulu/Xhosa/Sotho content, machine translation of report bodies, admin panel translation, sign language, voice nav, RTL layouts.

---

**Suggested execution order** if you'd like to split this into approvable chunks:
1. Migration + i18n scaffold + accessibility CSS/context (foundation, no visible change yet)
2. Language picker UI + accessibility settings UI
3. String extraction sweep across Phases 1–7 (largest edit, mostly mechanical)
4. Full Afrikaans content pass + verification

Reply with "go" to build all four in one pass, or pick a starting chunk.
