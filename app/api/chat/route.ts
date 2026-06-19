/**
 * Next.js API Route — 薄いアダプター
 *
 * 【Why】
 * ビジネスロジックは lib/chat-handler.ts（フレームワーク非依存）に集約済み。
 * このファイルは「Next.js のリクエストを受けて handleChat に渡すだけ」の責務に限定する。
 * Cloudflare Workers へ移行する際は、このファイルに相当する Workers の
 * fetch ハンドラを書き、同じ handleChat を呼べばよい。
 */

import { handleChat } from "@/lib/chat-handler";
import { mockChat } from "@/lib/mock-chat-handler";
import type { CoreMessage } from "ai";

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: CoreMessage[] };
  if (process.env.MOCK_CHAT === "true") {
    return mockChat({ messages });
  }
  return handleChat({ messages });
}
