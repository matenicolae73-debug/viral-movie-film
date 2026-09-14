import { NextResponse } from "next/server";

function planForScene(scene: any, index: number, total: number, genre: string) {
  const p = String(scene?.prompt || "").toLowerCase();
  const progress = index / Math.max(1, total - 1);
  const shot = index % 5 === 0 ? "wide establishing shot" : index % 3 === 0 ? "medium tracking shot" : index % 2 === 0 ? "close-up" : "over-the-shoulder shot";
  const camera = p.includes("chase") || p.includes("run") || p.includes("action") ? "dynamic handheld tracking" : progress < .2 ? "slow cinematic dolly-in" : progress > .8 ? "controlled push-in" : "smooth cinematic tracking";
  const lighting = p.includes("night") || p.includes("dark") ? "moody practical night lighting" : p.includes("rain") || p.includes("storm") ? "cool atmospheric storm lighting" : p.includes("sun") || p.includes("day") ? "natural daylight with cinematic contrast" : "soft cinematic key light with motivated highlights";
  const pacing = progress < .25 ? "measured setup" : progress < .7 ? "rising tension" : progress < .9 ? "accelerated escalation" : "decisive climax and release";
  const transition = index === total - 1 ? "fade to black" : "cinematic match/dissolve";
  return { sceneId: Number(scene?.id || index + 1), shot, camera, lighting, pacing, transition, audio: `Preserve ${genre} ambience, dialogue, Foley, sound effects and original music continuity.` };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const scenes = Array.isArray(body?.scenes) ? body.scenes.slice(0, 720) : [];
  if (!scenes.length) return NextResponse.json({ ok: false, error: "A movie story with scenes is required." }, { status: 400 });
  const genre = String(body?.genre || "Cinematic");
  const plan = scenes.map((scene: any, i: number) => planForScene(scene, i, scenes.length, genre));
  return NextResponse.json({ ok: true, engine: "ViralMovie AI Director", plan, summary: "Shot design, camera movement, lighting, pacing, transitions and audio continuity planned from the movie structure." });
}
