import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "fal-ai/vidu/q3/text-to-video/turbo";

function safeText(value: unknown) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim().slice(0, 2000);
    const aspect_ratio = ["16:9", "9:16", "1:1", "4:3", "3:4"].includes(String(body?.aspect_ratio))
      ? String(body.aspect_ratio)
      : "16:9";

    if (!prompt) {
      return NextResponse.json({ ok: false, message: "Prompt is required." }, { status: 400 });
    }

    const key = process.env.FAL_KEY?.trim();
    if (!key) {
      return NextResponse.json({
        ok: false,
        message: "FAL_KEY is missing on this Vercel deployment. Add FAL_KEY to the Production environment and redeploy."
      }, { status: 500 });
    }

    const response = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Fal-Store-IO": "1",
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio,
        duration: 5,
        resolution: "540p",
        audio: true,
      }),
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
      const message = data?.detail || data?.message || data?.error || `fal.ai returned HTTP ${response.status}.`;
      return NextResponse.json({
        ok: false,
        message: safeText(message),
        falStatus: response.status,
        falRequestId: response.headers.get("x-fal-request-id") || response.headers.get("x-request-id") || null,
        falErrorType: response.headers.get("x-fal-error-type") || null,
      }, { status: response.status });
    }

    const requestId = data?.request_id || data?.requestId;
    if (!requestId) {
      return NextResponse.json({
        ok: false,
        message: "fal.ai responded successfully but did not return a request ID.",
        data
      }, { status: 502 });
    }

    return NextResponse.json({ ok: true, requestId, data });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Video request failed."
    }, { status: 500 });
  }
}
