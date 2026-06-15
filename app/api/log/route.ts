import { NextResponse } from "next/server";
import { getDataStore, type ConversationLogInput } from "@/lib/db";

export async function POST(req: Request) {
  const store = getDataStore();
  const body = (await req.json()) as ConversationLogInput;

  if (!body.sessionId || !body.role || !body.content) {
    return NextResponse.json(
      { error: "Bad Request", detail: "sessionId / role / content は必須です" },
      { status: 400 }
    );
  }

  // DB書き込み失敗でもチャットは止めない
  try {
    await store.appendConversationLog(body);
  } catch {
    // no-op: Phase 2 で D1 実装に差し替え後にエラーハンドリングを追加
  }

  return NextResponse.json({ ok: true });
}
