"use client";
import { useState } from "react";

export default function Page() {
  const [childType, setChildType] = useState("興奮しやすい");
  const [problem, setProblem] = useState("");
  const [ageGroup, setAgeGroup] = useState<"2"|"3"|"4">("3");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [parentStress, setParentStress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  const toggleTrigger = (v: string) => {
    setTriggers(p => p.includes(v) ? p.filter(x=>x!==v) : [...p, v]);
  };

  const submit = async () => {
    setErr(""); setResult(null); setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort(), 10000);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          childType, problem, ageGroup, triggers, parentStress
        })
      });
      const data = await res.json();
      if (!data?.plan) throw new Error("PLAN_FAILED");
      setResult(data.plan);
    } catch (e:any) {
      setErr(e?.name==="AbortError" ? "TIMEOUT" : "PLAN_FAILED");
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>うちの子ナビ</h1>

      <label>子どものタイプ</label>
      <select value={childType} onChange={e=>setChildType(e.target.value)}>
        <option>興奮しやすい</option>
        <option>不安になりやすい</option>
        <option>甘えが強い</option>
      </select>

      <label>年齢（ざっくり）</label>
      <select value={ageGroup} onChange={e=>setAgeGroup(e.target.value as any)}>
        <option value="2">2歳前後</option>
        <option value="3">3歳前後</option>
        <option value="4">4歳前後</option>
      </select>

      <label>直前の状態（複数可）</label>
      {[
        "疲れている／眠そう",
        "空腹・のどが渇いている",
        "予定変更があった",
        "刺激が多かった",
        "分からない"
      ].map(v=>(
        <label key={v}>
          <input type="checkbox"
            checked={triggers.includes(v)}
            onChange={()=>toggleTrigger(v)}
          /> {v}
        </label>
      ))}

      <label>正直、いま一番つらいのは？</label>
      <select value={parentStress} onChange={e=>setParentStress(e.target.value)}>
        <option value="">選択してください</option>
        <option value="余裕がない">もう余裕がない</option>
        <option value="周りの目">周りの目がつらい</option>
        <option value="正解が分からない">正解が分からない</option>
        <option value="毎回疲れる">毎回同じで疲れる</option>
      </select>

      <textarea
        placeholder="今の状況を少し書いてください"
        value={problem}
        onChange={e=>setProblem(e.target.value)}
      />

      <button onClick={submit} disabled={loading}>
        {loading ? "考え中…" : "プランを作る"}
      </button>

      {err && <p style={{color:"red"}}>{err}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
``