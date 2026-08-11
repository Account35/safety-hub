import { z } from "zod";

export const passwordRule = z
  .string()
  .min(12, "At least 12 characters")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[a-z]/, "Needs a lowercase letter")
  .regex(/[0-9]/, "Needs a number")
  .regex(/[^A-Za-z0-9]/, "Needs a special character");

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);

  let score = 0;
  if (pw.length >= 12) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber && hasSpecial) score++;

  const labels = ["Too short", "Weak", "Medium", "Strong"] as const;
  return { score: score as 0 | 1 | 2 | 3, label: labels[score] };
}

export const passwordRequirementHint = "12+ chars, uppercase, lowercase, number, symbol";
