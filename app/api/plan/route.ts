import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json().catch(() => ({}));

    const plan = await generatePlan({
      childType: typeof body?.childType === "string" ? body.childType : "未指定",
      problem: typeof body?.problem === "string" ? body.problem : "",
      ageGroup: typeof body?.ageGroup === "string" ? body.ageGroup : "3",
      triggers: Array.isArray(body?.triggers)
        ? body.triggers.filter((x: unknown) => typeof x === "string")
        : [],
      parentStress: typeof body?.parentStress === "string" ? body.parentStress : "",
      scene: body?.scene === "daily" ? "daily" : "now",
      anonUserId: typeof body?.anonUserId === "string" ? body.anonUserId : undefined,
    });

    return NextResponse.json({ plan });
  } catch (e: any) {
    return NextResponse.json({
      plan: {
        childType: "未指定",
        summary: "一時的に生成できませんでした。",
        top5: [
          { title: "刺激を減らす（光・音・声）", reason: "『刺激が強い』状況だと落ち着きにくいので入力を減らします。" },
          { title: "声かけを短くする", reason: "情報量を減らすと切り替えがしやすくなります。" },
          { title: "3分で区切って終える", reason: "短く区切ると成功体験が作りやすいです。" },
          { title: "水分だけ確認する", reason: "不快要因があると寝つきにくいためです。" },
          { title: "場所を変えてクールダウン", reason: "環境変化が切り替えのきっかけになります。" },
        ],
        order: [
          "刺激を減らす（光・音・声）",
          "声かけを短くする",
          "3分で区切って終える",
          "水分だけ確認する",
          "場所を変えてクールダウン",
        ],
        duration: "5〜10分",
        nextStep: "まずTOP1を5分だけ試して、反応が薄ければTOP2へ。",
        ngActions: ["急かす", "説得を続ける", "叱る"],
        parentComment:
          "大丈夫。あなただけじゃないです。あなたの子だけじゃないです。みんな同じように悩みます。いったん深呼吸して、今日は短く区切ってOKです。",
      },
    });
  }
}
