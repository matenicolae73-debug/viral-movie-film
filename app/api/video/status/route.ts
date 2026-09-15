import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";

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

    if (!requestId) {
      return NextResponse.json({ ok: false, error: "requestId is required." }, { status: 400 });
    }
    if (!key) {
      return NextResponse.json({ ok: false, error: "The service is temporarily unavailable." }, { status: 500 });
    }

    // Always use the canonical Vidu Q3 queue URL. Some fal responses can contain
    // legacy/custom URLs with an incomplete model path (for example /fal-ai/vidu/requests/...).
    const url = canonicalUrl(requestId, action);
    const response = await fetch(url, {
      headers: {
        Authorization: `Key ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const raw = await response.text().catch(() => "");
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    const normalized = {
      ...data,
      status: data?.status || data?.state || data?.data?.status || data?.data?.state || null,
      error: data?.error || data?.detail || data?.data?.error || null,
      logs: Array.isArray(data?.logs) ? data.logs : [],
    };

    if (!response.ok) {
      const message =
        data?.detail ||
        data?.message ||
        data?.error?.message ||
        data?.error ||
        `fal.ai returned HTTP ${response.status}.`;

      return NextResponse.json(
        {
          ok: false,
          error: typeof message === "string" ? message : JSON.stringify(message),
          falStatus: response.status,
          falRequestId: requestId,
          action,
          endpoint: url,
          data,
          raw: raw.slice(0, 4000),
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      data: normalized,
      falStatus: response.status,
      falRequestId: requestId,
      action,
      endpoint: url,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Could not check video status.",
      },
      { status: 500 },
    );
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
