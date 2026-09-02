import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { RANKS, WORK_EMAIL_RE, resolveRank } from "@/lib/admin/ranks";
import type { StaffRoleName } from "@/lib/admin/staff.functions";

export interface RawStaffRow {
  row: number;
  fullName: string;
  rank: string;
  email: string;
}

export interface ValidStaffRow {
  row: number;
  fullName: string;
  rank: string;
  email: string;
  role: StaffRoleName;
}

export interface RowIssue {
  row: number;
  email: string;
  reason: string;
}

export interface ValidationResult {
  valid: ValidStaffRow[];
  errors: RowIssue[];
  ranks: string[];
}

export interface CommitResult {
  created: { row: number; email: string; role: StaffRoleName }[];
  skipped: RowIssue[];
}

const rowSchema = z.object({
  row: z.number().int().min(1),
  fullName: z.string().max(200),
  rank: z.string().max(80),
  email: z.string().max(200),
});

const MAX_ROWS = 500;

const inputSchema = z.object({ rows: z.array(rowSchema).min(1).max(MAX_ROWS) });

async function existingEmails(
  supabaseAdmin: Awaited<
    ReturnType<typeof import("@/lib/admin/admin.server").requireStaff>
  >["supabaseAdmin"],
): Promise<Set<string>> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return new Set((data?.users ?? []).map((u) => (u.email ?? "").toLowerCase()).filter(Boolean));
}

function validate(rows: RawStaffRow[], taken: Set<string>): ValidationResult {
  const valid: ValidStaffRow[] = [];
  const errors: RowIssue[] = [];
  const seen = new Set<string>();

  for (const raw of rows) {
    const fullName = raw.fullName.trim();
    const email = raw.email.trim().toLowerCase();
    const reasons: string[] = [];

    if (fullName.length < 3 || fullName.length > 120) {
      reasons.push("Full Name must be 3–120 characters");
    }
    const rank = resolveRank(raw.rank);
    if (!rank) reasons.push(`Unrecognized rank "${raw.rank.trim() || "(blank)"}"`);
    if (!WORK_EMAIL_RE.test(email)) {
      reasons.push("Work Email must be name.surname@saps.gov.za");
    } else if (seen.has(email)) {
      reasons.push("Duplicate email earlier in the file");
    } else if (taken.has(email)) {
      reasons.push("An account already exists with this email");
    }

    if (reasons.length || !rank) {
      errors.push({ row: raw.row, email: raw.email.trim(), reason: reasons.join("; ") });
      continue;
    }
    seen.add(email);
    valid.push({ row: raw.row, fullName, rank: rank.rank, email, role: rank.role });
  }

  return { valid, errors, ranks: RANKS };
}

/** Dry-run validation. Writes nothing. Super admin only. */
export const validateStaffRows = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<ValidationResult> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["super_admin"]);
    return validate(data.rows, await existingEmails(supabaseAdmin));
  });

/**
 * Creates accounts for valid rows via expiring invite links (each staff member
 * sets their own password on first login). No passwords are generated.
 */
export const commitStaffRows = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<CommitResult> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["super_admin"]);

    const { valid, errors } = validate(data.rows, await existingEmails(ctx.supabaseAdmin));
    const created: CommitResult["created"] = [];
    const skipped: RowIssue[] = [...errors];

    for (const row of valid) {
      const { data: invited, error } = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(
        row.email,
        { data: { full_name: row.fullName, rank: row.rank } },
      );
      if (error || !invited?.user) {
        skipped.push({
          row: row.row,
          email: row.email,
          reason: error?.message ?? "Invite could not be sent",
        });
        continue;
      }

      const userId = invited.user.id;
      const { error: roleErr } = await ctx.supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: row.role }, { onConflict: "user_id,role" });
      if (roleErr) {
        skipped.push({ row: row.row, email: row.email, reason: roleErr.message });
        continue;
      }

      await ctx.supabaseAdmin
        .from("profiles")
        .update({ full_name: row.fullName })
        .eq("id", userId);

      await logAdminAction(ctx, "staff.role_grant", "user", userId, {
        role: row.role,
        rank: row.rank,
        email: row.email,
        source: "bulk_upload",
      });
      created.push({ row: row.row, email: row.email, role: row.role });
    }

    await logAdminAction(ctx, "staff.bulk_add", "staff_import", null, {
      submitted: data.rows.length,
      created: created.length,
      skipped: skipped.length,
      created_emails: created.map((c) => c.email),
      skip_reasons: skipped,
    });

    return { created, skipped };
  });
