// hooks/useAnonUserId.ts
"use client";

import { useEffect, useState } from "react";

function genId() {
  // crypto.randomUUID が使える環境はそれを使う
  // 使えない場合はフォールバック
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID() as string;
  }
  return (
    "anon_" +
    Math.random().toString(36).slice(2) +
    "_" +
    Date.now().toString(36)
  );
}

export function useAnonUserId() {
  const [anonUserId, setAnonUserId] = useState("");

  useEffect(() => {
    try {
      const key = "uchinoko_anon_user_id";
      const existing = localStorage.getItem(key);
      if (existing) {
        setAnonUserId(existing);
        return;
      }
      const id = genId();
      localStorage.setItem(key, id);
      setAnonUserId(id);
    } catch {
      // localStorageが使えない環境でも止めない
      setAnonUserId(genId());
    }
  }, []);

  return anonUserId;
}
``