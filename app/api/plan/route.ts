import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const {
      childType,
      problem,
      triggers = [],
      parentStress = "",
      ageGroup = "3",
    } = await req.json();

    const plan = await generatePlan({
      childType,
      problem,
      triggers,
      parentStress,
      ageGroup,
    });

    return NextResponse.json({ plan });
  } catch (e) {
    // UIを止めないため、必ず返す
    return NextResponse.json({
      plan: {
        childType: "未指定",
        summary: "一時的に生成できませんでした。",
        top3: [
          { title: "環境を暗くする", reason: "刺激を減らす" },
          { title: "声かけを短くする", reason: "情報量を減らす" },
          { title: "3分で区切る", reason: "成功体験を作る" },
        ],
        order: ["環境を暗くする", "声かけを短くする", "3分で区切る"],
        duration: "2〜3日",
        nextStep: "時間帯をずらして再試行",
        ngActions: ["急かす", "説得を続ける", "叱る"],
        parentComment:
          "大丈夫。あなたもお子さんも全く悪くないです。今日は短く区切ってOK。",
      },
    });
  }
}