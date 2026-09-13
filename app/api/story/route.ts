import { NextResponse } from "next/server";

export const runtime = "nodejs";

function clampText(value: unknown, max = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const idea = clampText(b?.idea);
  const genre = clampText(b?.genre || "Cinematic", 60);
  const minutes = Number(b?.minutes || 1);

  if (!idea) return NextResponse.json({ error: "Idea is required." }, { status: 400 });

  const safeMinutes = Math.min(60, Math.max(1, minutes));
  const sceneCount = Math.max(12, Math.round(safeMinutes * 12));
  const visibleScenes = Math.min(sceneCount, 120);

  const scenes = Array.from({ length: visibleScenes }, (_, i) => {
    const n = i + 1;
    const beat =
      n === 1 ? "opening and visual hook" :
      n === visibleScenes ? "climax and emotional ending" :
      n % 4 === 0 ? "turning point and rising tension" :
      n % 3 === 0 ? "character decision and discovery" :
      "story progression and cinematic action";
    return {
      id: n,
      prompt: `Cinematic ${genre.toLowerCase()} scene ${n}: ${idea}. Focus on ${beat}. Maintain exact visual continuity, recurring characters, wardrobe, location, lighting and camera language.`,
      subtitle: `Scene ${n}: ${beat}.`,
      dialogue: n % 3 === 0 ? `We have to keep moving. This changes everything.` : ""
    };
  });

  return NextResponse.json({
    ok: true,
    demo: true,
    title: "ViralMovie Project",
    logline: `A ${genre.toLowerCase()} movie built from: ${idea}`,
    sceneCount,
    visibleScenes,
    scenes,
    note: sceneCount > visibleScenes
      ? `The full plan contains ${sceneCount} scenes. This build shows the first ${visibleScenes}; long-film rendering should be done in batches.`
      : "Scene plan ready."
  });
}
