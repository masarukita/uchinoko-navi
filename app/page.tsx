"use client";

import { useState } from "react";

export default function Page() {
  const [childType, setChildType] = useState("興奮しやすい");
  const [ageGroup, setAgeGroup] = useState("3");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [parentStress, setParentStress] = useState("");
  const [problem, setProblem] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  const toggleTrigger = (v: string) => {
    setTriggers((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const submit = async () => {
    setErr("");
    setResult(null);
    setLoading(true);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          childType,
          ageGroup,
          triggers,
          parentStress,
          problem,
        }),
      });

      const data = await res.json();
      if (!data?.plan) throw new Error("PLAN_FAILED");
      setResult(data.plan);
    } catch (e: any) {
      setErr(e?.name === "AbortError" ? "TIMEOUT" : "PLAN_FAILED");
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 24 }}>
        うちの子ナビ
      </h1>

      {/* 子どものタイプ */}
      <section style={{ marginBottom: 24 }}>
        <label>子どものタイプ</label>
        <select
          value={childType}
          onChange={(e) => setChildType(e.target.value)}
          style={{ display: "block", marginTop: 8 }}
        >
          <option>興奮しやすい</option>
          <option>不安になりやすい</option>
          <option>甘えが強い</option>
        </select>
      </section>

      {/* 年齢 */}
      <section style={{ marginBottom: 24 }}>
        <label>年齢（ざっくり）</label>
        <select
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
          style={{ display: "block", marginTop: 8 }}
        >
          <option value="1">1歳前後</option>
          <option value="2">2歳前後</option>
          <option value="3">3歳前後</option>
          <option value="4">4歳前後</option>
        </select>
      </section>

      {/* 直前の状態 */}
      <section style={{ marginBottom: 24 }}>
        <p>直前の状態（複数可）</p>
        {[
          "疲れている",
          "眠そう",
          "空腹・のどが渇いている",
          "予定変更があった",
          "刺激が多かった",
          "分からない",
        ].map((v) => (
          <label key={v} style={{ display: "block", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={triggers.includes(v)}
              onChange={() => toggleTrigger(v)}
            />{" "}
            {v}
          </label>
        ))}
      </section>

      {/* 親のつらさ */}
      <section style={{ marginBottom: 24 }}>
        <label>正直、いま一番つらいのは？</label>
        <select
          value={parentStress}
          onChange={(e) => setParentStress(e.target.value)}
          style={{ display: "block", marginTop: 8 }}
        >
          <option value="">選択してください</option>
          <option>余裕がない</option>
          <option>周りの目がつらい</option>
          <option>正解が分からない</option>
          <option>毎回疲れてしまう</option>
        </select>
      </section>

      {/* 自由入力 */}
      <section style={{ marginBottom: 24 }}>
        <textarea
          placeholder="今の状況を少し書いてください（2行でOK）"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          style={{ width: "100%", minHeight: 80 }}
        />
      </section>

      <button
        onClick={submit}
        disabled={loading}
        style={{
          padding: "12px 20px",
          background: "#4DB6AC",
          color: "#fff",
          border: "none",
          borderRadius: 6,
        }}
      >
        {loading ? "考え中…" : "プランを作る"}
      </button>

      {err && <p style={{ color: "red", marginTop: 12 }}>{err}</p>}

      {result && (
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            background: "#F7F8F9",
            whiteSpace: "pre-wrap",
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
``