const KEY = "campaign_seen";

function readSet(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSet(s: Set<string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(Array.from(s)));
}

export function markSeen(deliveryId: string) {
  const s = readSet();
  s.add(deliveryId);
  writeSet(s);
}

export function isSeen(deliveryId: string): boolean {
  return readSet().has(deliveryId);
}

const COUNT_KEY = "campaign_unread_count";

export function setCampaignUnreadCount(n: number) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(COUNT_KEY, String(Math.max(0, n)));
}

export function getCampaignUnreadCount(): number {
  if (typeof localStorage === "undefined") return 0;
  const v = Number(localStorage.getItem(COUNT_KEY));
  return Number.isFinite(v) ? v : 0;
}