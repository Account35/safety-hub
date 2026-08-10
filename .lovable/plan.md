# Phase 9 - Admin Panel & Case Management

Staff-facing admin portal under `/admin`, reusing the existing sign-in page and role system. No second login stack, no duplicate citizen screens.

## Access model

- `/admin/login` is a thin gateway page: if not signed in it links to the existing `/auth` page; if signed in without a staff role it shows "no access"; if staff it forwards to `/admin`.
- All other `/admin/*` pages sit behind one staff-role gate (detective, analyst, moderator, admin, super_admin), reusing the `requireStaff` check already in the codebase.
- Permission matrix per screen: analysts read-only analytics and reports; moderators campaigns; detectives reports and cases; admin and super_admin everything, including settings and admin users.
- Every admin action that changes data writes an immutable audit entry (actor, action, target, details, timestamp).
- Deferred by your choice: 2FA, backup codes, IP whitelisting, geo restriction, emergency override.

## Screens (each exactly one route)

| Route | Contents |
|---|---|
| `/admin` | Overview: queue counts, open cases, pending claims, recent activity, links into each section |
| `/admin/login` | Staff gateway described above |
| `/admin/cases` | Case list with stats, status filter, search, edit/archive/reopen, CSV import |
| `/admin/cases/new` | Wanted and missing person creation forms (tabbed), photo upload, danger and vulnerability assessment |
| `/admin/reports` | Priority-ordered review queue: AI quality score, township, age, status, assignee |
| `/admin/reports/$reportId` | Report detail: text/voice/photo, AI analysis, suggested case matches, anonymous reporter code, assign detective, record outcome, dismiss, open the existing chat thread, evidence and timeline notes |
| `/admin/rewards` | Eligibility list and claim review: verify, approve, mark paid, reject with reason |
| `/admin/campaigns` | Campaign list, create and schedule (reuses existing campaign functions), cancel |
| `/admin/analytics` | Report volume, resolution rate, average investigation duration, engagement, reward totals, CSV export |
| `/admin/settings` | Case settings, feature flags, notification templates, admin user and role management, searchable audit-log viewer |

Cross-phase links only: cases link to `/cases/wanted/$id` and `/cases/missing/$id`, chat links to `/chats/$id`. A shared admin shell with sidebar gives every page back and home navigation.

## Backend work

One migration adds:
- `admin_audit_log` (actor, action, entity type and id, details JSON, created_at) - insert-only, staff read, no update or delete.
- `admin_settings` (key/value JSON) for branding, case settings, feature flags, notification templates.
- New `reports` columns: assigned_to, assigned_at, priority, outcome, outcome_notes; plus extra case statuses for Investigation Ongoing, Hot Lead, Cold Case.
- GRANTs and staff-only RLS on everything new, via the existing `has_role` function.

## Technical notes

- New server-function modules: `src/lib/admin/reports.functions.ts`, `rewards.functions.ts`, `analytics.functions.ts`, `settings.functions.ts`, and `audit.server.ts`. Existing `admin.functions.ts` (overview, case list, upsert, status, bulk upload) is reused and extended with audit writes.
- Flat route files: `admin.tsx` (shell layout with staff gate and `<Outlet />`), `admin.index.tsx`, `admin.login.tsx`, `admin.cases.tsx`, `admin.cases.new.tsx`, `admin.reports.tsx`, `admin.reports.$reportId.tsx`, `admin.rewards.tsx`, `admin.campaigns.tsx`, `admin.analytics.tsx`, `admin.settings.tsx`.
- The route gate is UX only; every server function independently re-verifies the staff role.
- The reports queue uses the realtime subscription already enabled on `reports` for live inserts.
- SAPS tokens only (navy, gold, red), keyboard-navigable tables, honours existing accessibility preferences and i18n strings.
- Reporter identity stays hidden: admins see only `reporter_anon_code` and fuzzed location, never user id, email, or exact coordinates.

## Order of work

1. Migration (audit log, settings, report assignment and outcome fields).
2. Admin shell, gate, overview, login gateway.
3. Cases list, create and edit, CSV import.
4. Reports queue and detail with assignment, outcome, chat link.
5. Rewards and campaigns admin.
6. Analytics, settings, audit-log viewer.