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
import { checkRateLimit } from "@/lib/rate-limit";
import type { CoreMessage } from "ai";

export async function POST(req: Request) {
  // fail-closed: 本番で MOCK_CHAT=true を物理ブロック
  if (process.env.NODE_ENV === "production" && process.env.MOCK_CHAT === "true") {
    throw new Error("[fail-closed] MOCK_CHAT=true is prohibited in production");
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60_000) / 1000)) },
    });
  }

  const { messages } = (await req.json()) as { messages: CoreMessage[] };
  if (process.env.MOCK_CHAT === "true") {
    return mockChat({ messages });
  }
  return handleChat({ messages });
}
