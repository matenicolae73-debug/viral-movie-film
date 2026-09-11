import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || "").trim();
    const aspect_ratio = String(body?.aspect_ratio || "16:9");

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    const key = process.env.FAL_KEY;

    if (!key) {
      return NextResponse.json({
        ok: false,
        demo: true,
        message: "FAL_KEY is not configured. Add it privately in Vercel Environment Variables."
      });
    }

    const r = await fetch(
      "https://queue.fal.run/fal-ai/vidu/q3/text-to-video/turbo",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio,
          duration: 5,
          resolution: "540p",
          audio: true
        })
      }
    );

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: data },
        { status: r.status }
      );
    }

    return NextResponse.json({
      ok: true,
      data
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Video request failed." },
      { status: 500 }
    );
  }
}
