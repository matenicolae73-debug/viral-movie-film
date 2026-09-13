import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const idea = String(b?.idea || "").trim();
  const genre = String(b?.genre || "Cinematic");
  const minutes = Number(b?.minutes || 1);

  if (!idea) return NextResponse.json({ error: "Idea is required." }, { status: 400 });

  const safeMinutes = Math.min(60, Math.max(1, minutes));
  const sceneCount = Math.max(12, Math.round(safeMinutes * 12));
  // Long-form planning: 12 cinematic 5-second scenes per minute.
  // Return the complete scene plan; the UI paginates it so 60-minute movies
  // can still be navigated without losing scenes.
  const scenes = Array.from({ length: sceneCount }, (_, i) => {
    const id = i + 1;
    const progress = id / sceneCount;
    const act = progress <= 0.25 ? "ACT I — setup and discovery" : progress <= 0.5 ? "ACT II — rising conflict" : progress <= 0.75 ? "ACT III — escalation and turning point" : "ACT IV — climax and resolution";
    const beat = id % 12 === 1 ? "establish the location and visual context" : id % 12 === 6 ? "advance the story with a meaningful character action or reveal" : id % 12 === 0 ? "end the beat with a visual hook that naturally leads into the next scene" : "continue the previous action with clear cause-and-effect";
    return {
      id,
      durationSeconds: 5,
      act,
      prompt: `Cinematic ${genre.toLowerCase()} scene ${id} of ${sceneCount}. Movie idea: ${idea}. ${act}. ${beat}. Maintain strict continuity with previous and following scenes: same main characters, faces, wardrobe, props, locations, time of day, visual style and story logic. Use film-quality composition, realistic motion, consistent camera language, dramatic lighting and a clean beginning/middle/end for this 5-second shot. Do not reset the story or introduce unrelated characters.`
    };
  });

  return NextResponse.json({
    ok: true,
    demo: true,
    title: "ViralMovie Project",
    logline: `A ${genre.toLowerCase()} movie built from: ${idea}`,
    sceneCount,
    visibleScenes: sceneCount,
    scenes,
    note: `Complete long-film plan: ${sceneCount} scenes × 5 seconds. The storyboard UI shows 12 scenes per page.`
  });
}