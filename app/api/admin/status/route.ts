import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const expected = process.env.OWNER_PUBLISH_TOKEN?.trim();
  const cookie = request.headers.get("cookie") || "";
  const loggedIn = !!expected && cookie.includes(`vm_owner=${encodeURIComponent(expected)}`);
  return NextResponse.json({ ok: true, loggedIn });
}
