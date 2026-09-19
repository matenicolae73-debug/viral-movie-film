import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const idea = String(b?.idea || "").trim();
  const genre = String(b?.genre || "Cinematic");
  const durationSeconds = Number(b?.durationSeconds ?? b?.seconds ?? 1);

  if (!idea) return NextResponse.json({ error: "Idea is required." }, { status: 400 });

  const safeSeconds = Math.min(60, Math.max(1, Math.round(durationSeconds)));
  const sceneCount = 1;
  const scenes = [{
    id: 1,
    durationSeconds: safeSeconds,
    act: "CONTINUOUS SHOT — complete story in one uninterrupted video",
    prompt: `Create ONE single continuous ${safeSeconds}-second ${genre.toLowerCase()} cinematic video from this story idea: ${idea}. Tell the complete requested moment as one uninterrupted shot, not a storyboard and not multiple scenes. Preserve the same fictional characters, faces, hair, age, body proportions, wardrobe, props, location, weather, time of day, screen direction, lighting and color grade throughout. Use realistic actor performance, natural eye-lines, believable body mechanics, physically plausible motion, cinematic camera movement and professional film lighting. The camera may move naturally within the same continuous shot, but do not cut to separate scenes, do not jump locations, do not introduce unrelated events and do not reset the action. Include only story-relevant dialogue and action. Generate synchronized original audio with consistent character voices, natural room tone, ambience, Foley, realistic effects and an original cinematic score. No copyrighted songs and no imitation of real people's voices.`
  }];


  return NextResponse.json({
    ok: true,
    demo: true,
    title: "ViralMovie Project",
    logline: `A ${genre.toLowerCase()} continuous video built from: ${idea}`,
    sceneCount,
    visibleScenes: 1,
    scenes,
    note: `Single continuous video: ${safeSeconds} second${safeSeconds === 1 ? "" : "s"}. No internal scene splitting or multi-scene assembly.`
  });
}