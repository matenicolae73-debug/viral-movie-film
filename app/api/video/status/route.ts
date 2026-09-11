import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    const contentType = r.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await r.json().catch(() => ({})) : { message: await r.text().catch(() => "fal.ai returned a non-JSON response.") };

    if (!r.ok) {
      const message = data?.detail || data?.message || data?.error || `fal.ai status request returned HTTP ${r.status}.`;
      return NextResponse.json({ ok: false, message: typeof message === "string" ? message : JSON.stringify(message), error: data }, { status: r.status });
    }
    const normalized = {
      ...data,
      status: data?.status || data?.state || data?.data?.status || data?.data?.state || null,
      error: data?.error || data?.detail || data?.data?.error || null,
    };
    return NextResponse.json({ ok: true, data: normalized });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not check video status." }, { status: 500 });
  }
}
