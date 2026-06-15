import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/db";

export async function GET() {
  const store = getDataStore();
  const items = await store.listAllSalesRules();
  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: Request) {
  const store = getDataStore();
  const body = await req.json();

  const { keywords, recommendProduct, recommendMessage, enabled, priority } =
    body;
  if (!keywords || !recommendProduct || !recommendMessage) {
    return NextResponse.json(
      {
        error: "Bad Request",
        detail: "keywords / recommendProduct / recommendMessage は必須です",
      },
      { status: 400 }
    );
  }

  const rule = await store.createSalesRule({
    keywords,
    recommendProduct,
    recommendMessage,
    enabled: enabled ?? true,
    priority: priority ?? 100,
  });
  return NextResponse.json(rule, { status: 201 });
}
