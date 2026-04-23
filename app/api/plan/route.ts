// app/api/plan/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    plan: {
      childType: "興奮しやすい",
      summary: "刺激に反応しやすく、切り替えが難しい傾向があります。",
      top3: [
        { title: "抱っこして安全を確保", reason: "安心感を最優先にする" },
        { title: "照明を落とす", reason: "刺激を減らす" },
        { title: "声かけを短くする", reason: "情報量を減らす" }
      ],
      order: ["抱っこ", "照明を落とす", "声かけを短く"],
      duration: "2〜3日",
      nextStep: "反応が弱ければ方法②へ",
      ngActions: ["急がせる", "叱る"],
      parentComment: "今の対応は間違っていません。"
    }
  });
}