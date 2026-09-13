import { NextResponse } from "next/server";
import { moderatePrompt } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";
const IMAGE_MODEL = process.env.FAL_IMAGE_MODEL?.trim() || "fal-ai/flux/schnell";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const idea = String(body?.idea || "").trim().slice(0, 1600);
    const title = String(body?.title || "ViralMovie AI").trim().slice(0, 120);
    const logline = String(body?.logline || idea).trim().slice(0, 500);
    const genre = String(body?.genre || "Cinematic");
    const aspect_ratio = ["16:9", "9:16", "1:1"].includes(String(body?.aspect_ratio)) ? String(body.aspect_ratio) : "16:9";
    if (!idea) return NextResponse.json({ ok: false, message: "Movie idea is required." }, { status: 400 });
    const safety = moderatePrompt(`${title}. ${idea}`);
    if (!safety.ok) return NextResponse.json({ ok: false, message: safety.reason }, { status: 400 });
    const key = process.env.FAL_KEY?.trim();
    if (!key) return NextResponse.json({ ok: false, message: "FAL_KEY is missing on this Vercel deployment." }, { status: 500 });

    const posterPrompt = `Professional cinematic movie poster for an original ${genre} film titled "${title}". ${logline}. Dramatic theatrical composition, premium studio poster, no real people, no celebrity likeness, no copyrighted characters, no logos, no readable text except the film title, high detail.`.slice(0, 1800);
    const imageResponse = await fetch(`https://queue.fal.run/${IMAGE_MODEL}`, { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ prompt: posterPrompt, image_size: "landscape_16_9", num_images: 1, output_format: "jpeg" }), cache: "no-store" });
    const imageRaw = await imageResponse.text().catch(() => "");
    let imageData: any = {}; try { imageData = imageRaw ? JSON.parse(imageRaw) : {}; } catch {}
    const posterUrl = imageData?.images?.[0]?.url || imageData?.data?.images?.[0]?.url || null;

    const trailerPrompt = `Create a cinematic trailer teaser shot for an original ${genre} movie titled "${title}". Story: ${idea}. This is a short trailer moment, not a full scene. Use dramatic pacing, strong visual hook, cinematic camera movement, premium lighting, suspense and a clear sense of the movie world. Use original synchronized cinematic music and sound effects. No real people, celebrity likenesses, copyrighted characters, logos or imitation of real voices.`.slice(0, 1900);
    const videoResponse = await fetch(`https://queue.fal.run/${VIDEO_MODEL}`, { method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", Accept: "application/json", "X-Fal-Store-IO": "1" }, body: JSON.stringify({ prompt: trailerPrompt, aspect_ratio, duration: 8, resolution: "540p", audio: true }), cache: "no-store" });
    const videoRaw = await videoResponse.text().catch(() => "");
    let videoData: any = {}; try { videoData = videoRaw ? JSON.parse(videoRaw) : {}; } catch {}
    if (!videoResponse.ok) return NextResponse.json({ ok: true, posterUrl, trailerRequestId: null, trailerWarning: videoData?.detail || videoData?.message || `Trailer request returned HTTP ${videoResponse.status}.` });
    return NextResponse.json({ ok: true, posterUrl, trailerRequestId: videoData?.request_id || videoData?.requestId || null, trailerResponseUrl: videoData?.response_url || videoData?.responseUrl || null, trailerStatusUrl: videoData?.status_url || videoData?.statusUrl || null });
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Production assets request failed." }, { status: 500 });
  }
}
