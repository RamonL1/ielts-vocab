export type DailyPlanMode = "beginner" | "intermediate" | "advanced" | "custom";

export interface DailyPlan {
  mode: DailyPlanMode;
  customCount: number; // used when mode === "custom"
}

export const PRESETS: Record<Exclude<DailyPlanMode, "custom">, { label: string; sub: string; count: number }> = {
  beginner: { label: "初级", sub: "每天 30 词", count: 30 },
  intermediate: { label: "中级", sub: "每天 50 词", count: 50 },
  advanced: { label: "高级", sub: "每天 100 词", count: 100 },
};

export const PLAN_KEY = "ielts_vocab_daily_plan";

export function getDailyPlan(): DailyPlan {
  if (typeof window === "undefined") return { mode: "intermediate", customCount: 50 };
  try {
    const stored = localStorage.getItem(PLAN_KEY);
    if (!stored) return { mode: "intermediate", customCount: 50 };
    return JSON.parse(stored) as DailyPlan;
  } catch {
    return { mode: "intermediate", customCount: 50 };
  }
}

export function saveDailyPlan(plan: DailyPlan): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function getDailyCount(plan: DailyPlan): number {
  if (plan.mode === "custom") return plan.customCount;
  return PRESETS[plan.mode].count;
}
