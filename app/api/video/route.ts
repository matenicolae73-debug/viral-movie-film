import { NextResponse } from "next/server";
import { moderatePrompt } from "@/lib/safety";
import { fal } from "@fal-ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MODEL = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim().slice(0, 2000);
    const safety = moderatePrompt(prompt);
    if (!safety.ok) return NextResponse.json({ ok: false, message: safety.reason, blocked: true, category: safety.category }, { status: 400 });
    const aspect_ratio = ["16:9", "9:16", "1:1", "4:3", "3:4"].includes(String(body?.aspect_ratio)) ? String(body.aspect_ratio) : "16:9";
    const audio = {
      dialogue: body?.audio?.dialogue !== false,
      narration: body?.audio?.narration !== false,
      music: body?.audio?.music !== false,
      sfx: body?.audio?.sfx !== false,
    };
    const audioParts = [
      audio.dialogue ? "natural character dialogue and voice acting when characters speak" : "no character dialogue",
      audio.narration ? "cinematic narration when appropriate" : "no narration",
      audio.music ? "an original cinematic background music score matched to the scene mood" : "no background music",
      audio.sfx ? "synchronized ambience, Foley and realistic sound effects" : "no added sound effects",
    ];
    const audioPrompt = `AI AUDIO: Generate synchronized audio together with the video. ${audioParts.join("; ")}. Keep voices, ambience, music and effects coherent with the action and consistent with the movie. Do not use copyrighted songs or imitate a real person's voice.`;
    const finalPrompt = `${prompt}\n\n${audioPrompt}`.slice(0, 2000);
    if (body?.adultConfirmed !== true) return NextResponse.json({ ok: false, message: "You must confirm that you are 18+ and agree to the ViralMovie safety rules." }, { status: 400 });
    const key = process.env.FAL_KEY?.trim();
    if (!key) return NextResponse.json({ ok: false, message: "The video service is temporarily unavailable." }, { status: 500 });
    fal.config({ credentials: key });
    const submitted = await fal.queue.submit(MODEL, {
      input: {
        prompt: finalPrompt,
        aspect_ratio,
        duration: 5,
        resolution: "540p",
        audio: true,
      },
    });
    const requestId = (submitted as { request_id?: string }).request_id;
    if (!requestId) {
      return NextResponse.json({ ok: false, message: "The video service did not return a valid request.", data: submitted }, { status: 502 });
    }
    return NextResponse.json({ ok: true, audioEnabled: true, audio, requestId, data: submitted });
  } catch (e) { return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : "Video request failed." }, { status: 500 }); }
}
