import { NextRequest, NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generatePlan } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const childType = String(body?.childType ?? "").trim();
    const problem = String(body?.problem ?? "").trim();
    const anonUserId = String(body?.anonUserId ?? "").trim() || "unknown";

    if (!childType || !problem) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const plan = await generatePlan({ childType, problem });

    const ref = await addDoc(collection(db, "plans"), {
      createdAt: serverTimestamp(),
      anonUserId,
      input: { childType, problem },
      plan,
    });

    return NextResponse.json({ id: ref.id, plan });
  } catch (e: any) {
    // ここで落ちてもフロントは固まらないように、PLAN_FAILEDを返す
    return NextResponse.json({ error: "PLAN_FAILED" }, { status: 500 });
  }
}