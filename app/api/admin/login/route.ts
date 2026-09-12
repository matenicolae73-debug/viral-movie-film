import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body?.token || "").trim();
  const expected = process.env.OWNER_PUBLISH_TOKEN?.trim();
  if (!expected) return NextResponse.json({ ok: false, error: "OWNER_PUBLISH_TOKEN is not configured." }, { status: 503 });
  if (!token || token !== expected) return NextResponse.json({ ok: false, error: "Invalid owner access token." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("vm_owner", token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}
