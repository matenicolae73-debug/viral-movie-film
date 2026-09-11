import { NextResponse } from "next/server";

function isAllowedFalUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.endsWith(".fal.media");
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") || "";
  if (!isAllowedFalUrl(url)) return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });

  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok || !r.body) return NextResponse.json({ error: "Could not download video." }, { status: 502 });
    return new Response(r.body, {
      headers: {
        "Content-Type": r.headers.get("content-type") || "video/mp4",
        "Content-Disposition": 'attachment; filename="viralmovie-scene.mp4"',
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video download failed." }, { status: 500 });
  }
}
