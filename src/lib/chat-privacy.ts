export interface ScanResult {
  hasPii: boolean;
  detectedText: string;
  type: "phone" | "email" | "address" | "name" | null;
}

const PHONE_RE = /(\+27|0)[0-9\s]{9,11}/g;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const ADDRESS_RE = /\b\d{1,5}\b.{1,20}(Street|Avenue|Road|Drive|Close|Crescent|Lane|Place|St|Ave|Rd|Dr)\b/gi;
const NAME_RE = /\b[A-Z][a-z]{2,}\s[A-Z][a-z]{2,}\b/g;

export function scanForPii(text: string): ScanResult {
  let match: RegExpExecArray | null;

  PHONE_RE.lastIndex = 0;
  match = PHONE_RE.exec(text);
  if (match) return { hasPii: true, detectedText: match[0].trim(), type: "phone" };

  EMAIL_RE.lastIndex = 0;
  match = EMAIL_RE.exec(text);
  if (match) return { hasPii: true, detectedText: match[0].trim(), type: "email" };

  ADDRESS_RE.lastIndex = 0;
  match = ADDRESS_RE.exec(text);
  if (match) return { hasPii: true, detectedText: match[0].trim(), type: "address" };

  NAME_RE.lastIndex = 0;
  match = NAME_RE.exec(text);
  if (match) return { hasPii: true, detectedText: match[0].trim(), type: "name" };

  return { hasPii: false, detectedText: "", type: null };
}

export function isContactRequest(officerMessage: string): boolean {
  const lower = officerMessage.toLowerCase();
  return (
    lower.includes("reach you") ||
    lower.includes("contact you") ||
    lower.includes("call you") ||
    lower.includes("phone number") ||
    lower.includes("email")
  );
}
