"use client";

import { useMemo, useState } from "react";
import { useAnonUserId } from "../hooks/useAnonUserId";

type PlanItem = { title?: string; reason?: string };
type PlanResult = {
  summary?: string;
  top3?: PlanItem[];
  duration?: string;
  nextStep?: string;
  ngActions?: string[];
  parentComment?: string;
};

const TRIGGERS = [
  "疲れている",
  "眠そう",
  "空腹・のどが渇いている",
  "予定変更があった",
  "刺激が多かった",
  "分からない",
] as const;

const STRESS = [
  "余裕がない",
  "周りの目がつらい",
  "正解が分からない",
  "毎回疲れる",
] as const;

export default function Page() {
  const anonUserId = useAnonUserId();

  const [childType, setChildType] = useState("興奮しやすい");
  const [ageGroup, setAgeGroup] = useState<"1" | "2" | "3" | "4">("3");
  const [scene, setScene] = useState<"now" | "daily">("now");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [parentStress, setParentStress] = useState("");
  const [problem, setProblem] = useState("");

  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(
    () => !loading && problem.trim().length > 0,
    [loading, problem]
  );

  const toggle = (v: string) => {
    setTriggers((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  };

  const submit = async () => {
    setErr("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childType,
          ageGroup,
          scene,
          triggers,
          parentStress,
          problem,
          anonUserId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const plan =
        data?.plan && typeof data.plan === "object"
          ? data.plan
          : typeof data === "object"
          ? data
          : {};

      setResult(plan);
    } catch {
      setErr("うまく生成できませんでした");
    } finally {
      setLoading(false);
    }
  };

  const top3 = Array.isArray(result?.top3)
    ? result!.top3!.slice(0, 3)
    : [];
  const ngActions = Array.isArray(result?.ngActions)
    ? result!.ngActions!
    : [];

  return (
    <main className="page">
      <div className="wrap">

        <section className="card">
          <h1>うちの子ナビ</h1>

          <label>今の悩みは？</label>
          <select value={scene} onChange={(e) => setScene(e.target.value as any)}>
            <option value="now">今すごく困っている</option>
            <option value="daily">普段からの悩み</option>
          </select>

          <label>子どものタイプ</label>
          <select value={childType} onChange={(e) => setChildType(e.target.value)}>
            <option>興奮しやすい</option>
            <option>不安になりやすい</option>
            <option>甘えが強い</option>
          </select>

          <label>年齢（ざっくり）</label>
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as any)}>
            <option value="1">1歳前後</option>
            <option value="2">2歳前後</option>
            <option value="3">3歳前後</option>
            <option value="4">4歳前後</option>
          </select>

          <label>直前の状態（複数可）</label>
          <div className="chips">
            {TRIGGERS.map((v) => (
              <label key={v} className={triggers.includes(v) ? "on" : ""}>
                <input type="checkbox" checked={triggers.includes(v)} onChange={() => toggle(v)} />
                {v}
              </label>
            ))}
          </div>

          <label>正直、いま一番つらいのは？</label>
          <select value={parentStress} onChange={(e) => setParentStress(e.target.value)}>
            <option value="">選択してください</option>
            {STRESS.map((v) => <option key={v}>{v}</option>)}
          </select>

          <label>今の状況（2行でOK）</label>
          <textarea rows={4} value={problem} onChange={(e) => setProblem(e.target.value)} />

          <button onClick={submit} disabled={!canSubmit}>
            {loading ? "考え中…" : "プランを作る"}
          </button>

          {err && <p className="error">{err}</p>}
        </section>

        {result && (
          <section className="card">
            <h2>{scene === "now" ? "お子さまの今の状態" : "お子さまの特徴"}</h2>
            <p>{result.summary}</p>

            <h2>これやってみて！TOP3</h2>
            <ol>
              {top3.map((t, i) => (
                <li key={i}>
                  <strong>{t.title}</strong>
                  <div>{t.reason}</div>
                </li>
              ))}
            </ol>

            <p>
              <strong>
                {scene === "now" ? "やってみる時間" : "やってみる期間"}：
              </strong>{" "}
              {result.duration}
            </p>

            <h3>これからこうしてみて</h3>
            <p>{result.nextStep}</p>

            <h3>これはやめてあげてほしい</h3>
            <ul>{ngActions.map((n, i) => <li key={i}>{n}</li>)}</ul>

            <div className="mom">
              <strong>お母さん・お父さんへの一言</strong>
              <p>{result.parentComment}</p>
            </div>
          </section>
        )}
      </div>

      <style jsx global>{`
        body { margin:0; background:#F7F8F9; font-family: system-ui, sans-serif; }
        .wrap { max-width:720px; margin:auto; padding:16px; }
        .card { background:#fff; border-radius:16px; padding:16px; margin-bottom:16px; }
        label { display:block; font-weight:600; margin-top:12px; }
        select, textarea { width:100%; padding:10px; border-radius:10px; border:1px solid #ddd; }
        .chips label { display:inline-block; margin:4px; padding:8px 12px; border-radius:999px; border:1px solid #ccc; }
        .chips .on { background:#E8F7F5; border-color:#4DB6AC; }
        button { width:100%; margin-top:16px; padding:14px; border:none; border-radius:12px; background:#4DB6AC; color:#fff; font-size:16px; }
        .mom { background:#E8F7F5; padding:12px; border-radius:12px; margin-top:12px; }
      `}</style>
    </main>
  );
}
``