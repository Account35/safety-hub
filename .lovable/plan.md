
# Phase 1: Foundation, Auth & Dashboard

Pragmatic Phase 1 build. Enable Lovable Cloud for real auth + roles, ship Guest and User experiences only, stub Detective/Admin role plumbing for later phases.

## 1. Design system (SAPS branding)

Update `src/styles.css` with SAPS tokens (light mode only; dark mode deferred):

- `--saps-navy: #001F3F` → `--primary`
- `--saps-gold: #FFD700` → `--accent` / CTA color
- `--alert-red: #DC2626` → `--destructive`
- Neutral grays per brief; map to `--background`, `--muted`, `--border`, `--foreground`
- Spacing scale (4px base), radius `0.5rem` (8px), 44px min touch targets
- Typography: Inter (body) + Manrope (display) loaded via `<link>` in `__root.tsx` head (never via CSS `@import`)
- Heading scale: H1 2rem / H2 1.5rem / H3 1.25rem / H4 1.125rem; body 1rem / 1.5 line-height
- Focus ring: 3px gold on all focusable elements
- WCAG AA contrast minimums (AAA where reasonable)

Shadcn components already present — restyled via tokens, no per-component color overrides.

## 2. Lovable Cloud + auth

Enable Lovable Cloud. Schema (single migration):

- `profiles` (id FK→auth.users, full_name, area text nullable, created_at) + trigger to auto-create on signup
- `app_role` enum: `guest`, `user`, `detective`, `analyst`, `moderator`, `admin`, `super_admin`
- `user_roles` (id, user_id, role) — separate table, never on profiles
- `has_role(uuid, app_role)` SECURITY DEFINER function
- RLS: users read/update own profile; user_roles readable by self via `has_role`
- GRANTs to `authenticated` + `service_role` (no anon)

Default role on signup = `user`.

Auth methods (per brief defaults): **email/password + Google**. Google via Lovable broker + `supabase--configure_social_auth`.

**Deferred**: 2FA/TOTP, password reset, email verification code UI (rely on Supabase's built-in confirmation email; no custom 6-digit box flow). Account lockout deferred — Supabase rate limits suffice for Phase 1.

## 3. Routes

```
src/routes/
  __root.tsx               # head, fonts, QueryClient, auth invalidation
  index.tsx                # Public landing → "Browse" or "Create account"
  auth.tsx                 # Combined login/register tabs
  _authenticated/
    route.tsx              # Integration-managed gate (ssr: false)
    dashboard.tsx          # User dashboard
```

Public `/` is the guest dashboard (full case-browse access enabled in Phase 2; Phase 1 shows placeholder action cards). Authenticated `/dashboard` is the user variant.

Detective/Admin/Moderator dashboards: **not built in Phase 1**. Role plumbing exists; their routes land in Phases 4/9.

## 4. Dashboard content (Phase 1 scope)

Shared layout: SAPS Navy sticky header (logo + auth status + settings), content area with cards, mobile bottom nav (Home/Cases/Report/Activity/Profile — non-implemented tabs route to placeholders).

Included widgets:
- Time widget (live clock, locale-aware)
- Personalized greeting (time-of-day + name or generic)
- Location section: optional `navigator.geolocation` with privacy copy, fallback to manual area text input stored on profile
- Action cards (role-filtered):
  - Guest/User: Browse Wanted, Browse Missing, Report Anonymously
  - User adds: My Reports, Rewards, Community Activity (all link to "Coming in Phase X" placeholder pages)
- Nearest SAPS station: static placeholder card (real station data is later-phase)

**Deferred**: weather widget, news ticker (per user choice — both flagged as later-phase by brief itself).

## 5. Navigation

- Desktop: left sidebar using shadcn `Sidebar`, collapsible to icon mode
- Mobile: header hamburger → Sheet; persistent bottom nav for primary actions
- Breadcrumbs on non-home pages
- Role-based visibility driven by a single config array keyed on `app_role`
- Skip-to-content link, full keyboard nav, semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`)
- Search bar in header — UI only in Phase 1 (no index to query yet)

## 6. Accessibility

- Semantic HTML, single `<main>` per route in `__root.tsx`
- All icon-only buttons get `aria-label`
- Form inputs labeled; inline validation via Zod with descriptive messages
- `prefers-reduced-motion` respected
- Focus trap inherited from Radix/shadcn primitives (Dialog, Sheet, DropdownMenu)
- Color never sole carrier of meaning (icon + text always accompany red/gold states)
- Text strings centralized in `src/lib/i18n/en.ts` as a flat dictionary keyed `dashboard.welcome.greeting` style — no i18n library yet, but ready for Phase 8

## Technical details

- Server fns under `src/lib/auth.functions.ts` and `src/lib/profile.functions.ts`; admin operations gated by `has_role` checks server-side
- `attachSupabaseAuth` registered in `src/start.ts` `functionMiddleware`
- `onAuthStateChange` listener in `__root.tsx` invalidates router + query cache
- Google sign-in via `lovable.auth.signInWithOAuth("google", ...)` + `supabase--configure_social_auth({ providers: ["google"] })`
- Zod schemas for all forms (email format, password ≥8 chars + uppercase + number + special)
- Password strength meter component (client-only, no extra deps)
- TanStack Query for dashboard data; `defaultPreloadStaleTime: 0` already set
- Lucide icons throughout
- Validation: build passes, `/` renders for anonymous, `/auth` allows signup → auto-redirect to `/dashboard`, Google flow round-trips, role check via `has_role` works from a server fn

## Out of scope (explicit)

2FA, password reset, weather, news ticker, dark mode, wanted/missing galleries, report submission, chat, rewards, analytics, admin/detective dashboards, real station data, dedicated profile/settings page.

