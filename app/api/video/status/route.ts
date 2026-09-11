import { NextResponse } from "next/server";

const MODEL = "fal-ai/vidu/q3/text-to-video/turbo";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    const action = String(body?.action || "status");
    const key = process.env.FAL_KEY;

    if (!requestId) return NextResponse.json({ ok: false, error: "requestId is required." }, { status: 400 });
    if (!key) return NextResponse.json({ ok: false, error: "FAL_KEY is not configured." }, { status: 500 });

    const base = `https://queue.fal.run/${MODEL}/requests/${encodeURIComponent(requestId)}`;
    const url = action === "result" ? base : `${base}/status?logs=true`;

    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Key ${key}` },
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));

    if (!r.ok) return NextResponse.json({ ok: false, error: data }, { status: r.status });
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not check video status." }, { status: 500 });
  }
}
