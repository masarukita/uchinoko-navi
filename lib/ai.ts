// lib/ai.ts
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";

export type PlanItem = {
  title: string;   // 行動を1行で（動詞から始める）
  reason: string;  // 手順/時間/台詞まで含めて短く具体
};

export type PlanResult = {
  childType: string;
  summary: string;        // この子の特徴（短く）
  top3: PlanItem[];       // 最適な対処TOP3（成功しやすい順）
  order: string[];        // やる順番（①→②→③）
  duration: string;       // 試す期間（例: "3日"）
  nextStep: string;       // うまくいかない場合の次の一手（短く分岐）
  ngActions: string[];    // NG行動（最低3つ）
  parentComment: string;  // 親への本音コメント（責めない/短い）
};

function safeString(v: any, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s.length ? s : fallback;
}

function safeStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => safeString(x))
    .filter((s) => s.length > 0);
}

function safeTop3(v: any): PlanItem[] {
  if (!Array.isArray(v)) return [];
  const items = v
    .map((x) => ({
      title: safeString(x?.title),
      reason: safeString(x?.reason),
    }))
    .filter((x) => x.title.length > 0);
  return items.slice(0, 3);
}

function fallbackPlan(childType: string, problem: string): PlanResult {
  const ct = safeString(childType, "未指定");
  const pb = safeString(problem, "");

  const base: PlanResult = {
    childType: ct,
    summary: "状況が変わると反応が切り替わりやすいタイプです。まず“短い成功”から作ります。",
    top3: [
      {
        title: "まず3分だけ“成功ライン”を下げる",
        reason: "タイマー3分→座れたら即終了。台詞は『3分できた、えらい！』だけ。延長しない。",
      },
      {
        title: "ルールは1行・先に見せる（事前予告）",
        reason: "食前に目を見て『ごはん中は①座る②歩かない』を指で示す→復唱させて開始。",
      },
      {
        title: "環境の刺激を減らす（視界・物の配置）",
        reason: "テーブル上は皿とコップだけ。おもちゃ/リモコンを別室へ。立ったら無言で戻す。",
      },
    ],
    order: ["① 3分だけ成功ラインを下げる", "② 1行ルールを予告して開始", "③ 刺激を減らして継続"],
    duration: "3日",
    nextStep: "3日で変化が薄ければ、時間帯をずらす（空腹前）＋『座れたら1口→ほめる』の1口ステップに切り替え。",
    ngActions: ["途中で条件を増やす（延長・追加ルール）", "注意・説教を増やす（刺激が増える）", "できていない点を指摘し続ける"],
    parentComment: "3分できたら十分前進。今日はそこだけ取れたら勝ちです。",
  };

  // 入力に寄せた微調整（最低限）
  if (pb.includes("ごはん") || pb.includes("食") || pb.includes("立ち歩")) {
    base.summary = "食事中に刺激で注意が散りやすいタイプです。『座る』を短い成功で積み上げます。";
    base.top3[0] = {
      title: "最初の3分だけ座れたらOKにする",
      reason: "タイマー3分→座れたら終了。『3分座れた、えらい！』で終わらせる（延長しない）。",
    };
    base.nextStep =
      "3日で変化が薄ければ、食前に“座る場所”を固定（椅子マーク）＋『座れたら1口→ほめる』の1口ステップへ。";
    base.ngActions = ["食事中に注意し続ける（刺激が増える）", "急に離れる（不安が増える）", "不安を無視する"];
    base.parentComment = "食事は難易度高め。少しでも座れたら、それは“前に進んだ証拠”です。";
  }

  if (pb.includes("離れ") || pb.includes("甘え") || pb.includes("抱っこ")) {
    base.summary = "親から離れにくいタイプです。“短い分離”を安全に積み上げます。";
    base.top3 = [
      {
        title: "30秒だけ離れる練習を作る（予告→戻る）",
        reason: "『30秒だけ行ってすぐ戻る』→キッチンで30秒→必ず戻る。成功後に回数を増やす。",
      },
      {
        title: "特定の“待てる時間”を毎日同じ場所で",
        reason: "同じ椅子/同じ絵本。『ここで待っててね』→1分→戻ってほめる。時間は日ごと+30秒。",
      },
      {
        title: "安心の合図（短い言葉）を固定する",
        reason: "台詞は1つに固定『大丈夫、すぐ戻る』。説明を増やさない。戻ったら抱きしめて終わり。",
      },
    ];
    base.order = ["① 30秒離れる→必ず戻る", "② 同じ場所で1分待てる→+30秒", "③ 合図の台詞を固定して反復"];
    base.nextStep = "3日で変化が薄ければ、“離れる距離”を先に短く（同じ部屋の端）して成功回数を稼いでから距離を伸ばす。";
    base.ngActions = ["長時間一緒にい続ける（練習が発生しない）", "急に離れる（不安が増える）", "不安を無視して押し切る"];
    base.parentComment = "少しずつでOK。30秒でもできたら、もう前進しています。";
  }

  return base;
}

function extractJson(text: string): any | null {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e === -1 || e < s) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

function normalize(raw: any, childType: string, problem: string): PlanResult {
  const safe = fallbackPlan(childType, problem);

  const summary = safeString(raw?.summary, safe.summary);
  const duration = safeString(raw?.duration, safe.duration);

  let top3 = safeTop3(raw?.top3);
  if (top3.length < 3) {
    top3 = [...top3, ...safe.top3].slice(0, 3);
  }

  let order = safeStringArray(raw?.order);
  if (order.length < 3) order = safe.order;

  const nextStep = safeString(raw?.nextStep, safe.nextStep);

  let ngActions = safeStringArray(raw?.ngActions);
  if (ngActions.length < 3) ngActions = safe.ngActions;

  const parentComment = safeString(raw?.parentComment, safe.parentComment);

  // コスト抑制＆UI安定：文字数を軽く制限（過剰長文を防ぐ）
  const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

  return {
    childType: safeString(raw?.childType, safe.childType),
    summary: clip(summary, 80),
    top3: top3.map((t) => ({
      title: clip(t.title, 40),
      reason: clip(t.reason, 120),
    })),
    order: order.map((s) => clip(s, 60)).slice(0, 3),
    duration: clip(duration, 10),
    nextStep: clip(nextStep, 140),
    ngActions: ngActions.map((s) => clip(s, 60)).slice(0, 6),
    parentComment: clip(parentComment, 80),
  };
}

export async function generatePlan(input: {
  childType: string;
  problem: string;
}): Promise<PlanResult> {
  const childType = safeString(input.childType);
  const problem = safeString(input.problem);

  if (!childType || !problem) {
    return fallbackPlan(childType || "未指定", problem || "");
  }

  const client = getOpenAIClient();
  const model = getOpenAIModel();

  // ✅ English prompt (cost-friendly) + Japanese operational output
  // - Output MUST be JSON only
  // - Each top3.reason includes actionable steps, timing, and exact short phrases
  const system = `
You are a “Personalized Parenting Navigator”
who supports parents struggling with childcare challenges.

Your goal is NOT to judge, pressure, or “fix” parents or children.
Your goal is to help parents calm down, feel safe,
and realize that their current situation is not a failure.

You must always assume:
• The parent is trying their best
• The child is not doing anything wrong
• Feeling overwhelmed or irritated is normal

────────────────────────
[ABSOLUTE RULES]

• Do NOT use abstract theory or ideals
• Do NOT lecture, preach, or moralize
• Do NOT evaluate, blame, or label parents or children
• Do NOT use phrases like “you should” or “you must”
• Always clearly communicate:
  “Neither you nor your child is doing anything wrong.”

────────────────────────
[HOW TO FORM THE ANSWER]

• Always list solutions in order of highest likelihood of success
• Clearly state the order in which to try them
• Specify how long to try each step
• Always provide a “next step” if it doesn’t work
• Include a list of actions that are better NOT done
• End with a short message that helps the parent emotionally settle

────────────────────────
[INPUTS]

Child type: {TYPE}
Current difficulty: {SITUATION}
Level of stress / frustration: {DETAILS – free text}

────────────────────────
[OUTPUT FORMAT]

【Your Child’s Characteristics】
• Calm, non-judgmental summary of the child’s current tendencies
• Focus on situation and temperament only (no good/bad labels)

【Top 3 Approaches (Ordered by Likelihood of Success)】
1.
• Why this approach is likely to match this child
• What to do in concrete, realistic terms

2.
• Why this is the next best option
• What to do specifically

3.
• Why this can work for some children
• When it might or might not be a good fit

【Order to Try】
① → ② → ③
• Include when it’s okay to move on to the next step

【How Long to Try】
• How many days or attempts per approach
• Clear signs that it’s okay to stop trying

【If It Doesn’t Work】
• Alternative approaches
• Signs that it’s okay to pause or reset

【Things to Avoid】
• Actions that often worsen the situation
• Things the parent does NOT need to force themselves to do

【A Message for Mom / Dad】
• Acknowledge that frustration and anxiety are natural
• Clearly state that neither the parent nor the child is at fault
• Reassure them that this situation is common and not a failure
• Give explicit permission to pause, rest, or slow down
`.trim();

  const user = `
childType: ${childType}
problem: ${problem}

Generate a plan that reduces decision fatigue and can be executed tonight.
Return Japanese strings but JSON only.
`.trim();

  // JSON Schema (strict) to reduce formatting drift and extra tokens
  const schema = {
    name: "uchinoko_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        childType: { type: "string" },
        summary: { type: "string" },
        top3: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              reason: { type: "string" },
            },
            required: ["title", "reason"],
          },
        },
        order: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
        },
        duration: { type: "string" },
        nextStep: { type: "string" },
        ngActions: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" },
        },
        parentComment: { type: "string" },
      },
      required: [
        "childType",
        "summary",
        "top3",
        "order",
        "duration",
        "nextStep",
        "ngActions",
        "parentComment",
      ],
    },
  } as const;

  const timeoutMs = 15000;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("OpenAI timeout")), timeoutMs)
  );

  try {
    const call = client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // response_format to enforce JSON Schema
      // (If a model/SDK combination ever fails here, we'll fall back below.)
      response_format: {
        type: "json_schema",
        json_schema: schema,
      } as any,
    });

    const res: any = await Promise.race([call, timeout]);

    // With json_schema, content should be JSON text.
    const content = safeString(res?.choices?.[0]?.message?.content);
    const raw = extractJson(content) ?? JSON.parse(content);

    return normalize(raw, childType, problem);
  } catch (e) {
    // Fallback: never break the app, always return a usable plan.
    return fallbackPlan(childType, problem);
  }
}
``