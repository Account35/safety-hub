import type { Message } from "@/lib/chat-types";

export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday)
    return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

export function getDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
}

export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}

export function isSameCluster(a: Message, b: Message): boolean {
  if (a.sender_type !== b.sender_type) return false;
  return Math.abs(new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()) < 120000;
}

const UNREAD_KEY = "chat_unread";

export function getStoredUnread(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(UNREAD_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function setStoredUnread(counts: Record<string, number>) {
  localStorage.setItem(UNREAD_KEY, JSON.stringify(counts));
}

export function getTotalUnread(): number {
  return Object.values(getStoredUnread()).reduce((s, n) => s + n, 0);
}
