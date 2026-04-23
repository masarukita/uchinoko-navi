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
          triggers,
          parentStress,
          problem,
        }),
      });
      const data = await res.json();
      if (!data?.plan) throw new Error("PLAN_FAILED");
      setResult(data.plan);
    } catch {
      setErr("プラン生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 24 }}>うちの子ナビ</h1>

      <section style={{ marginBottom: 24 }}>
        <label>子どものタイプ</label><br />
        <select value={childType} onChange={(e) => setChildType(e.target.value)}>
          <option>興奮しやすい</option>
          <option>不安になりやすい</option>
          <option>甘えが強い</option>
        </select>
      </section>

      <section style={{ marginBottom: 24 }}>
        <label>年齢（ざっくり）</label><br />
        <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
          <option value="1">1歳前後</option>
          <option value="2">2歳前後</option>
          <option value="3">3歳前後</option>
          <option value="4">4歳前後</option>
        </select>
      </section>

      <section style={{ marginBottom: 24 }}>
        <label>直前の状態（複数可）</label>
        {["疲れている","眠そう","空腹・のどが渇いている","予定変更があった","刺激が多かった","分からない"].map(v => (
          <div key={v}>
            <label>
              <input type="checkbox" checked={triggers.includes(v)} onChange={() => toggleTrigger(v)} />
              {v}
            </label>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 24 }}>
        <label>正直、いま一番つらいのは？</label><br />
        <select value={parentStress} onChange={(e) => setParentStress(e.target.value)}>
          <option value="">選択してください</option>
          <option>余裕がない</option>
          <option>周りの目がつらい</option>
          <option>正解が分からない</option>
          <option>毎回疲れる</option>
        </select>
      </section>

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

      {err && <p style={{ color: "red" }}>{err}</p>}

      {result && (
        <section style={{ marginTop: 32, background: "#F7F8F9", padding: 16, borderRadius: 8 }}>
          <h2>この子の特徴</h2>
          <p>{result.summary}</p>

          <h3>最適な対処 TOP3</h3>
          <ol>
            {result.top3.map((t: any, i: number) => (
              <li key={i}>
                <strong>{t.title}</strong><br />{t.reason}
              </li>
            ))}
          </ol>

          <p><strong>試す順番：</strong>{result.order.join(" → ")}</p>
          <p><strong>試す期間：</strong>{result.duration}</p>
          <p><strong>次の一手：</strong>{result.nextStep}</p>

          <h4>やってはいけない行動</h4>
          <ul>{result.ngActions.map((n: string) => <li key={n}>{n}</li>)}</ul>

          <p><strong>ひとこと</strong><br />{result.parentComment}</p>
        </section>
      )}
    </main>
  );
}
``