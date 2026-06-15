import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/db";

export async function GET() {
  const store = getDataStore();
  const items = await store.listAllTopics();
  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: Request) {
  const store = getDataStore();
  const body = await req.json();

  const { title, body: topicBody, enabled } = body;
  if (!title || !topicBody) {
    return NextResponse.json(
      { error: "Bad Request", detail: "title と body は必須です" },
      { status: 400 }
    );
  }

  const topic = await store.createTopic({
    title,
    body: topicBody,
    enabled: enabled ?? true,
  });
  return NextResponse.json(topic, { status: 201 });
}
