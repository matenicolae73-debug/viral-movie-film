import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    const action = String(body?.action || "status");
    const key = process.env.FAL_KEY?.trim();
    if (!requestId || !key) return NextResponse.json({ ok: false, error: !requestId ? "requestId is required." : "The service is temporarily unavailable." }, { status: 400 });
    const url = action === "result" ? (body?.responseUrl || `https://queue.fal.run/${VIDEO_MODEL}/requests/${encodeURIComponent(requestId)}`) : (body?.statusUrl || `https://queue.fal.run/${VIDEO_MODEL}/requests/${encodeURIComponent(requestId)}/status?logs=1`);
    const r = await fetch(url, { headers: { Authorization: `Key ${key}`, Accept: "application/json" }, cache: "no-store" });
    const raw = await r.text().catch(() => ""); let data: any = {}; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
    if (!r.ok) return NextResponse.json({ ok: false, error: data?.detail || data?.message || "The service returned an error. Please try again.", data }, { status: r.status });
    return NextResponse.json({ ok: true, data: { ...data, status: data?.status || data?.state || null } });
  } catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not check production status." }, { status: 500 }); }
}
