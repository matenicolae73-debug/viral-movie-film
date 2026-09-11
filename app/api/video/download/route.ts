import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url") || "";
    const target = new URL(url);
    if (target.protocol !== "https:" || !target.hostname.endsWith("fal.media")) {
      return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
    }

    const r = await fetch(target.toString(), { cache: "no-store" });
    if (!r.ok || !r.body) return NextResponse.json({ error: "Video download failed." }, { status: 502 });

    return new Response(r.body, {
      headers: {
        "Content-Type": r.headers.get("content-type") || "video/mp4",
        "Content-Disposition": 'attachment; filename="viralmovie-scene.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
  }
}
