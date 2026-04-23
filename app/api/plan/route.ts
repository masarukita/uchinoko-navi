import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "../../../lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const childType = String(body?.childType ?? "").trim();
    const problem = String(body?.problem ?? "").trim();

    if (!childType || !problem) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const plan = await generatePlan({ childType, problem });

    // フロントが data.plan を期待しているのでこの形
    return NextResponse.json({ plan });
  } catch (e) {
    // ここに来ても「止めない」設計（フェーズBの目的）
    const fallback = {
      plan: {
        childType: "未指定",
        summary: "一時的にプラン生成に失敗しました。まずは負荷を下げて短く試します。",
        top3: [
          { title: "3分だけで終了", reason: "短い成功を作る" },
          { title: "刺激を減らす", reason: "泣きの加速を止める" },
          { title: "予告→実行を固定", reason: "切り替えを楽にする" },
        ],
        order: ["① 3分だけ", "② 刺激を減らす", "③ 予告→実行固定"],
        duration: "3日",
        nextStep: "変化が薄い場合は時間帯をずらす/成功回数を増やす方向に切り替えます。",
        ngActions: ["叱りながら続ける", "毎回ルールを変える", "説明を増やしすぎる"],
        parentComment:
          "大丈夫。あなたもお子さんも全く悪くないです。今日は短く区切って、できたところだけ拾えばOK。",
      },
    };

    return NextResponse.json(fallback, { status: 200 });
  }
}