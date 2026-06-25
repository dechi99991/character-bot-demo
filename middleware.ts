import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/admin", "/api/topics", "/api/sales-rules", "/api/log"];

function isProtected(pathname: string) {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;

  // ADMIN_PASSWORD 未設定の本番 → 403
  if (!password && process.env.NODE_ENV === "production") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ADMIN_PASSWORD 未設定の開発 → 通過（開発便宜）
  if (!password) return NextResponse.next();

  // Basic 認証チェック
  const auth = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");
  if (scheme?.toLowerCase() === "basic" && encoded) {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const [, pass] = decoded.split(":");
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/topics/:path*", "/api/sales-rules/:path*", "/api/log/:path*"],
};
