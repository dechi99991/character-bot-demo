import { describe, it, expect } from "vitest";

// pickResponse is not exported; test via mockChat or duplicate logic inline
// Since we can't easily export pickResponse without modifying source, we test mockChat response content

import { mockChat } from "../mock-chat-handler";
import type { CoreMessage } from "ai";

async function getResponseText(messages: CoreMessage[]): Promise<string> {
  const res = await mockChat({ messages });
  const raw = await res.text();
  // Parse Vercel AI SDK data stream: lines like `0:"char"\n`
  return raw
    .split("\n")
    .filter((l) => l.startsWith("0:"))
    .map((l) => JSON.parse(l.slice(2)))
    .join("");
}

const msg = (content: string): CoreMessage[] => [{ role: "user", content }];

describe("mockChat keyword matching", () => {
  it("クイズ → quiz question", async () => {
    const text = await getResponseText(msg("クイズを出して"));
    expect(text).toContain("クイズ");
  });

  // 夜・睡眠 → カフェイン低の「こがれ」（ほうじ茶）。回帰ガードも兼ねる。
  it("夜 → こがれ（低カフェイン）", async () => {
    const text = await getResponseText(msg("夜ぐっすり寝たい"));
    expect(text).toContain("こがれ");
    expect(text).not.toContain("茶のことはじめ");
  });

  it("睡眠 → こがれ（旧 featured バグ回帰ガード）", async () => {
    const text = await getResponseText(msg("睡眠に良いお茶は"));
    expect(text).toContain("こがれ");
    expect(text).not.toContain("茶のことはじめ");
  });

  it("甘くて渋みのない → あまもあ（バグの本丸・E2E）", async () => {
    const text = await getResponseText(msg("甘くて渋みのないお茶が飲みたい"));
    expect(text).toContain("あまもあ");
    expect(text).not.toContain("茶のことはじめ");
  });

  it("煎茶 → brewing variants", async () => {
    const text = await getResponseText(msg("煎茶の淹れ方を教えて"));
    expect(text).toContain("水温");
  });

  it("unmatched → fallback (non-empty)", async () => {
    const text = await getResponseText(msg("こんにちは"));
    expect(text.length).toBeGreaterThan(0);
  });

  it("response headers contain x-vercel-ai-data-stream", async () => {
    const res = await mockChat({ messages: msg("test") });
    expect(res.headers.get("x-vercel-ai-data-stream")).toBe("v1");
  });
});
