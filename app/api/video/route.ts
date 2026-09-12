import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = "fal-ai/vidu/q3/text-to-video/turbo";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim().slice(0, 2000);
    const aspect_ratio = String(body?.aspect_ratio || "16:9");
    if (!prompt) return NextResponse.json({ ok: false, message: "Prompt is required." }, { status: 400 });

    const key = process.env.FAL_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, message: "FAL_KEY is not configured in Vercel. Add it under Settings → Environment Variables, then redeploy." }, { status: 500 });
    }

    const r = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspect_ratio, duration: 5, resolution: "540p", audio: true }),
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message = data?.detail || data?.message || data?.error || `fal.ai returned HTTP ${r.status}.`;
      const requestId = r.headers.get("x-fal-request-id") || r.headers.get("x-request-id") || null;
      const errorType = r.headers.get("x-fal-error-type") || null;
      return NextResponse.json({ ok: false, message: typeof message === "string" ? message : JSON.stringify(message), error: data, falStatus: r.status, falRequestId: requestId, falErrorType: errorType }, { status: r.status });
    }

    const requestId = data?.request_id || data?.requestId;
    if (!requestId) return NextResponse.json({ ok: false, message: "fal.ai accepted the request but returned no request ID.", data }, { status: 502 });
    return NextResponse.json({ ok: true, requestId, data });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Video request failed." }, { status: 500 });
  }
}
