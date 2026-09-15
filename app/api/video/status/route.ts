import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    const action = String(body?.action || "status");
    const key = process.env.FAL_KEY?.trim();
    if (!requestId) return NextResponse.json({ ok: false, error: "requestId is required." }, { status: 400 });
    if (!key) return NextResponse.json({ ok: false, error: "The service is temporarily unavailable." }, { status: 500 });
    const canonicalUrl = `https://queue.fal.run/${MODEL}/requests/${encodeURIComponent(requestId)}${action === "result" ? "" : "/status?logs=1"}`;
    const custom = action === "result" ? body?.responseUrl : body?.statusUrl;
    const urls = [custom, canonicalUrl].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

    let lastStatus = 502;
    let lastData: any = {};
    let lastRaw = "";
    for (const url of urls) {
      const r = await fetch(url, { headers: { Authorization: `Key ${key}`, Accept: "application/json" }, cache: "no-store" });
      const raw = await r.text().catch(() => "");
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw }; }
      lastStatus = r.status; lastData = data; lastRaw = raw;
      if (!r.ok) continue;

      const normalized = {
        ...data,
        status: data?.status || data?.state || data?.data?.status || data?.data?.state || null,
        error: data?.error || data?.detail || data?.data?.error || null,
        logs: Array.isArray(data?.logs) ? data.logs : [],
      };
      return NextResponse.json({ ok: true, data: normalized });
    }

    return NextResponse.json({
      ok: false,
      error: lastData?.detail || lastData?.message || lastData?.error || "The service returned an error. Please try again.",
      falStatus: lastStatus,
      data: lastData,
      raw: lastRaw.slice(0, 2000),
    }, { status: lastStatus });
  } catch (e) { return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not check video status." }, { status: 500 }); }
}
