import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";

function textOf(value: unknown) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    const action = String(body?.action || "status");
    const key = process.env.FAL_KEY?.trim();

    if (!requestId) return NextResponse.json({ ok: false, error: "requestId is required." }, { status: 400 });
    if (!key) return NextResponse.json({ ok: false, error: "FAL_KEY is missing on this Vercel deployment." }, { status: 500 });

    const base = `https://queue.fal.run/${MODEL}/requests/${encodeURIComponent(requestId)}`;
    const url = action === "result" ? base : `${base}/status?logs=1`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Key ${key}`, Accept: "application/json" },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text().catch(() => "");
    let data: any = {};
    if (raw) {
      if (contentType.includes("application/json")) {
        try { data = JSON.parse(raw); } catch { data = { message: raw }; }
      } else {
        try { data = JSON.parse(raw); } catch { data = { message: raw }; }
      }
    }

    if (!response.ok) {
      const message = data?.detail || data?.message || data?.error || `fal.ai status request returned HTTP ${response.status}.`;
      return NextResponse.json({
        ok: false,
        message: textOf(message),
        error: data,
        falStatus: response.status,
        falRequestId: response.headers.get("x-fal-request-id") || response.headers.get("x-request-id") || null,
        falErrorType: response.headers.get("x-fal-error-type") || null,
      }, { status: response.status });
    }

    const normalized = {
      ...data,
      status: data?.status || data?.state || data?.data?.status || data?.data?.state || null,
      error: data?.error || data?.detail || data?.data?.error || data?.data?.detail || null,
      error_type: data?.error_type || data?.data?.error_type || null,
      logs: Array.isArray(data?.logs) ? data.logs : [],
    };

    return NextResponse.json({ ok: true, data: normalized });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Could not check video status."
    }, { status: 500 });
  }
}
