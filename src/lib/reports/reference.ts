export function generateReportId(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 4; i++) suffix += alphabet[arr[i] % alphabet.length];
  return `RPT-${y}-${m}${d}-${suffix}`;
}

export function generateAnonCode(seed?: string): string {
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return `ANON-${h.toString(16).padStart(8, "0").slice(0, 6).toUpperCase()}`;
  }
  const arr = new Uint8Array(3);
  crypto.getRandomValues(arr);
  return `ANON-${Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}