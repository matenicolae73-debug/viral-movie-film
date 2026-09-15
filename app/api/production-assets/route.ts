import { NextResponse } from "next/server";
import { moderatePrompt } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";
const IMAGE_MODEL = "fal-ai/flux/schnell";

function extractUrl(data: any) {
  return data?.images?.[0]?.url || data?.image?.url || data?.output?.images?.[0]?.url || data?.data?.images?.[0]?.url || null;
}

export async function POST(request: Request) {
  try {
    const key = process.env.FAL_KEY?.trim();
    if (!key) return NextResponse.json({ ok: false, message: "The video service is temporarily unavailable." }, { status: 503 });

    const body = await request.json().catch(() => ({}));
    const idea = String(body?.idea || "").trim().slice(0, 1600);
    const title = String(body?.title || "Untitled Movie").trim().slice(0, 120);
    const logline = String(body?.logline || "").trim().slice(0, 600);
    const genre = String(body?.genre || "Cinematic").trim().slice(0, 80);
    const aspect = body?.aspect_ratio === "9:16" ? "9:16" : "16:9";
    const adultConfirmed = Boolean(body?.adultConfirmed);
    const requestedDuration = Number(body?.trailerDuration || 15);
    const duration = Math.max(5, Math.min(16, Number.isFinite(requestedDuration) ? requestedDuration : 15));

    if (!idea) return NextResponse.json({ ok: false, message: "A movie idea is required." }, { status: 400 });
    if (!adultConfirmed) return NextResponse.json({ ok: false, message: "Please confirm the 18+ safety requirement before generating." }, { status: 400 });

    const safety = moderatePrompt(`${title}\n${logline}\n${idea}`);
    if (!safety.ok) return NextResponse.json({ ok: false, message: safety.reason }, { status: 400 });

    const imagePrompt = `Cinematic official movie poster for an original fictional film titled "${title}". Genre: ${genre}. Story: ${idea}. ${logline}. Premium theatrical composition, dramatic lighting, polished typography area, no real celebrities, no recognizable real people, no copyrighted characters, original fictional cast, professional movie-poster photography.`.slice(0, 2000);

    let posterUrl: string | null = null;
    try {
      const imageResponse = await fetch(`https://fal.run/${IMAGE_MODEL}`, {
        method: "POST",
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, image_size: aspect === "9:16" ? "portrait_4_3" : "landscape_16_9", num_images: 1 }),
        cache: "no-store"
      });
      const raw = await imageResponse.text();
      let data: any = {}; try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (imageResponse.ok) posterUrl = extractUrl(data);
    } catch {}

    if (body?.posterOnly === true) {
      return NextResponse.json({ ok: true, posterUrl, trailerRequestId: null, trailerDuration: 0, requestedDuration: 0 });
    }

    const trailerPrompt = `Create a cinematic trailer teaser shot for the fictional movie "${title}". Genre: ${genre}. Story: ${idea}. ${logline}. Make this a high-impact trailer moment with a clear beginning, dramatic visual action and an ending hook. Original fictional characters only. No real people, celebrities, copyrighted characters or imitation of a real person's voice. Synchronized original cinematic music, ambience, dialogue when appropriate and sound effects.`.slice(0, 2000);

    const videoResponse = await fetch(`https://queue.fal.run/${VIDEO_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json", "X-Fal-Store-IO": "1" },
      body: JSON.stringify({ input: { prompt: trailerPrompt, aspect_ratio: aspect, duration, resolution: "540p", audio: true } }),
      cache: "no-store"
    });
    const rawVideo = await videoResponse.text();
    let videoData: any = {}; try { videoData = rawVideo ? JSON.parse(rawVideo) : {}; } catch {}
    if (!videoResponse.ok) return NextResponse.json({ ok: false, message: videoData?.detail || videoData?.message || "Trailer generation could not be started.", posterUrl }, { status: videoResponse.status });

    const requestId = videoData?.request_id || videoData?.requestId || videoData?.id || null;
    const responseUrl = videoData?.response_url || videoData?.responseUrl || null;
    const statusUrl = videoData?.status_url || videoData?.statusUrl || null;

    return NextResponse.json({ ok: true, posterUrl, trailerRequestId: requestId, trailerResponseUrl: responseUrl, trailerStatusUrl: statusUrl, trailerDuration: duration, requestedDuration });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Production pack failed." }, { status: 500 });
  }
}
