# Case-scoped chat between assigned officer and reporter

## Current state

- `conversations` + `messages` tables already exist, per report, with `reporter_id`, `officer_id`, `reporter_anon_code`, and the `bump_conversation_activity()` trigger.
- The citizen side (`/chats`, `/chats/$id`) already reads/writes these through the browser client, protected by reporter-scoped RLS.
- There are **no officer-side RLS policies**, no officer chat UI, and no conversation is created when a report is assigned — so the officer half of the feature does not work today.
- Officer case detail (`/admin/report/$reportId`) already looks up the report's conversation id but does nothing with it.

## What gets built

### 1. Thread creation on assignment (server side)

In `src/lib/admin/reports.functions.ts`, when a report is assigned to an official:

- Ensure a conversation row exists for that report (create if missing), set `officer_id` to the assignee, and keep `status` at `awaiting_reporter`.
- Insert a system message ("A SAPS official has been assigned to your report and can now message you here.").
- Reassignment updates `officer_id` on the existing thread and adds a system message; history is never deleted.
- Existing assigned reports without a thread get one lazily the first time the officer opens the chat panel.

### 2. Officer chat server functions (`src/lib/admin/case-chat.functions.ts`)

All staff-gated via the existing `requireStaff`, using the admin client (no new officer RLS policies needed, so citizen policies stay untouched):

- `getCaseThread({ reportId })` — returns thread meta + messages, but only anonymity-safe fields: `reporter_anon_code`, report reference, status, timestamps. **Never** returns `reporter_id`, profile name, phone, email, or exact location.
- `sendCaseMessage({ reportId, content })` — verifies the caller is the assigned officer (or admin/super_admin), inserts with `sender_type: 'officer'`, PII-warning check reusing `src/lib/chat-privacy.ts`.
- `markCaseThreadRead({ reportId })` — marks reporter messages read.
- Closed/archived threads are read-only.
- Sending and closing are recorded in the audit log as `case_chat.message` / `case_chat.close` (content length only, not message text).

### 3. Officer UI

`src/components/admin/case-chat-panel.tsx`, mounted in the case detail route only:

- Header shows the anonymous code (e.g. `ANON-329FA4`) and thread status — no identity fields.
- Reuses existing `chat-message-list`, `chat-input`, `chat-delivery-indicator`, and `chat-pii-warning` components for a consistent look.
- 10s polling refresh (officer path goes through server functions, so realtime stays on the citizen side only).
- Empty state when the report has no assignee yet: "Assign this report to start a case thread."

### 4. Citizen side

The citizen chat already works and is unchanged. Report tracking (Prompt 8) will link into `/chats/$id` for the report; this plan adds no citizen UI, only makes sure a thread exists so the link has a target.

## Anonymity guarantees

- Officer-facing payloads are explicitly projected column lists; `reporter_id` never crosses the boundary.
- No change to citizen RLS policies, no widening of `anon`/`authenticated` grants.
- Reporter sees the officer as "SAPS Official" (existing behaviour), officer sees only the anon code.

## Out of scope

Report tracking UI (Prompt 8), citizen chat changes, map/stations, staff onboarding, rewards, case galleries.
