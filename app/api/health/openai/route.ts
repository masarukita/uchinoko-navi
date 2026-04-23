// app/api/health/openai/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });

    return NextResponse.json({
      ok: true,
      model: "gpt-4o-mini",
      reply: res.choices[0]?.message?.content ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        status: e.status ?? 500,
        code: e.code ?? null,
        message: e.message ?? "unknown error",
      },
      { status: 500 }
    );
  }
}
``