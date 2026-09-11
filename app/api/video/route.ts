import { NextResponse } from "next/server";

const MODEL = "fal-ai/vidu/q3/text-to-video/turbo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || "").trim().slice(0, 2000);
    const aspect_ratio = String(body?.aspect_ratio || "16:9");
    if (!prompt) return NextResponse.json({ ok: false, error: "Prompt is required." }, { status: 400 });

    const key = process.env.FAL_KEY;
    if (!key) return NextResponse.json({ ok: false, demo: true, message: "FAL_KEY is not configured. Add it privately in Vercel Environment Variables." });

    const r = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspect_ratio, duration: 5, resolution: "540p", audio: true }),
    });
    const data = await r.json();
    if (!r.ok) return NextResponse.json({ ok: false, error: data }, { status: r.status });
    return NextResponse.json({ ok: true, requestId: data?.request_id || data?.requestId, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Video request failed." }, { status: 500 });
  }
}
