import OpenAI from "openai";

export const AI_TS_VERSION = "2026-04-24_ai_top5_reason_guardrails_v1";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export type Scene = "now" | "daily";
export type AgeGroup = "1" | "2" | "3" | "4";

export type PlanItem = {
  title: string;
  reason: string;
};

export type PlanResult = {
  childType: string;
  summary: string;
  top5: PlanItem[];
  order: string[];
  duration: string;
  nextStep: string;
  ngActions: string[];
  parentComment: string;
};

export type GenerateInput = {
  childType: string;
  problem: string;
  ageGroup: string;
  triggers: string[];
  parentStress: string;
  scene: Scene;
  anonUserId?: string;
};

// --- ガードレール（「今困ってる」なのに習慣/長期が混ざるのを弾く / 「普段」なのに即効テクが混ざるのを弾く） ---
const NOW_BANNED = [
  /ルーティン/i,
  /習慣/i,
  /毎日/i,
  /明日から/i,
  /継続/i,
  /心がけ/i,
  /意識/i,
  /週/i,
  /\d+\s*日/,
  /1週間/,
  /2週間/,
  /長期/i,
];

const DAILY_BANNED = [
  /今すぐ/i,
  /\d+\s*分/,
  /3分/,
  /5分/,
  /10分/,
  /15分/,
  /すぐに/i,
  /今夜/i,
  /この瞬間/i,
];

function asScene(v: any): Scene {
  return v === "daily" ? "daily" : "now";
}

function asAgeGroup(v: any): AgeGroup {
  const s = String(v ?? "3");
  if (s === "1" || s === "2" || s === "3" || s === "4") return s;
  return "3";
}

function safeText(v: any, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function safeArrayOfStrings(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean);
}

function extractJson(text: string): string | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

function violates(scene: Scene, item: PlanItem): boolean {
  const t = `${item.title} ${item.reason}`;
  const banned = scene === "now" ? NOW_BANNED : DAILY_BANNED;
  return banned.some((re) => re.test(t));
}

function defaultSummary(scene: Scene): string {
  return scene === "now"
    ? "刺激や切り替えに反応しやすい状態です。まずは“今この場”で落ち着ける条件を作るのが近道です。"
    : "同じパターンが繰り返されやすい状態です。明日から整えられる『土台』を作るとラクになります。";
}

function defaultTop5(scene: Scene): PlanItem[] {
  if (scene === "now") {
    return [
      {
        title: "刺激を減らす（光・音・声）",
        reason: "『刺激が多かった／眠そう／空腹』などの条件だと興奮が上がりやすいので、まず入力を減らすのが成功率高めです。",
      },
      {
        title: "声かけを5語以内にする",
        reason: "興奮しやすい/切り替え苦手の傾向があると、長い説明で逆に荒れやすいので情報量を絞るのが効きやすいです。",
      },
      {
        title: "3分で区切って一度終える",
        reason: "『今すごく困ってる』状況では長期戦が逆効果になりやすいので、短い成功体験で落ち着きを作るのが有効です。",
      },
      {
        title: "水分・トイレだけ先に済ませる",
        reason: "『空腹・のどが渇いている』があると不快で寝付きにくいので、最小の不快要因を先に消すのが近道です。",
      },
      {
        title: "場所を変えてクールダウンする",
        reason: "『刺激が多かった/予定変更』の後は切り替えが難しいことが多いので、環境を変えてリセットするのが効きやすいです。",
      },
    ];
  }

  // daily
  return [
    {
      title: "寝る前の流れを3ステップで固定する",
      reason: "『興奮しやすい/不安になりやすい』タイプは見通しがあると落ち着きやすいので、毎晩同じ順番が効きやすいです。",
    },
    {
      title: "寝室の刺激（光・音・おもちゃ）を減らす",
      reason: "『刺激が多かった』が絡むと寝付きが崩れやすいので、環境側を整えると成功確率が上がりやすいです。",
    },
    {
      title: "寝る前の活動を“落ちる系”に寄せる",
      reason: "『眠そうなのに寝ない』は興奮が残っていることが多いので、体を落としていく活動に寄せると効果が出やすいです。",
    },
    {
      title: "就寝時刻を“だいたい一定”に寄せる",
      reason: "同じ時刻に眠るリズムができると入眠が早くなることが多いので、3日〜1週間の範囲で効いてきやすいです。",
    },
    {
      title: "うまくいった条件をメモして再現する",
      reason: "『この子に合う順番』は条件依存になりやすいので、当たりパターンを潰さず再現するほど精度が上がります。",
    },
  ];
}

function normalizeTop5(scene: Scene, raw: any): PlanItem[] {
  const fallback = defaultTop5(scene);

  if (!Array.isArray(raw) || raw.length === 0) return fallback;

  const items: PlanItem[] = raw.slice(0, 5).map((x: any, idx: number) => {
    const title = safeText(x?.title, fallback[idx]?.title ?? "").trim();
    const reason = safeText(x?.reason, fallback[idx]?.reason ?? "").trim();
    return { title, reason };
  });

  // 欠損補完
  const filled = items.map((it, idx) => {
    const ft = fallback[idx];
    return {
      title: it.title || ft.title,
      reason: it.reason || ft.reason,
    };
  });

  // シーン不一致を差し替え
  const fixed = filled.map((it, idx) => (violates(scene, it) ? fallback[idx] : it));

  // 全部ダメならフォールバック
  const allBad = fixed.every((it) => violates(scene, it));
  return allBad ? fallback : fixed;
}

function normalizeDuration(scene: Scene, raw: any): string {
  const s = safeText(raw, "").trim();
  if (scene === "now") {
    // now なのに 日/週 系が来たら分に矯正
    if (/(日|週間|週)/.test(s)) return "5〜10分";
    return s || "5〜10分";
  }
  // daily なのに 分 が来たら日へ矯正
  if (/(分)/.test(s)) return "3日";
  return s || "3日";
}

function normalizeNextStep(scene: Scene, raw: any, top5: PlanItem[]): string {
  const s = safeText(raw, "").trim();
  if (s) return s;

  if (scene === "now") {
    return `まずTOP1（${top5[0]?.title ?? "刺激を減らす"}）を5分だけ試して、反応が薄ければTOP2へ。`;
  }
  return `明日からTOP1（${top5[0]?.title ?? "寝る前の流れを固定"}）を3日試して、変化が薄ければTOP2へ。`;
}

function normalizeNgActions(raw: any): string[] {
  const fallback = ["急かす", "説得を続ける", "叱る"];
  const arr = safeArrayOfStrings(raw);
  return arr.length ? arr.slice(0, 8) : fallback;
}

function makeParentComment(scene: Scene, parentStress: string, problem: string): string {
  // LLMに任せず固定生成（宣言文が混ざらない）
  const stress = safeText(parentStress, "");
  const p = safeText(problem, "").trim();
  const has = (k: string) => stress.includes(k);

  if (scene === "now") {
    if (has("周りの目")) return "大丈夫。落ち着くことが最優先です。今日は短く区切ってOKです。";
    if (has("イライラ") || has("自己嫌悪")) return "大丈夫。イライラしてしまうのは普通です。今日は短く区切ってOKです。";
    if (has("焦")) return "大丈夫。焦る気持ちは自然です。今日は短く区切ってOKです。";
    if (has("孤独") || has("ワンオペ")) return "大丈夫。ひとりで抱えなくていいです。今日は短く区切ってOKです。";
    if (/(寝ない|泣|癇癪|暴れ|拒否)/.test(p)) return "大丈夫。落ち着くための一手で十分です。今日は短く区切ってOKです。";
    return "大丈夫。落ち着くための一手で十分です。今日は短く区切ってOKです。";
  }

  // daily
  if (has("周りの目")) return "大丈夫。家の中で整えられれば十分です。3日〜1週間単位で見てOKです。";
  if (has("イライラ") || has("自己嫌悪")) return "大丈夫。イライラしてしまうのは普通です。3日〜1週間単位で見てOKです。";
  if (has("焦")) return "大丈夫。焦る気持ちは自然です。3日〜1週間単位で見てOKです。";
  if (has("孤独") || has("ワンオペ")) return "大丈夫。ひとりで抱えなくていいです。3日〜1週間単位で見てOKです。";
  return "大丈夫。少しずつ整えれば十分です。3日〜1週間単位で見てOKです。";
}

function buildSystemPrompt(scene: Scene): string {
  const nowSpec = `
MODE: NOW (今すごく困ってる)
- TOP5は「今から10分以内に始められる」「今夜その場でできる」具体策のみ
- ルーティン/習慣/毎日/明日から/週/日数 など長期運用ワードは禁止
- durationは「分」だけ（例: 3分 / 5〜10分）
`;

  const dailySpec = `
MODE: DAILY (今じゃないけど普段から困ってる)
- TOP5は「明日からできる」「日常で整える」具体策のみ
- 今すぐ/◯分/この瞬間/今夜 など即効ワードは禁止
- durationは「日〜週」だけ（例: 3日 / 1週間）
`;

  return `
You are a parenting support AI.
Return ONLY valid JSON. No markdown. No extra text.
All text must be Japanese.
No abstract advice. No moral judgment. No blaming.

CRITICAL:
- Decide TOP5 in the most likely success order for THIS input.
- Each item MUST include a reason that explicitly references the user's input signals
  (childType / triggers / parentStress / problem / ageGroup / scene).
  Example: "『刺激が多かった』があるので〜" のように根拠を入れる。
- Titles must be short and action-oriented.
- Output must follow the schema exactly.

${scene === "now" ? nowSpec : dailySpec}

JSON schema:
{
  "childType": string,
  "summary": string,
  "top5": [{"title": string, "reason": string}],
  "order": string[],
  "duration": string,
  "nextStep": string,
  "ngActions": string[],
  "parentComment": string
}
`.trim();
}

function buildUserPrompt(input: GenerateInput, scene: Scene, ageGroup: AgeGroup): string {
  const triggers = input.triggers?.length ? input.triggers.join(", ") : "(なし)";
  const parentStress = input.parentStress?.trim() ? input.parentStress : "(なし)";
  const problem = input.problem?.trim() ? input.problem : "(なし)";

  return `
Child type: ${input.childType}
Age group: ${ageGroup}
Scene: ${scene}
Recent triggers: ${triggers}
Parent state/feeling: ${parentStress}
Problem description: ${problem}

Remember:
- TOP5 reasons must cite input signals (childType/triggers/parentStress/problem/ageGroup/scene).
- Output ONLY JSON.
`.trim();
}

export async function generatePlan(input: GenerateInput): Promise<PlanResult> {
  // 絶対に落ちない：この関数は throw しない
  try {
    const scene = asScene(input?.scene);
    const ageGroup = asAgeGroup(input?.ageGroup);

    const system = buildSystemPrompt(scene);
    const user = buildUserPrompt(
      {
        childType: safeText(input?.childType, "未指定"),
        problem: safeText(input?.problem, ""),
        ageGroup: safeText(input?.ageGroup, "3"),
        triggers: safeArrayOfStrings(input?.triggers),
        parentStress: safeText(input?.parentStress, ""),
        scene,
        anonUserId: safeText(input?.anonUserId, ""),
      },
      scene,
      ageGroup
    );

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const res = (await Promise.race([
      client.chat.completions.create({
        model,
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ])) as any;

    const text = String(res?.choices?.[0]?.message?.content ?? "");
    const jsonStr = extractJson(text);
    const parsed = jsonStr ? JSON.parse(jsonStr) : null;

    const childType = safeText(parsed?.childType, safeText(input?.childType, "未指定"));
    const summary = safeText(parsed?.summary, defaultSummary(scene));

    const top5 = normalizeTop5(scene, parsed?.top5);
    const order =
      Array.isArray(parsed?.order) && parsed.order.length === 5
        ? parsed.order.map((x: any) => String(x)).slice(0, 5)
        : top5.map((x) => x.title);

    const duration = normalizeDuration(scene, parsed?.duration);
    const nextStep = normalizeNextStep(scene, parsed?.nextStep, top5);
    const ngActions = normalizeNgActions(parsed?.ngActions);

    // parentComment は LLM 生成を使わず、入力からサーバ側で確実生成（宣言/作文が混ざらない）
    const parentComment = makeParentComment(scene, safeText(input?.parentStress, ""), safeText(input?.problem, ""));

    return {
      childType,
      summary,
      top5,
      order,
      duration,
      nextStep,
      ngActions,
      parentComment,
    };
  } catch {
    // フォールバック（必ず返す）
    const scene = asScene(input?.scene);
    const fallbackTop5 = defaultTop5(scene);
    return {
      childType: safeText(input?.childType, "未指定"),
      summary: defaultSummary(scene),
      top5: fallbackTop5,
      order: fallbackTop5.map((x) => x.title),
      duration: scene === "now" ? "5〜10分" : "3日",
      nextStep: normalizeNextStep(scene, "", fallbackTop5),
      ngActions: ["急かす", "説得を続ける", "叱る"],
      parentComment: makeParentComment(scene, safeText(input?.parentStress, ""), safeText(input?.problem, "")),
    };
  }
}
``