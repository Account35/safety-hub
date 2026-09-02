# Bulk Add Staff via Excel (Admin Settings, super admin only)

## What gets built

A "Bulk Add Staff" card inside Staff Management on Admin Settings, visible only to super admins:

1. Upload a `.xlsx` file with columns **Full Name**, **Rank**, **Work Email**.
2. Validate everything client-to-server first — nothing is written until the super admin confirms.
3. Row-level error table shows each rejected row, its row number, and the reason.
4. On confirm, each valid row gets an account created in a no-password state plus a unique, expiring invite link emailed to them; they set their own password on first login.
5. Post-upload summary: accounts created vs. rows skipped, each skip with a reason.

## Rank list

There is no rank list in the project yet, so a canonical one is added (`src/lib/admin/ranks.ts`) with the SAPS ranks and the staff role each maps to:

| Rank | Role granted |
| --- | --- |
| Constable, Sergeant, Warrant Officer | detective |
| Captain | analyst |
| Lieutenant Colonel | moderator |
| Colonel, Brigadier | admin |
| Major General, Lieutenant General, General | super_admin |

Unrecognized ranks are flagged as row errors (never guessed).

## Validation rules (per row)

- Full Name: 3-120 chars, required.
- Rank: must match the rank list (case-insensitive, trimmed).
- Work Email: must match `name.surname@saps.gov.za` exactly (lowercase letters/hyphens, single dot, fixed domain).
- Duplicates inside the file → later occurrence skipped.
- Email already registered → skipped with "account already exists".
- Row cap: 500 rows per file.

## Technical approach

- Parsing: add `xlsx` (SheetJS) and parse in the browser so the file never needs uploading; only the parsed rows array goes to the server. Header names matched case-insensitively.
- `src/lib/admin/bulk-staff.functions.ts`
  - `validateStaffRows` — super-admin gated; re-runs all rules server-side (client validation is UX only) and checks existing auth emails; returns `{ valid[], errors[] }`.
  - `commitStaffRows` — super-admin gated; for each valid row calls the auth admin invite API (`inviteUserByEmail`) with the full name + rank in user metadata, which creates the account and sends Lovable Cloud's expiring invite link (default expiry; no password generated anywhere). Then grants the mapped staff role in `user_roles` and sets the profile name.
  - Writes one `staff.bulk_add` audit entry with counts, created emails, and skip reasons; per-account entries use `staff.role_grant`.
- UI: `src/components/admin/bulk-staff-dialog.tsx` — three states (upload → review/errors → summary), accessible table markup, sonner toasts. Mounted from `staff-management.tsx` behind the existing `can("super_admin")` check.

## Notes

- Invite emails use the project's existing auth email sending; if no custom sender domain is configured yet, the default sender is used and I'll flag it after implementation.
- Failures are per-row: one bad invite does not abort the batch; it appears in the summary as skipped with the provider error.

## Out of scope

Chat, reports workflow, map/stations, citizen pages, existing single-staff add/delete flows (untouched apart from mounting the new dialog).
