import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "alibaba/wan-3.0/text-to-video";

function canonicalUrl(requestId: string, action: string) {
  const encoded = encodeURIComponent(requestId);
  return action === "result"
    ? `https://queue.fal.run/${MODEL}/requests/${encoded}/response`
    : `https://queue.fal.run/${MODEL}/requests/${encoded}/status?logs=1`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    const action = String(body?.action || "status").trim().toLowerCase();
    const key = process.env.FAL_KEY?.trim();

    if (!requestId) return NextResponse.json({ ok: false, error: "requestId is required." }, { status: 400 });
    if (!key) return NextResponse.json({ ok: false, error: "The video service is temporarily unavailable." }, { status: 500 });

    fal.config({ credentials: key });

    if (action === "result") {
      const result = await fal.queue.result(MODEL, { requestId });
      return NextResponse.json({ ok: true, data: result?.data ?? result, falStatus: 200, falRequestId: requestId, action });
    }

    const status = await fal.queue.status(MODEL, { requestId, logs: true });
    return NextResponse.json({ ok: true, data: status, falStatus: 200, falRequestId: requestId, action });
  } catch (e: any) {
    const status = Number(e?.status || e?.statusCode || 502);
    const detail = e?.body || e?.data || e?.message || "Could not check video status.";
    return NextResponse.json({
      ok: false,
      error: typeof detail === "string" ? detail : JSON.stringify(detail),
      falStatus: status,
      falRequestId: requestIdFromError(e),
    }, { status: status >= 400 && status < 600 ? status : 502 });
  }
}

function requestIdFromError(e: any) {
  return e?.requestId || e?.request_id || null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId") || "";
  const action = url.searchParams.get("action") || "status";

  const synthetic = new Request(request.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId, action }),
  });

  return POST(synthetic);
}
