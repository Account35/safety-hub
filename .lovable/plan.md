## Phase 4 Status

The Phase 4 chat frontend is already implemented from prior work: conversation list, individual conversation view, message bubbles, delivery indicators, PII scanner, welcome card, privacy modal, close modal, search, export, welcome flow, real-time subscription wiring, and the bottom-nav unread badge are all in place (`src/routes/chats.tsx`, `src/routes/chats.$id.tsx`, `src/components/chat-*`, `src/lib/chat-*`).

**What's missing:** the `conversations` and `messages` tables don't exist in the database yet. The frontend queries them and fails silently. This is the single blocker to Phase 4 being functional.

## Plan

### 1. Create the chat database schema (one migration)

Add two tables matching the shapes already assumed by `src/lib/chat-types.ts` and `src/lib/chat-data.ts`:

- `public.conversations`
  - `id uuid pk`, `report_id uuid unique fk → reports`, `case_id uuid`, `case_type text check ('wanted','missing')`, `reporter_id uuid fk → auth.users`, `officer_id uuid null`, `status text check (active|awaiting_reporter|awaiting_officer|closed|archived) default 'active'`, `closure_reason text null`, `created_at`, `updated_at`, `last_activity_at`
  - Optional cached fields already used by the UI: `case_name text`, `case_photo text` (denormalized snapshot so the reporter card renders without cross-table joins)
- `public.messages`
  - `id uuid pk`, `conversation_id uuid fk → conversations on delete cascade`, `sender_type text check ('reporter','officer','system')`, `message_content text not null`, `attachment_reference text null`, `is_deleted boolean default false`, `sent_at`, `delivered_at`, `read_at`

Supporting objects in the same migration:
- `GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;` + `GRANT ALL ... TO service_role;` (no anon; every policy scopes to `auth.uid()`)
- `GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;` + `GRANT ALL ... TO service_role;`
- Enable RLS on both.
- Policies:
  - conversations: reporter can `SELECT` and `UPDATE` (for close) their own rows (`reporter_id = auth.uid()`); no client INSERT (officer/service-role only, so no INSERT policy for authenticated).
  - messages: reporter can `SELECT` messages whose conversation they own; reporter can `INSERT` with `sender_type = 'reporter'` into their own conversations and only when conversation status is `active`/`awaiting_reporter`/`awaiting_officer`; reporter can `UPDATE` officer messages' `read_at` on their own conversations (used by `markMessagesRead`).
- Trigger: after `INSERT` on `messages`, bump `conversations.last_activity_at = now()` and flip `status` toward `awaiting_officer` when the sender is a reporter.
- `updated_at` trigger reusing existing `public.set_updated_at()`.
- Add both tables to `supabase_realtime` publication and set `REPLICA IDENTITY FULL` so the existing `supabase.channel(...).on('postgres_changes', ...)` subscriptions in `chat-data.ts` receive updates.

### 2. Verify end-to-end

After the migration runs and types regenerate:
- Confirm `src/routes/chats.tsx` renders the empty state (no rows yet) instead of erroring.
- Seed one demo conversation + one officer message via the insert tool so the UI can be exercised (reporter must be signed in; use the currently-signed-in user's id).

### Technical notes

- No frontend code changes are required — the existing components already match this schema. If regenerated `types.ts` surfaces a field mismatch, we adjust that single spot; nothing structural.
- Phase-4 items explicitly out of scope for this pass (feedback prompt after closure, per-conversation notification preferences panel, service-worker push notifications) are polish and can be added incrementally once the base chat is confirmed working against real data.

Ready to execute step 1 as soon as you approve.