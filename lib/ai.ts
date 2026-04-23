import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function generatePlan(input:{
  childType:string;
  problem:string;
  ageGroup:"2"|"3"|"4";
  triggers:string[];
  parentStress:string;
}) {
  const system = `
You are a parenting support AI.
Return ONLY valid JSON.
No abstract advice.
Always decide TOP3 in success order.
Tone must be calm and non-judgmental.
`;

  const user = `
Child type: ${input.childType}
Age: ${input.ageGroup}
Recent triggers: ${input.triggers.join(", ")}
Parent stress: ${input.parentStress}
Problem: ${input.problem}

Return JSON with:
childType, summary,
top3[{title,reason}],
order[], duration, nextStep, ngActions[], parentComment
(All text in Japanese)
`;

  try {
    const res = await Promise.race([
      client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      }),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")), 8000))
    ]) as any;

    const text = res.choices[0].message.content;
    return JSON.parse(text);
  } catch {
    // フォールバック（必ず返す）
    return {
      childType: input.childType,
      summary: "刺激や切り替えに反応しやすい状態です。",
      top3: [
        { title: "環境を暗くする", reason: "刺激を減らすため" },
        { title: "声かけを短くする", reason: "情報量を減らすため" },
        { title: "3分だけ区切る", reason: "成功体験を作るため" }
      ],
      order: ["環境を暗くする","声かけを短くする","3分だけ区切る"],
      duration: "2〜3日",
      nextStep: "変化がなければ時間帯をずらす",
      ngActions: ["急かす","説得を続ける","叱る"],
      parentComment: "ここまで向き合っているあなたは十分やっています。"
    };
  }
}
``