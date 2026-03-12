import i18n from "../i18n";

export function statusLabel(status: string): string {
  const key = `status.${status}`;
  const translated = i18n.t(key, { ns: "common" });
  if (translated !== key) return translated;
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function priorityLabel(priority: string): string {
  const key = `priority.${priority}`;
  const translated = i18n.t(key, { ns: "common" });
  if (translated !== key) return translated;
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function adapterLabel(adapterType: string): string {
  const key = `adapter.${adapterType}`;
  const translated = i18n.t(key, { ns: "common" });
  if (translated !== key) return translated;
  return adapterType;
}

export function roleLabel(role: string): string {
  const key = `role.${role}`;
  const translated = i18n.t(key, { ns: "common" });
  if (translated !== key) return translated;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function goalLevelLabel(level: string): string {
  const key = `goalLevel.${level}`;
  const translated = i18n.t(key, { ns: "common" });
  if (translated !== key) return translated;
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function approvalTypeLabel(type: string): string {
  const key = `approvalType.${type}`;
  const translated = i18n.t(key, { ns: "common" });
  if (translated !== key) return translated;
  return type.replace(/_/g, " ");
}

export function runSourceLabel(source: string): string {
  const key = `runSource.${source}`;
  const translated = i18n.t(key, { ns: "common" });
  if (translated !== key) return translated;
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function formatTimeAgo(date: Date | string): string {
  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.round((now - then) / 1000);

  if (seconds < MINUTE) return i18n.t("time.justNow", { ns: "common" });
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return i18n.t("time.mAgo", { m, ns: "common" });
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return i18n.t("time.hAgo", { h, ns: "common" });
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return i18n.t("time.dAgo", { d, ns: "common" });
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return i18n.t("time.wAgo", { w, ns: "common" });
  }
  const mo = Math.floor(seconds / MONTH);
  return i18n.t("time.moAgo", { mo, ns: "common" });
}

export function localizedDate(date: Date | string): string {
  const locale = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
  return new Date(date).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function localizedDateTime(date: Date | string): string {
  const locale = i18n.language?.startsWith("zh") ? "zh-CN" : "en-US";
  return new Date(date).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
