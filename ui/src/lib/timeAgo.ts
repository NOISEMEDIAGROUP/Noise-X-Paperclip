import { formatRelativeTimeFromNow } from "./locale";

export function timeAgo(date: Date | string): string {
  return formatRelativeTimeFromNow(date);
}
