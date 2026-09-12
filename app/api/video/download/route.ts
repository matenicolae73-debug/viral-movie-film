import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url") || "";
    const target = new URL(url);
    if (target.protocol !== "https:" || !target.hostname.endsWith("fal.media")) {
      return NextResponse.json({ error: "Invalid video URL." }, { status: 400 });
    }

    const response = await fetch(target.toString(), { cache: "no-store" });
    if (!response.ok || !response.body) {
      return NextResponse.json({ error: `Video download failed (HTTP ${response.status}).` }, { status: 502 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "video/mp4",
        "Content-Disposition": 'attachment; filename="viralmovie-scene.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid video URL." }, { status: 400 });
  }
}
