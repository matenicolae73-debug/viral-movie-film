import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = process.env.OWNER_PUBLISH_TOKEN?.trim();
  const cookie = request.headers.get("cookie") || "";
  if (!expected || !cookie.includes(`vm_owner=${encodeURIComponent(expected)}`)) return NextResponse.json({ ok: false, error: "Owner access required." }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "MP4 file is required." }, { status: 400 });
    if (!file.type.includes("video") && !file.name.toLowerCase().endsWith(".mp4")) return NextResponse.json({ ok: false, error: "Only video files are accepted." }, { status: 400 });
    const blob = await put(`movies/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "-")}`, file, { access: "public", addRandomSuffix: true });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Movie upload failed." }, { status: 500 });
  }
}
