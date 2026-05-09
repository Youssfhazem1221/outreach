export type TimestampLike =
  | { toMillis?: () => number; toDate?: () => Date; seconds?: number; nanoseconds?: number }
  | Date
  | number
  | string
  | null
  | undefined;

export function getTimestamp(value: TimestampLike): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (typeof value.seconds === "number") {
      return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000);
    }
  }
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  return 0;
}

export function formatRelativeTime(value: TimestampLike) {
  const ms = getTimestamp(value);
  if (!ms) return "Never";
  
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return new Date(ms).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export function formatDateTime(value: TimestampLike) {
  const ms = getTimestamp(value);
  if (!ms) return "Never";
  return new Date(ms).toLocaleString([], { 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}
