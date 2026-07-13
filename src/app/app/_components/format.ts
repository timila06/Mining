export type RiskLevel = "low" | "medium" | "high" | "critical" | "resolved";

export const riskStyles: Record<RiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  high: "bg-orange-50 text-orange-800 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  resolved: "bg-stone-50 text-stone-600 border-stone-200",
};

export function riskClass(level?: string | null) {
  return riskStyles[(level as RiskLevel) ?? "low"] ?? riskStyles.low;
}

export function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function relationValue<T extends Record<string, unknown>>(relation: T | T[] | null | undefined, key: keyof T) {
  const item = Array.isArray(relation) ? relation[0] : relation;
  return item?.[key] ? String(item[key]) : "Unknown";
}
