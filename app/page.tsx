"use client";

import { useMemo, useState } from "react";
import { useAnonUserId } from "../hooks/useAnonUserId";

type Scene = "now" | "daily";
type AgeGroup = "1" | "2" | "3" | "4";

type PlanItem = { title?: string; reason?: string };

type PlanResult = {
  childType?: string;
  summary?: string;
  top5?: PlanItem[];
  order?: string[];
  duration?: string;
  nextStep?: string;
  ngActions?: string[];
  parentComment?: string;
};

const SCENES: { value: Scene; label: string }[] = [
  { value: "now", label: "今すごく困ってる" },
  { value: "daily", label: "今じゃないけど普段から困ってる" },
];

const CHILD_TYPES = [
  "興奮しやすい（テンションが上がりやすい）",
  "不安になりやすい",
  "切り替えが苦手",
  "甘えが強い",
  "こだわりが強い",
  "感覚が敏感（音・光など）",
  "人見知り・場所見知り",
  "活動量が多い（体力がある）",
  "慎重派（臆病気味）",
  "マイペース",
] as const;

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "1", label: "1歳前後" },
  { value: "2", label: "2歳前後" },
  { value: "3", label: "3歳前後" },
  { value: "4", label: "4歳前後" },
];

const TRIGGERS = [
  "疲れている",
  "眠そう",
  "空腹・のどが渇いている",
  "体調がよくない",
  "予定変更があった",
  "刺激が多かった（人混み/音/光）",
  "環境が変わった",
  "思い通りにいかなくてイライラしている",
  "よく分からない",
] as const;

const STRESS = [
  "余裕がない（時間/体力）",
  "周りの目がつらい",
  "正解が分からない",
  "毎回疲れる",
  "イライラしてしまう",
  "焦りが強い",
  "孤独感/ワンオペ感",
] as const;

export default function Page() {
  const anonUserId = useAnonUserId();

  const [scene, setScene] = useState<Scene>("now");
  const [childType, setChildType] = useState<string>(CHILD_TYPES[0]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("3");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [parentStress, setParentStress] = useState<string>("");
  const [problem, setProblem] = useState<string>("");

  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => !loading && problem.trim().length > 0, [loading, problem]);

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
          scene,
          childType,
          ageGroup,
          triggers,
          parentStress,
          problem,
          anonUserId,
        }),
      });

      const data: any = await res.json().catch(() => ({}));
      const plan: any =
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

  const top5 = Array.isArray(result?.top5) ? result!.top5!.slice(0, 5) : [];
  const ngActions = Array.isArray(result?.ngActions) ? result!.ngActions! : [];

  const durationLabel = scene === "now" ? "やってみる時間" : "やってみる期間";
  const summaryTitle = scene === "now" ? "お子さまの今の状態" : "お子さまの特徴";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">うちの子ナビ</h1>

      <div className="mb-5">
        <label className="block font-bold mb-2">今困ってる？普段から困ってる？</label>
        <select
          value={scene}
          onChange={(e) => setScene(e.target.value as Scene)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
        >
          {SCENES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="block font-bold mb-2">子どものタイプ</label>
        <select
          value={childType}
          onChange={(e) => setChildType(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
        >
          {CHILD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="block font-bold mb-2">年齢</label>
        <select
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
        >
          {AGE_GROUPS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="block font-bold mb-2">お子様の直前の状態（複数可）</label>
        <div className="flex flex-wrap gap-2">
          {TRIGGERS.map((v) => {
            const active = triggers.includes(v);
            const cls = [
              "rounded-full border px-3 py-2 text-sm",
              active ? "border-teal-600 bg-teal-50 font-bold" : "border-gray-300 bg-white",
            ].join(" ");
            return (
              <button key={v} type="button" onClick={() => toggle(v)} className={cls}>
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className="block font-bold mb-2">今のあなたの状態（気持ち）は？</label>
        <select
          value={parentStress}
          onChange={(e) => setParentStress(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
        >
          <option value="">選択してください</option>
          {STRESS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block font-bold mb-2">今の状況（2〜3行でOK）</label>
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-300 px-4 py-3"
          placeholder="例）眠そうなのに寝ない、抱っこをやめると暴れる…など"
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={submit}
        className={[
          "w-full rounded-2xl py-4 text-white font-bold",
          canSubmit ? "bg-teal-600 hover:bg-teal-700" : "bg-gray-300 cursor-not-allowed",
        ].join(" ")}
      >
        {loading ? "考え中…" : "プランを作る"}
      </button>

      {err && <div className="mt-4 text-red-600 font-bold">{err}</div>}

      {result && (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h2 className="text-lg font-bold mb-2">{summaryTitle}</h2>
          <p className="mb-4">{result.summary}</p>

          <h3 className="font-bold mb-2">これやってみて！TOP5</h3>
          <ol style={{ listStyleType: "decimal", paddingLeft: "1.25rem" }} className="space-y-3">
            {top5.map((t, i) => (
              <li key={i}>
                <div className="font-bold">{t.title}</div>
                {t.reason && <div className="text-sm text-gray-600">{t.reason}</div>}
              </li>
            ))}
          </ol>

          <div className="mt-4">
            <span className="font-bold">{durationLabel}：</span> {result.duration}
          </div>

          <div className="mt-4">
            <div className="font-bold mb-1">これからこうしてみて</div>
            <div>{result.nextStep}</div>
          </div>

          <div className="mt-4">
            <div className="font-bold mb-1">これはやめてあげてほしい</div>
            <ul className="list-disc pl-6 space-y-1">
              {ngActions.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <div className="font-bold mb-1">お母さん・お父さんへの一言</div>
            <div>{result.parentComment}</div>
          </div>
        </section>
      )}
    </main>
  );
}
