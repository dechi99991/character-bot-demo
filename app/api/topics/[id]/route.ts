import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const store = getDataStore();
  const body = await req.json();
  const topic = await store.updateTopic(numId, body);
  if (!topic) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json(topic);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const store = getDataStore();
  const ok = await store.deleteTopic(numId);
  if (!ok) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
