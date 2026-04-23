"use client";

import { useMemo, useState } from "react";
import { useAnonUserId } from "../hooks/useAnonUserId";

type PlanItem = { title?: string; reason?: string };

type PlanResult = {
  childType?: string;
  summary?: string;          // この子の特徴
  top3?: PlanItem[];         // 最適な対処TOP3
  order?: string[];          // やる順番
  duration?: string;         // 試す期間
  nextStep?: string;         // 次の一手
  ngActions?: string[];      // NG行動
  parentComment?: string;    // 親への本音コメント
};

export default function Home() {
  const anonUserId = useAnonUserId();

  const [childType, setChildType] = useState("興奮しやすい");
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");
  const [result, setResult] = useState<PlanResult | null>(null);

  const canSubmit = useMemo(() => {
    return (
      !loading &&
      childType.trim().length > 0 &&
      problem.trim().length > 0
    );
  }, [loading, childType, problem]);

  const submit = async () => {
    setErrMsg("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childType, problem, anonUserId }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `HTTP_${res.status}`);

      // ✅ 絶対に object に吸収（壊れてても UI が落ちない）
      const plan: PlanResult =
        data?.plan && typeof data.plan === "object" ? data.plan : {};
      setResult(plan);
    } catch (e: any) {
      setErrMsg(e?.message || "PLAN_FAILED");
    } finally {
      setLoading(false);
    }
  };

  // ✅ map 前の完全ガード（クラッシュ防止の本体）
  const safeTop3: { title: string; reason: string }[] =
    Array.isArray(result?.top3)
      ? result!.top3!
          .map((t) => ({
            title: (t?.title ?? "").toString(),
            reason: (t?.reason ?? "").toString(),
          }))
          .filter((t) => t.title.trim().length > 0)
          .slice(0, 3)
      : [];

  const safeOrder: string[] =
    Array.isArray(result?.order)
      ? result!.order!
          .map((x) => (x ?? "").toString())
          .filter((s) => s.trim().length > 0)
          .slice(0, 3)
      : [];

  const safeNgActions: string[] =
    Array.isArray(result?.ngActions)
      ? result!.ngActions!
          .map((x) => (x ?? "").toString())
          .filter((s) => s.trim().length > 0)
      : [];

  return (
    <main className="min-h-screen bg-[#F7F8F9] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-[#2F2F2F]">
          うちの子ナビ <span className="text-sm text-[#6B7280]">（開発中）</span>
        </h1>

        {/* --- 入力 --- */}
        <select
          className="mt-4 w-full border rounded-xl px-4 py-3 text-[#2F2F2F]"
          value={childType}
          onChange={(e) => setChildType(e.target.value)}
        >
          <option>興奮しやすい</option>
          <option>不安が強い</option>
          <option>甘えが強い</option>
        </select>

        <textarea
          className="mt-3 w-full border rounded-xl px-4 py-3 text-[#2F2F2F]"
          placeholder="困っていること（2行でOK）"
          rows={4}
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
        />

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-xl bg-[#4DB6AC] text-white py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "考え中…" : "プランを作る"}
        </button>

        {errMsg && (
          <div className="mt-3 text-sm text-red-600">
            エラー: {errMsg}
          </div>
        )}

        {/* --- 結果表示 --- */}
        {result && (
          <div className="mt-6 text-sm text-[#2F2F2F] space-y-4">
            <div>
              <p className="font-semibold">この子の特徴</p>
              <p className="mt-1">{(result.summary ?? "").toString()}</p>
            </div>

            <div>
              <p className="font-semibold">最適な対処 TOP3</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                {safeTop3.map((t, i) => (
                  <li key={i}>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-[#7A7A7A]">{t.reason}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-semibold">やる順番</p>
              <p className="mt-1">{safeOrder.join(" → ")}</p>
            </div>

            <div>
              <p className="font-semibold">試す期間</p>
              <p className="mt-1">{(result.duration ?? "").toString()}</p>
            </div>

            <div>
              <p className="font-semibold">うまくいかない場合の次の一手</p>
              <p className="mt-1">{(result.nextStep ?? "").toString()}</p>
            </div>

            <div>
              <p className="font-semibold">NG行動</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                {safeNgActions.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4">
              <p className="font-semibold">お母さん・お父さんへの一言</p>
              <p className="mt-1">{(result.parentComment ?? "").toString()}</p>
            </div>
          </div>
        )}

        {/* --- 注意書き / 開発中 --- */}
        <div className="mt-8 rounded-lg border bg-[#F9FAFB] p-4 text-xs text-[#6B7280] space-y-2">
          <p className="font-semibold text-[#374151]">ご利用にあたって</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              本サービスは医療・心理・育児指導の代替ではありません。
            </li>
            <li>
              一般的な傾向をもとに「試す順番」を整理する開発中のツールです。
            </li>
            <li>
              状況に不安がある場合は、専門家への相談をおすすめします。
            </li>
            <li>
              開発中のため、出力内容は予告なく変更されることがあります。
            </li>
          </ul>
        </div>

        <div className="mt-6 text-[11px] text-[#7A7A7A] text-center">
          © Neutral Works / うちの子ナビ<br />
          anonUserId: {anonUserId ? anonUserId.slice(0, 8) : "loading..."}
        </div>
      </div>
    </main>
  );
}
``