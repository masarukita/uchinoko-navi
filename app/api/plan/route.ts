import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json().catch(() => ({}));

    const childType = typeof body?.childType === "string" ? body.childType : "未指定";
    const problem = typeof body?.problem === "string" ? body.problem : "";
    const ageGroup = typeof body?.ageGroup === "string" ? body.ageGroup : "3";
    const scene = body?.scene === "daily" ? "daily" : "now";
    const triggers = Array.isArray(body?.triggers)
      ? body.triggers.filter((x: unknown) => typeof x === "string")
      : [];
    const parentStress = typeof body?.parentStress === "string" ? body.parentStress : "";
    const anonUserId = typeof body?.anonUserId === "string" ? body.anonUserId : undefined;

    const plan = await generatePlan({
      childType,
      problem,
      ageGroup,
      scene,
      triggers,
      parentStress,
      anonUserId,
    });

    // 互換性維持：今のフロントに合わせて { plan: ... } で返す
    return NextResponse.json({ plan });
  } catch (e: any) {
    // UIを止めない：必ず返す（TOP5形式のフォールバック）
    return NextResponse.json({
      plan: {
        childType: "未指定",
        summary: "一時的に生成できませんでした。",
        top5: [
          { title: "刺激を減らす（光・音・声）", reason: "まずは刺激入力を減らして落ち着きを作るのが近道です。" },
          { title: "声かけを5語以内にする", reason: "情報量を減らすと切り替えがしやすくなります。" },
          { title: "3分で区切って一度終える", reason: "短く区切ると成功体験が作りやすいです。" },
          { title: "水分・トイレだけ先に済ませる", reason: "不快要因を先に消すと寝付きが改善しやすいです。" },
          { title: "場所を変えてクールダウンする", reason: "環境を変えると切り替えのきっかけになります。" },
        ],
        order: [
          "刺激を減らす（光・音・声）",
          "声かけを5語以内にする",
          "3分で区切って一度終える",
          "水分・トイレだけ先に済ませる",
          "場所を変えてクールダウンする",
        ],
        duration: "5〜10分",
        nextStep: "まずTOP1を5分だけ試して、反応が薄ければTOP2へ。",
        ngActions: ["急かす", "説得を続ける", "叱る"],
        parentComment: "大丈夫。落ち着くための一手で十分です。今日は短く区切ってOKです。",
      },
    });
  }
}