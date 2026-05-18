"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type Scene = "now" | "daily";
export type AgeGroup = "1" | "2" | "3" | "4";

export type PlanItem = { title?: string; reason?: string };

export type PlanResult = {
  childType?: string;
  summary?: string;
  top5?: PlanItem[];
  order?: string[];
  duration?: string;
  nextStep?: string;
  ngActions?: string[];
  parentComment?: string;
};

export type PlanInputSnapshot = {
  scene: Scene;
  childType: string;
  ageGroup: AgeGroup;
  triggers: string[];
  parentStress: string;
  problem: string;
};

export type HistoryEntry = {
  id: string;
  createdAt: number; // epoch ms
  input: PlanInputSnapshot;
  plan: PlanResult;
};

const HISTORY_KEY = "uchinoko_plan_history_v1";
const MAX_ENTRIES = 50;

function safeJsonParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function save(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = safeJsonParse<any[]>(raw, []);
    if (!Array.isArray(arr)) return [];

    return arr
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const createdAt = typeof x.createdAt === "number" ? x.createdAt : Date.now();
        const id = typeof x.id === "string" ? x.id : String(createdAt);
        const input = x.input && typeof x.input === "object" ? x.input : {};
        const plan = x.plan && typeof x.plan === "object" ? x.plan : {};
        return { id, createdAt, input, plan } as HistoryEntry;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function makeId(): string {
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      // @ts-ignore
      return crypto.randomUUID();
    }
  } catch {}
  return "h_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
}

function basicHash(input: PlanInputSnapshot, plan: PlanResult): string {
  const topTitles = Array.isArray(plan?.top5) ? plan.top5.map((x) => x?.title || "").join("|") : "";
  return [
    input.scene,
    input.childType,
    input.ageGroup,
    (input.triggers || []).join(","),
    input.parentStress,
    input.problem,
    topTitles,
  ]
    .join("::")
    .slice(0, 2000);
}

export function usePlanHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = load();
    setEntries(loaded);
    setReady(true);
  }, []);

  const add = useCallback((input: PlanInputSnapshot, plan: PlanResult) => {
    try {
      const nextEntry: HistoryEntry = {
        id: makeId(),
        createdAt: Date.now(),
        input: {
          scene: input.scene,
          childType: input.childType,
          ageGroup: input.ageGroup,
          triggers: Array.isArray(input.triggers) ? input.triggers : [],
          parentStress: input.parentStress || "",
          problem: input.problem || "",
        },
        plan,
      };

      setEntries((prev) => {
        const prevArr = Array.isArray(prev) ? prev : [];
        const last = prevArr[0];
        if (last) {
          const h1 = basicHash(last.input, last.plan);
          const h2 = basicHash(nextEntry.input, nextEntry.plan);
          if (h1 === h2) return prevArr;
        }
        const merged = [nextEntry, ...prevArr].slice(0, MAX_ENTRIES);
        save(merged);
        return merged;
      });
    } catch {
      // ignore
    }
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = (prev || []).filter((x) => x.id !== id);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  }, []);

  const api = useMemo(
    () => ({ entries, ready, add, remove, clear, count: entries.length }),
    [entries, ready, add, remove, clear]
  );
  return api;
}
