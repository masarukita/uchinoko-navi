"use client";

import { useMemo, useState } from "react";
import { useAnonUserId } from "../hooks/useAnonUserId";
import { usePlanHistory } from "../hooks/usePlanHistory";

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

type Tab = "form" | "history";

const SCENES: { value: Scene; label: string; desc: string }[] = [
  { value: "now", label: "今すごく困ってる", desc: "今夜・今この場でできること" },
  { value: "daily", label: "普段から困ってる", desc: "明日から整えること" },
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

function formatTime(ts: number) {
  try {
    const d = new Date(ts);
    return d.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function clip(s: string, n = 44) {
  const t = (s || "").trim();
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function BottomTabButton({
  active,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 py-3 rounded-2xl border text-sm font-bold",
        active ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-700 border-gray-200",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {typeof badge === "number" && badge > 0 && (
          <span className={["text-xs rounded-full px-2 py-0.5", active ? "bg-white/20" : "bg-gray-100"].join(" ")}>{badge}</span>
        )}
      </span>
    </button>
  );
}

export default function Page() {
  const anonUserId = useAnonUserId();
  const history = usePlanHistory();

  const [tab, setTab] = useState<Tab>("form");

  const [scene, setScene] = useState<Scene>("now");
  const [childType, setChildType] = useState<string>(CHILD_TYPES[0]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("3");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [parentStress, setParentStress] = useState<string>("");
  const [problem, setProblem] = useState<string>("");

  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const canSubmit = useMemo(() => !loading && problem.trim().length > 0, [loading, problem]);

  const toggle = (v: string) => {
    setTriggers((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  };

  const submit = async () => {
    setErr("");
    setSavedMsg("");
    setResult(null);
    setLoading(true);

    const inputSnapshot = {
      scene,
      childType,
      ageGroup,
      triggers,
      parentStress,
      problem,
    } as const;

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
      history.add(inputSnapshot, plan);
      setSavedMsg("履歴に保存しました");
      setTimeout(() => setSavedMsg(""), 1800);
    } catch {
      setErr("うまく生成できませんでした");
    } finally {
      setLoading(false);
    }
  };

  const top5 = Array.isArray(result?.top5) ? result!.top5!.slice(0, 5) : [];
  const ngActions = Array.isArray(result?.ngActions) ? result!.ngActions! : [];

  const summaryTitle = scene === "now" ? "お子さまの今の状態" : "お子さまの特徴";

  const sceneHelp = useMemo(() => {
    const found = SCENES.find((s) => s.value === scene);
    return found ? found.desc : "";
  }, [scene]);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-28">
      <h1 className="text-2xl font-bold mb-2">うちの子ナビ</h1>
      <div className="text-sm text-gray-600 mb-6">登録なし／履歴はこの端末に保存されます</div>

      {tab === "history" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">履歴</h2>
            <button
              type="button"
              onClick={() => history.clear()}
              className="text-sm text-red-600 border border-red-200 rounded-lg px-3 py-1"
              disabled={!history.ready || history.entries.length === 0}
              title="履歴をすべて削除"
            >
              全削除
            </button>
          </div>

          {!history.ready && <div className="text-gray-500">読み込み中…</div>}

          {history.ready && history.entries.length === 0 && (
            <div className="text-gray-500">まだ履歴がありません。相談すると自動で残ります。</div>
          )}

          {history.ready && history.entries.length > 0 && (
            <div className="space-y-3">
              {history.entries.map((h) => {
                const sceneLabel = h.input.scene === "now" ? "今" : "普段";
                const title = Array.isArray(h.plan?.top5) && h.plan.top5[0]?.title ? h.plan.top5[0].title : "（プラン）";
                return (
                  <div key={h.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs rounded-full border px-2 py-0.5">{sceneLabel}</span>
                          <span className="text-xs text-gray-500">{formatTime(h.createdAt)}</span>
                        </div>
                        <div className="font-bold truncate">{title}</div>
                        <div className="text-sm text-gray-600 mt-1">{clip(h.input.problem)}</div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          onClick={() => {
                            setScene(h.input.scene);
                            setChildType(h.input.childType);
                            setAgeGroup(h.input.ageGroup);
                            setTriggers(h.input.triggers);
                            setParentStress(h.input.parentStress);
                            setProblem(h.input.problem);
                            setResult(h.plan);
                            setTab("form");
                          }}
                        >
                          表示
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500"
                          onClick={() => history.remove(h.id)}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="mb-2 text-sm text-gray-600">{sceneHelp}</div>

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

          {savedMsg && <div className="mt-3 text-teal-700 text-sm font-bold">{savedMsg}</div>}
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
                <span className="font-bold">やってみる目安：</span> {result.duration}
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
        </>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex gap-2">
            <BottomTabButton active={tab === "form"} label="相談" onClick={() => setTab("form")} />
            <BottomTabButton active={tab === "history"} label="履歴" badge={history.count} onClick={() => setTab("history")} />
          </div>
        </div>
      </div>
    </main>
  );
}
