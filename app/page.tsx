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
  parentComment?: string;    // 親への本音コメント（お母さん一言）
};

const TRIGGERS = [
  "疲れている",
  "眠そう",
  "空腹・のどが渇いている",
  "予定変更があった",
  "刺激が多かった",
  "分からない",
] as const;

const STRESS_OPTIONS = [
  "余裕がない",
  "周りの目がつらい",
  "正解が分からない",
  "毎回疲れる",
] as const;

export default function Page() {
  const anonUserId = useAnonUserId();

  const [childType, setChildType] = useState("興奮しやすい");
  const [ageGroup, setAgeGroup] = useState<"1" | "2" | "3" | "4">("3");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [parentStress, setParentStress] = useState<string>("");

  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string>("");
  const [result, setResult] = useState<PlanResult | null>(null);

  const canSubmit = useMemo(() => {
    return !loading && childType.trim().length > 0 && problem.trim().length > 0;
  }, [loading, childType, problem]);

  const toggleTrigger = (v: string) => {
    setTriggers((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const submit = async () => {
    setErrMsg("");
    setResult(null);
    setLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          childType,
          problem,
          ageGroup,
          triggers,
          parentStress,
          anonUserId,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || `HTTP_${res.status}`);

      // plan の形が壊れてても UI が落ちないように吸収
      const plan: PlanResult =
        data?.plan && typeof data.plan === "object" ? data.plan : (data && typeof data === "object" ? data : {});
      setResult(plan);
    } catch (e: any) {
      setErrMsg(e?.name === "AbortError" ? "TIMEOUT" : e?.message || "PLAN_FAILED");
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  // ===== 安全化（map前に必ず整形） =====
  const safeTop3: { title: string; reason: string }[] = Array.isArray(result?.top3)
    ? result!.top3!
        .map((t) => ({
          title: (t?.title ?? "").toString(),
          reason: (t?.reason ?? "").toString(),
        }))
        .filter((t) => t.title.trim().length > 0)
        .slice(0, 3)
    : [];

  const safeOrder: string[] = Array.isArray(result?.order)
    ? result!.order!
        .map((x) => (x ?? "").toString())
        .filter((s) => s.trim().length > 0)
        .slice(0, 3)
    : [];

  const safeNgActions: string[] = Array.isArray(result?.ngActions)
    ? result!.ngActions!
        .map((x) => (x ?? "").toString())
        .filter((s) => s.trim().length > 0)
        .slice(0, 6)
    : [];

  const summary = (result?.summary ?? "").toString();
  const duration = (result?.duration ?? "").toString();
  const nextStep = (result?.nextStep ?? "").toString();
  const parentComment = (result?.parentComment ?? "").toString();

  return (
    <main className="page">
      <div className="wrap">
        <header className="header">
          <h1 className="title">うちの子ナビ</h1>
          <p className="sub">今日も、おつかれさまです。いまの状況を少しだけ教えてください。</p>
        </header>

        {/* 入力カード */}
        <section className="card">
          <div className="field">
            <label className="label">子どものタイプ</label>
            <select className="control" value={childType} onChange={(e) => setChildType(e.target.value)}>
              <option>興奮しやすい</option>
              <option>不安になりやすい</option>
              <option>甘えが強い</option>
            </select>
          </div>

          <div className="field">
            <label className="label">年齢（ざっくり）</label>
            <select className="control" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as any)}>
              <option value="1">1歳前後</option>
              <option value="2">2歳前後</option>
              <option value="3">3歳前後</option>
              <option value="4">4歳前後</option>
            </select>
          </div>

          <div className="field">
            <div className="labelRow">
              <span className="label">直前の状態（複数可）</span>
              <span className="hint">当てはまるものだけ</span>
            </div>
            <div className="chips">
              {TRIGGERS.map((v) => {
                const active = triggers.includes(v);
                return (
                  <label key={v} className={`chip ${active ? "chipOn" : ""}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTrigger(v)}
                      className="chk"
                    />
                    <span>{v}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label className="label">正直、いま一番つらいのは？</label>
            <select className="control" value={parentStress} onChange={(e) => setParentStress(e.target.value)}>
              <option value="">選択してください</option>
              {STRESS_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">今の状況（2行でOK）</label>
            <textarea
              className="control"
              rows={4}
              placeholder="（例）寝る前に急に走り回ってしまう…"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          </div>

          <button className="btn" onClick={submit} disabled={!canSubmit}>
            {loading ? "考え中…" : "プランを作る"}
          </button>

          {errMsg && <p className="error">エラー: {errMsg}</p>}
        </section>

        {/* 結果カード */}
        {result && (
          <section className="card result">
            <h2 className="h2">この子の特徴</h2>
            <p className="p">{summary || "（特徴の生成に失敗しました）"}</p>

            <h2 className="h2">最適な対処 TOP3</h2>
            <ol className="ol">
              {safeTop3.length > 0 ? (
                safeTop3.map((t, i) => (
                  <li key={i} className="li">
                    <div className="liTitle">{t.title}</div>
                    {t.reason && <div className="liReason">{t.reason}</div>}
                  </li>
                ))
              ) : (
                <li className="li">（TOP3の生成に失敗しました）</li>
              )}
            </ol>

            <div className="grid2">
              <div className="kv">
                <div className="k">試す順番</div>
                <div className="v">{safeOrder.length ? safeOrder.join(" → ") : "（未生成）"}</div>
              </div>
              <div className="kv">
                <div className="k">試す期間</div>
                <div className="v">{duration || "（未生成）"}</div>
              </div>
            </div>

            <div className="kv">
              <div className="k">次の一手</div>
              <div className="v">{nextStep || "（未生成）"}</div>
            </div>

            <h2 className="h2">やってはいけない行動</h2>
            <ul className="ul">
              {safeNgActions.length > 0 ? (
                safeNgActions.map((x, i) => <li key={i}>{x}</li>)
              ) : (
                <li>（未生成）</li>
              )}
            </ul>

            <div className="mom">
              <div className="momLabel">お母さん一言</div>
              <div className="momText">{parentComment || "（未生成）"}</div>
            </div>
          </section>
        )}

        <footer className="footer">
          <span className="id">ID: {anonUserId ? anonUserId.slice(0, 8) : "loading..."}</span>
        </footer>
      </div>

      <style jsx global>{`
        :root { --bg:#F7F8F9; --text:#2F2F2F; --muted:#6B7280; --cta:#4DB6AC; --main:#86C5C0; --border:#E5E7EB; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif; background: var(--bg); color: var(--text); }
        .page { min-height: 100vh; padding: 24px 16px; }
        .wrap { max-width: 720px; margin: 0 auto; }
        .header { margin-bottom: 16px; }
        .title { margin: 0; font-size: 32px; letter-spacing: .02em; }
        .sub { margin: 8px 0 0; color: var(--muted); font-size: 14px; }
        .card { background:#fff; border:1px solid var(--border); border-radius: 16px; padding: 18px; box-shadow: 0 2px 10px rgba(0,0,0,.04); }
        .card + .card { margin-top: 16px; }
        .field { margin-bottom: 14px; }
        .labelRow { display:flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        .label { display:block; font-weight: 700; font-size: 14px; margin-bottom: 8px; }
        .hint { font-size: 12px; color: var(--muted); }
        .control { width: 100%; border:1px solid #D1D5DB; border-radius: 12px; padding: 12px 12px; font-size: 16px; background:#fff; outline: none; }
        .control:focus { border-color: var(--main); box-shadow: 0 0 0 3px rgba(134,197,192,.25); }
        .chips { display:flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
        .chip { display:inline-flex; align-items:center; gap:8px; padding: 10px 12px; border-radius: 999px; border:1px solid #D1D5DB; background:#fff; cursor:pointer; user-select:none; font-size: 14px; }
        .chipOn { border-color: var(--cta); background: rgba(77,182,172,.10); color: #0F766E; }
        .chk { width: 16px; height: 16px; accent-color: var(--cta); }
        .btn { width: 100%; border:0; border-radius: 14px; padding: 14px 16px; background: var(--cta); color:#fff; font-weight: 800; font-size: 16px; cursor: pointer; }
        .btn:disabled { opacity: .55; cursor: not-allowed; }
        .error { margin: 12px 0 0; color: #DC2626; font-size: 13px; }
        .result .h2 { margin: 0 0 8px; font-size: 15px; font-weight: 900; }
        .result .p { margin: 0 0 14px; color: #111827; line-height: 1.65; }
        .ol { margin: 0 0 14px; padding-left: 20px; }
        .li { margin-bottom: 10px; }
        .liTitle { font-weight: 800; }
        .liReason { color: var(--muted); margin-top: 4px; line-height: 1.55; }
        .grid2 { display:grid; grid-template-columns: 1fr; gap: 10px; margin: 10px 0 12px; }
        @media (min-width: 640px) { .grid2 { grid-template-columns: 1fr 1fr; } }
        .kv { padding: 12px; border:1px solid var(--border); border-radius: 12px; background: #fff; }
        .k { font-size: 12px; color: var(--muted); font-weight: 700; }
        .v { margin-top: 6px; font-weight: 700; line-height: 1.6; }
        .ul { margin: 0 0 14px; padding-left: 20px; }
        .ul li { margin-bottom: 6px; }
        .mom { border:1px solid rgba(77,182,172,.35); background: rgba(77,182,172,.08); border-radius: 12px; padding: 12px; }
        .momLabel { font-weight: 900; font-size: 13px; margin-bottom: 6px; }
        .momText { line-height: 1.65; }
        .footer { margin-top: 16px; text-align:center; color: #9CA3AF; font-size: 11px; }
        .id { display:inline-block; }
      `}</style>
    </main>
  );
}
