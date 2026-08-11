# Patch: Quick Actions navigation fix + Super Admin test account

## Issue 1 — Quick Actions all land on Profile Settings

The buttons already point at the right URLs (`/profile/reports`, `/profile/rewards`, `/chats`). The real cause is route nesting: `src/routes/profile.tsx` is the route for `/profile` **and** the parent of `/profile/reports`, `/profile/rewards`, `/profile/notifications`, `/profile/privacy-security`, `/profile/language`, but it renders the Profile Settings page instead of an `<Outlet />`. So every `/profile/*` URL renders Profile Settings. The same bug affects `src/routes/chats.tsx` versus `/chats/$id` (opening a conversation shows the list again).

Fix, without creating any new pages:

- Move the existing Profile Settings page from `profile.tsx` to `profile.index.tsx` so `/profile` keeps exactly today's screen, and `/profile/*` children render their own already-built pages.
- Move the existing conversations list from `chats.tsx` to `chats.index.tsx` for the same reason, so `/chats/$id` opens the thread view.
- No layout wrapper is needed — each child page already renders its own shell and back button.
- Verify by opening all four Quick Actions plus a conversation thread and confirming five distinct screens with working back navigation.

## Issue 2 — Seeded Super Admin test account

- Email `superadmin.test@saps.gov.za`, password `TestSAPS#Admin2026!`, email pre-confirmed, created through the backend Auth admin API (not a public signup).
- Granted the `super_admin` role in the existing roles table, which unlocks the full Phase 9 admin panel.
- Flagged as a test seed account and marked as requiring a password change at first sign-in; the admin panel shows a persistent banner stating this account is for testing only and must be disabled or rotated before public launch.
- The admin user list filters test seed accounts out of leadership-facing views; audit logging, session rules, and role checks apply to it unchanged.
- 2FA/TOTP and backup codes are out of scope for this patch (no admin 2FA system exists yet), per your choice.

## Technical notes

- Database: add `is_test_seed_account` and `must_change_password` boolean columns (default false) to `profiles`; no other schema change.
- Account creation uses the backend Auth admin API with the service role, then inserts the `super_admin` role row and sets the two profile flags.
- First sign-in with `must_change_password` true routes the user to the existing password change form before the admin panel becomes usable.
- Route files only move; no route paths, links, or page content change for Issue 1.
