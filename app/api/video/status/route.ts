import { NextResponse } from "next/server";

const MODEL = "fal-ai/vidu/q3/text-to-video/turbo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requestId = String(body?.requestId || "").trim();
    const action = String(body?.action || "status").toLowerCase();
    if (!requestId) return NextResponse.json({ ok: false, error: "requestId is required." }, { status: 400 });

    const key = process.env.FAL_KEY;
    if (!key) return NextResponse.json({ ok: false, demo: true, message: "FAL_KEY is not configured." });

    const base = `https://queue.fal.run/${MODEL}/requests/${encodeURIComponent(requestId)}`;
    const url = action === "result" ? base : `${base}/status?logs=true`;
    const r = await fetch(url, { headers: { Authorization: `Key ${key}` }, cache: "no-store" });
    const data = await r.json();
    return NextResponse.json({ ok: r.ok, data }, { status: r.ok ? 200 : r.status });
  } catch {
    return NextResponse.json({ ok: false, error: "Status request failed." }, { status: 500 });
  }
}
