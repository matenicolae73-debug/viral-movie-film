import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";

function serialize(value: any) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export async function POST(request: Request) {
  let requestIdForError = "";
  try {
    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.requestId || "").trim();
    requestIdForError = requestId;
    const action = String(body?.action || "status").trim().toLowerCase();
    const key = process.env.FAL_KEY?.trim();

    if (!requestId) return NextResponse.json({ ok: false, error: "requestId is required." }, { status: 400 });
    if (!key) return NextResponse.json({ ok: false, error: "The service is temporarily unavailable." }, { status: 500 });

    fal.config({ credentials: key });

    if (action === "result") {
      const result = await fal.queue.result(MODEL, { requestId });
      return NextResponse.json({
        ok: true,
        action: "result",
        falStatus: 200,
        falRequestId: requestId,
        data: serialize(result?.data ?? result),
      });
    }

    const status = await fal.queue.status(MODEL, { requestId, logs: true });
    const normalized = serialize(status);
    const state = normalized?.status || normalized?.state || null;

    return NextResponse.json({
      ok: true,
      action: "status",
      falStatus: 200,
      falRequestId: requestId,
      data: {
        ...normalized,
        status: state,
        state,
        logs: Array.isArray(normalized?.logs) ? normalized.logs : [],
      },
    });
  } catch (e: any) {
    const status = Number(e?.status || e?.statusCode || e?.response?.status || 502);
    const safeStatus = status >= 400 && status <= 599 ? status : 502;
    const detail = e?.body || e?.response?.data || e?.message || "Could not check video status.";
    const message = typeof detail === "string" ? detail : JSON.stringify(detail);

    return NextResponse.json({
      ok: false,
      error: message,
      falStatus: safeStatus,
      falRequestId: requestIdForError,
      action: "status",
    }, { status: safeStatus });
  }
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
