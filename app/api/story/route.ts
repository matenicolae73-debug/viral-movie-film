import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const idea = String(b?.idea || "").trim();
  const genre = String(b?.genre || "Cinematic");
  const minutes = Number(b?.minutes || 1);

  if (!idea) return NextResponse.json({ error: "Idea is required." }, { status: 400 });

  const safeMinutes = Math.min(60, Math.max(1, minutes));
  const sceneCount = Math.max(12, Math.round(safeMinutes * 12));
  const sample = Math.min(sceneCount, 120);

  const scenes = Array.from({ length: sample }, (_, i) => ({
    id: i + 1,
    prompt: `Cinematic ${genre.toLowerCase()} scene ${i + 1}: ${idea}. Maintain visual continuity, consistent characters, realistic motion, dramatic lighting, film-quality composition.`
  }));

  return NextResponse.json({
    ok: true,
    demo: true,
    title: "ViralMovie Project",
    logline: `A ${genre.toLowerCase()} movie built from: ${idea}`,
    sceneCount,
    visibleScenes: sample,
    scenes,
    note: sceneCount > sample
      ? `The full plan contains ${sceneCount} scenes. The first ${sample} are shown in this test interface.`
      : "Scene plan ready."
  });
}