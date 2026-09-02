# Staff management: superadmin-only add/remove + safeguarded account deletion

Scope: Admin Settings page and the new account-deletion flow only. No changes to chat, reports workflow, map, or citizen pages.

## 1. Superadmin-only staff management

- Add a "Staff & roles" section to Admin Settings. It renders only when the signed-in account holds `super_admin`; Detective, Analyst, Moderator and Admin never see the section, its buttons, or its data.
- The section lists every staff account with its roles, plus:
  - Add staff: pick an existing user account (by email) and grant a role.
  - Remove staff: revoke a role, or delete the official's account entirely (flow below).
- Server side is the real gate: the add/remove/delete server functions require `super_admin` and reject everyone else, so hiding the UI is never the only protection. A super admin cannot delete their own account or drop their own super-admin role.

## 2. Deletion confirmation modal

When a super admin deletes an official, a modal opens showing:

- A disclaimer that the deletion is recorded and reported to the official's superior.
- All cases (reports) currently assigned to that official, split into **Open** (submitted / under review / investigated) and **Closed** (resolved), with reference and status.
- A required checkbox confirming case transfer has been arranged.
- A transfer choice: assign the open cases to a named replacement officer (dropdown of remaining staff) **or** send them to the general unassigned/pending pool.
- A required free-text reason (minimum ~10 characters).
- The Delete button stays disabled until the checkbox, the transfer choice, and the reason are all provided.

On confirm, in one server call: reassign the open cases per the chosen option, revoke the official's staff roles, delete their auth account, and write the audit entry. Closed cases keep their history untouched.

## 3. Audit trail

- The deletion is logged to the existing immutable audit log with: actor (who deleted), target official (id + name + roles), reason, timestamp, transfer outcome (replacement officer or unassigned pool) and the list of transferred case references.
- Admin Settings gets a "Staff deletions" view of these entries, visible to super admin only, showing target, reason, transfer outcome and who acted. The existing general audit table stays as is.

## Technical notes

- New server functions in `src/lib/admin/settings.functions.ts` (or a new `staff.functions.ts`): `getStaffDeletionPreview` (assigned cases split open/closed), `deleteStaffAccount` (transactional reassign + role revoke + `auth.admin.deleteUser` + audit), and `addStaffByEmail`. All use `requireStaff(["super_admin"])`.
- Reassignment writes `reports.assigned_to` (replacement officer, or `null` + `priority`/status untouched for the pending pool) and clears `assigned_at` when unassigned.
- UI: new `src/components/admin/staff-management.tsx` and `staff-delete-dialog.tsx` using existing shadcn `Dialog`, `Checkbox`, `Select`, `Textarea`; mounted in `src/routes/admin.settings.tsx` behind `can("super_admin")`.
- No schema migration expected: `admin_audit_log` and `reports.assigned_to` already cover the requirements.
