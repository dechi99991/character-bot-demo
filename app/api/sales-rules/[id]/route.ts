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
  const rule = await store.updateSalesRule(numId, body);
  if (!rule) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json(rule);
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
  const ok = await store.deleteSalesRule(numId);
  if (!ok) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
