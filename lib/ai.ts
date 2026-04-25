import OpenAI from "openai";

export const AI_TS_VERSION = "2026-04-24_top5_modeA_parentAI_noDecl_backtickFree_v4";

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

function safeText(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function safeArrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

function asScene(v: unknown): Scene {
  return v === "daily" ? "daily" : "now";
}

function asAgeGroup(v: unknown): AgeGroup {
  const s = String(v ?? "3");
  if (s === "1" || s === "2" || s === "3" || s === "4") return s;
  return "3";
}

function extractJson(text: string): string | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

const NOW_BANNED: RegExp[] = [
  /ルーティン/,
  /習慣/,
  /毎日/,
  /明日から/,
  /継続/,
  /心がけ/,
  /意識/,
  /慣らす/,
  /体質/,
  /週間/,
  /\d+\s*日/,
  /1週間/,
  /2週間/,
  /長期/,
];

const DAILY_BANNED: RegExp[] = [
  /今すぐ/,
  /今夜/,
  /この瞬間/,
  /すぐに/,
  /\d+\s*分/,
  /3分/,
  /5分/,
  /10分/,
  /15分/,
];

function violatesScene(scene: Scene, item: PlanItem): boolean {
  const t = item.title + " " + item.reason;
  const banned = scene === "now" ? NOW_BANNED : DAILY_BANNED;
  return banned.some((re) => re.test(t));
}

function reasonHasEvidence(reason: string): boolean {
  return /『[^』]+』/.test(reason);
}

const PARENT_DECLARATION_NG: RegExp[] = [
  /してあげたい/,
  /していきたい/,
  /していきます/,
  /したいと思います/,
  /頑張りましょう/,
  /やっていきましょう/,
  /していきましょう/,
  /まずは/,
  /私は/,
  /わたしは/,
];

function isParentCommentInvalid(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return true;

  const sentences = t.split(/。|！|!|\?/).filter((x) => x.trim().length > 0);
  if (sentences.length < 3) return true;
  if (sentences.length > 10) return true;

  if (PARENT_DECLARATION_NG.some((re) => re.test(t))) return true;

  const hasNotAlone = /(あなただけじゃない|あなただけではない|ひとりじゃない|一人じゃない)/.test(t);
  const hasNotOnlyYourChild = /(あなたの子だけじゃない|あなたのお子さんだけじゃない|その子だけじゃない)/.test(t);
  const hasManySame = /(みんな|多くの親|同じ悩み|同じことで悩む|似たことで悩む)/.test(t);
  if (!(hasNotAlone && (hasNotOnlyYourChild || hasManySame))) return true;

  const calming = /(深呼吸|肩の力|いったん|落ち着|大丈夫|今日はこれでOK|今はこれでOK|ゆっくり)/.test(t);
  if (!calming) return true;

  return false;
}

function fallbackPlan(scene: Scene, childType: string): PlanResult {
  const top5: PlanItem[] =
    scene === "now"
      ? [
          {
            title: "刺激を減らす（光・音・声）",
            reason:
              "『刺激が多かった』『眠そう』『空腹・のどが渇いている』があると興奮が上がりやすいので、まず入力を減らすのが近道です。",
          },
          {
            title: "声かけを5語以内にする",
            reason:
              "『興奮しやすい』『切り替えが苦手』のときは長い説明で逆に荒れやすいので、情報量を絞るのが効きやすいです。",
          },
          {
            title: "3分で区切って一度終える",
            reason:
              "『今すごく困ってる』状況では長期戦が逆効果になりやすいので、短い成功体験で落ち着きを作るのが有効です。",
          },
          {
            title: "水分・トイレだけ先に済ませる",
            reason:
              "『空腹・のどが渇いている』が絡むと不快で寝付きにくいので、不快要因を先に消すのが効きやすいです。",
          },
          {
            title: "場所を変えてクールダウンする",
            reason:
              "『刺激が多かった』『予定変更があった』の後は切り替えが難しいことが多いので、環境を変えてリセットするのが効きやすいです。",
          },
        ]
      : [
          {
            title: "寝る前の流れを3ステップで固定する",
            reason:
              "『興奮しやすい』『不安になりやすい』タイプは見通しがあると落ち着きやすいので、毎晩同じ順番が効きやすいです。",
          },
          {
            title: "寝室の刺激（光・音・おもちゃ）を減らす",
            reason:
              "『刺激が多かった』が絡むと寝付きが崩れやすいので、環境側を整えると成功確率が上がりやすいです。",
          },
          {
            title: "就寝前の活動を\"落ちる系\"に寄せる",
            reason:
              "『眠そうなのに寝ない』は興奮が残っていることが多いので、落ちる活動に寄せると効果が出やすいです。",
          },
          {
            title: "就寝時刻を\"だいたい一定\"に寄せる",
            reason:
              "『普段から困ってる』場合はリズムを整えるほど効きやすいので、3日〜1週間単位で改善しやすいです。",
          },
          {
            title: "うまくいった条件をメモして再現する",
            reason:
              "『この子に合う順番』は条件依存になりやすいので、当たりパターンを再現するほど精度が上がります。",
          },
        ];

  const parentComment =
    scene === "now"
      ? "大丈夫。あなただけじゃないです。あなたの子だけじゃないです。みんな同じように悩みます。いったん深呼吸して、いまは\"短く区切る\"だけでOKです。落ち着けたら次の一手に進めます。"
      : "大丈夫。あなただけじゃないです。あなたの子だけじゃないです。みんな同じように悩みます。肩の力を少し抜いて、3日〜1週間単位で見てOKです。小さく整えるだけでも効いてきます。";

  const summary =
    scene === "now"
      ? "刺激や切り替えに反応しやすい状態です。まずは\"今この場\"で落ち着ける条件を作るのが近道です。"
      : "同じパターンが繰り返されやすい状態です。明日から整えられる『土台』を作るとラクになります。";

  return {
    childType: childType || "未指定",
    summary,
    top5,
    order: top5.map((x) => x.title),
    duration: scene === "now" ? "5〜10分" : "3日",
    nextStep:
      scene === "now"
        ? "まずTOP1を5分だけ試して、反応が薄ければTOP2へ。"
        : "明日からTOP1を3日試して、変化が薄ければTOP2へ。",
    ngActions: ["急かす", "説得を続ける", "叱る"],
    parentComment,
  };
}

function buildSystemPrompt(scene: Scene): string {
  const nowSpec = [
    "MODE: NOW (urgent)",
    "- TOP5 must be actions you can start within 10 minutes, doable tonight.",
    "- FORBIDDEN in TOP5: routine/habit/daily/tomorrow/days/weeks/long-term.",
    "- duration must be minutes only (e.g. \"3分\" or \"5〜10分\").",
  ].join("\n");

  const dailySpec = [
    "MODE: DAILY (recurring)",
    "- TOP5 must be actions to practice from tomorrow / daily-life adjustments.",
    "- FORBIDDEN in TOP5: now/tonight/immediately and minute-based tricks.",
    "- duration must be days or weeks only (e.g. \"3日\" or \"1週間\").",
  ].join("\n");

  const core = [
    "You are a parenting support AI.",
    "Return ONLY valid JSON. No markdown. No extra text.",
    "All text must be Japanese.",
    "No abstract advice. No moral judgment. No blaming.",
    "",
    "CRITICAL OUTPUT RULES:",
    "1) Decide TOP5 in likely success order for THIS input.",
    "2) Each TOP5 item must include a reason with explicit evidence.",
    "   The reason MUST quote at least one input signal in Japanese quotes like 『眠そう』 or 『周りの目がつらい』.",
    "3) Titles must be short, action-oriented.",
    "4) parentComment MUST be 3-7 sentences, longer encouragement.",
    "   It MUST include: あなただけじゃない AND (あなたの子だけじゃない OR みんな同じ悩み).",
    "   It must include at least one calming phrase (深呼吸/肩の力/いったん/落ち着く/大丈夫/ゆっくり).",
    "   ABSOLUTE FORBIDDEN in parentComment: declarations like 〜したい / していきます / 頑張りましょう / まずは / 私は.",
    "",
    "JSON schema:",
    "{ childType: string, summary: string, top5: [{title: string, reason: string}], order: string[], duration: string, nextStep: string, ngActions: string[], parentComment: string }",
    "",
    scene === "now" ? nowSpec : dailySpec,
  ].join("\n");

  return core.trim();
}

function buildUserPrompt(input: GenerateInput, scene: Scene, ageGroup: AgeGroup): string {
  const triggers = input.triggers.length ? input.triggers.join(", ") : "(none)";
  const stress = input.parentStress.trim() ? input.parentStress : "(none)";
  const problem = input.problem.trim() ? input.problem : "(none)";

  const lines = [
    "ChildType: " + input.childType,
    "AgeGroup: " + ageGroup,
    "Scene: " + scene,
    "Triggers: " + triggers,
    "ParentStress: " + stress,
    "Problem: " + problem,
    "",
    "Remember:",
    "- For EACH top5[i].reason, quote evidence using 『...』 from the above signals.",
    "- parentComment must be encouragement with variation, no declarations.",
    "- Output ONLY JSON.",
  ];

  return lines.join("\n").trim();
}

async function callLLM(system: string, user: string): Promise<string> {
  const client = getClient();
  const model = getModel();

  const res = (await Promise.race([
    client.chat.completions.create({
      model,
      temperature: 0.65,
      max_tokens: 1100,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
  ])) as any;

  return String(res?.choices?.[0]?.message?.content ?? "");
}

function validatePlan(scene: Scene, plan: any): { ok: true } | { ok: false; issues: string[] } {
  const issues: string[] = [];

  if (!plan || typeof plan !== "object") return { ok: false, issues: ["plan_not_object"] };

  const top5 = plan?.top5;
  if (!Array.isArray(top5) || top5.length < 5) issues.push("top5_missing_or_short");

  if (Array.isArray(top5)) {
    const slice = top5.slice(0, 5);

    const sceneViolations = slice.filter((x: any) =>
      violatesScene(scene, { title: safeText(x?.title, ""), reason: safeText(x?.reason, "") })
    ).length;

    const evidenceMissing = slice.filter((x: any) => !reasonHasEvidence(safeText(x?.reason, ""))).length;

    if (sceneViolations >= 2) issues.push("scene_violation_many");
    if (evidenceMissing >= 2) issues.push("evidence_missing_many");
  }

  const duration = safeText(plan?.duration, "");
  if (scene === "now" && /(日|週|週間)/.test(duration)) issues.push("duration_wrong_for_now");
  if (scene === "daily" && /(分)/.test(duration)) issues.push("duration_wrong_for_daily");

  if (isParentCommentInvalid(safeText(plan?.parentComment, ""))) issues.push("parent_comment_invalid");

  return issues.length ? { ok: false, issues } : { ok: true };
}

function normalizePlan(scene: Scene, input: GenerateInput, parsed: any): PlanResult {
  const fallback = fallbackPlan(scene, input.childType || "未指定");

  const childType = safeText(parsed?.childType, input.childType || "未指定").trim() || "未指定";
  const summary = safeText(parsed?.summary, "").trim() || fallback.summary;

  const rawTop5 = Array.isArray(parsed?.top5) ? parsed.top5 : [];
  const top5: PlanItem[] = rawTop5.slice(0, 5).map((x: any, i: number) => {
    const ft = fallback.top5[i];
    const title = safeText(x?.title, ft.title).trim() || ft.title;
    const reason = safeText(x?.reason, ft.reason).trim() || ft.reason;
    const it: PlanItem = { title, reason };
    return violatesScene(scene, it) ? ft : it;
  });

  while (top5.length < 5) top5.push(fallback.top5[top5.length]);

  const order =
    Array.isArray(parsed?.order) && parsed.order.length >= 5
      ? parsed.order.map((x: any) => String(x)).slice(0, 5)
      : top5.map((x) => x.title);

  const durationRaw = safeText(parsed?.duration, "").trim();
  const duration =
    scene === "now"
      ? /(日|週|週間)/.test(durationRaw) || !durationRaw
        ? "5〜10分"
        : durationRaw
      : /(分)/.test(durationRaw) || !durationRaw
        ? "3日"
        : durationRaw;

  const nextStepRaw = safeText(parsed?.nextStep, "").trim();
  const nextStep =
    nextStepRaw ||
    (scene === "now"
      ? "まずTOP1を5分だけ試して、反応が薄ければTOP2へ。"
      : "明日からTOP1を3日試して、変化が薄ければTOP2へ。");

  const ngActions =
    Array.isArray(parsed?.ngActions) && parsed.ngActions.length
      ? safeArrayOfStrings(parsed.ngActions).slice(0, 8)
      : ["急かす", "説得を続ける", "叱る"];

  const parentCommentRaw = safeText(parsed?.parentComment, "").trim();
  const parentComment = isParentCommentInvalid(parentCommentRaw) ? fallback.parentComment : parentCommentRaw;

  return { childType, summary, top5, order, duration, nextStep, ngActions, parentComment };
}

export async function generatePlan(input: GenerateInput): Promise<PlanResult> {
  try {
    const scene = asScene((input as any)?.scene);
    const ageGroup = asAgeGroup((input as any)?.ageGroup);

    const safeInput: GenerateInput = {
      childType: safeText((input as any)?.childType, "未指定"),
      problem: safeText((input as any)?.problem, ""),
      ageGroup: safeText((input as any)?.ageGroup, "3"),
      triggers: safeArrayOfStrings((input as any)?.triggers),
      parentStress: safeText((input as any)?.parentStress, ""),
      scene,
      anonUserId: safeText((input as any)?.anonUserId, ""),
    };

    // 1st generation
    const system1 = buildSystemPrompt(scene);
    const user1 = buildUserPrompt(safeInput, scene, ageGroup);
    const text1 = await callLLM(system1, user1);
    const jsonStr1 = extractJson(text1);
    const parsed1 = jsonStr1 ? JSON.parse(jsonStr1) : null;

    const v1 = validatePlan(scene, parsed1);
    if (v1.ok) return normalizePlan(scene, safeInput, parsed1);

    // retry once
    const system2 = [
      buildSystemPrompt(scene),
      "",
      "RETRY: Previous output had issues: " + v1.issues.join(", "),
      "Fix strictly:",
      "- top5 must have exactly 5 items.",
      "- EACH reason must quote evidence using 『...』 from input signals.",
      "- parentComment must satisfy constraints (no declarations, 3-7 sentences, not-alone meaning, calming phrase).",
      "Return ONLY valid JSON.",
    ].join("\n");

    const user2 = [
      buildUserPrompt(safeInput, scene, ageGroup),
      "",
      "Extra retry constraints:",
      "- Reasons MUST include at least one of these exact signals in 『...』 when available:",
      "  childType='" + safeInput.childType + "', triggers='" + safeInput.triggers.join(" / ") + "', parentStress='" + safeInput.parentStress + "'",
      "- parentComment must avoid: してあげたい / していきたい / していきます / 頑張りましょう / まずは / 私は",
    ].join("\n");

    const text2 = await callLLM(system2, user2);
    const jsonStr2 = extractJson(text2);
    const parsed2 = jsonStr2 ? JSON.parse(jsonStr2) : null;

    const v2 = validatePlan(scene, parsed2);
    if (v2.ok) return normalizePlan(scene, safeInput, parsed2);

    return fallbackPlan(scene, safeInput.childType);
  } catch {
    const scene = asScene((input as any)?.scene);
    return fallbackPlan(scene, safeText((input as any)?.childType, "未指定"));
  }
}
