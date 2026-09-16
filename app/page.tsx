"use client";

import { useEffect, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const durations = [1, 5, 10, 20, 30, 45, 60];
const steps = [
  ["IDEA", "Your concept"], ["AI STORY", "Plot, scenes and continuity"],
  ["CHARACTERS", "Consistent characters"], ["STORYBOARD", "Automatic scene breakdown"],
  ["AI VIDEO", "Generate cinematic scenes"], ["AUDIO", "Dialogue, narration, SFX and music"],
  ["MOVIE", "Build and download the final film"]
];

type Scene = { id: number; prompt: string; durationSeconds?: number };
type Character = { id: string; name: string; role: string; prompt: string; age?: string; personality?: string; wardrobe?: string; voice?: string };
type Story = { title: string; logline: string; sceneCount: number; visibleScenes: number; scenes: Scene[]; note?: string };

export default function Home() {
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("Cinematic");
  const [minutes, setMinutes] = useState(1);
  const [aspect, setAspect] = useState("16:9");
  const [status, setStatus] = useState("Ready to create your movie.");
  const [story, setStory] = useState<Story | null>(null);
  const [active, setActive] = useState(0);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [generated, setGenerated] = useState<Record<number, boolean>>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [audio, setAudio] = useState({ dialogue: true, narration: true, music: true, sfx: true });
  const [customMusicFile, setCustomMusicFile] = useState<File | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});
  const [videoState, setVideoState] = useState<Record<number, string>>({});
  const [generatingScene, setGeneratingScene] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<Record<number, string>>({});
  const [falConfigured, setFalConfigured] = useState<boolean | null>(null);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [ownerLoggedIn, setOwnerLoggedIn] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [scenePage, setScenePage] = useState(0);
  const [posterUrl, setPosterUrl] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [trailerState, setTrailerState] = useState("READY");
  const [trailerDuration, setTrailerDuration] = useState(50);
  const [subtitleText, setSubtitleText] = useState("");
  const [productionMessage, setProductionMessage] = useState("Production extras are ready to be generated automatically.");
  const [directorPlan, setDirectorPlan] = useState<any[]>([]);
  const [directorState, setDirectorState] = useState("READY");
  const [directorMessage, setDirectorMessage] = useState("AI Director is ready to analyze your movie.");
  const [finalMovieUrl, setFinalMovieUrl] = useState("");
  const [editingState, setEditingState] = useState("READY");
  const [editingMessage, setEditingMessage] = useState("Generate at least 2 scenes, then use Auto Edit.");

  useEffect(() => {
    fetch("/api/video/health", { cache: "no-store" })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        setFalConfigured(Boolean(r.ok && d?.falConfigured));
      })
      .catch(() => setFalConfigured(false));
    fetch("/api/admin/status", { cache: "no-store" })
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        setOwnerLoggedIn(Boolean(r.ok && d?.loggedIn));
      })
      .catch(() => setOwnerLoggedIn(false));
  }, []);

  const go = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, steps.length - 1));
    setActive(safeIndex);
    setStatus(safeIndex === 0 ? "Start with your movie idea." : `${steps[safeIndex][0]} section opened.`);
    setTimeout(() => {
      try {
        const el = document.getElementById(`stage-${safeIndex}`);
        if (!el) return;
        const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 82);
        window.scrollTo({ top, behavior: "smooth" });
      } catch {}
    }, 80);
  };

  function openStoryStep() {
    if (story) {
      setActive(1);
      setStatus("AI Story opened.");
      setTimeout(() => document.getElementById("stage-1")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      return;
    }
    if (!idea.trim()) {
      setStatus("Write your movie idea first, then tap Generate Movie.");
      setActive(0);
      setTimeout(() => document.getElementById("stage-0")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      return;
    }
    void generateStory();
  }

  function openScenesStep() {
    if (!story) {
      if (!idea.trim()) {
        setStatus("Write your movie idea first, then tap Generate Movie.");
        setActive(0);
        setTimeout(() => document.getElementById("stage-0")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
        return;
      }
      setStatus("Creating the AI story first. Scenes will open when it is ready.");
      void generateStory();
      return;
    }
    setScenePage(0);
    setActive(3);
    setStatus(`${story.sceneCount} scenes are ready in your storyboard.`);
    setTimeout(() => document.getElementById("stage-3")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function generateProductionPack(movie: Story, movieIdea: string, requestedTrailerDuration = trailerDuration, sourceUrls?: Record<number, string>) {
    setProductionMessage("Creating AI poster and trailer automatically...");
    setTrailerState("SUBMITTING");
    try {
      // A trailer is assembled automatically from the finished movie shots.
      // This makes 50–60 second trailers coherent without asking the video model
      // for an unsupported long single clip.
      if (sourceUrls && Object.keys(sourceUrls).length) {
        const posterResponse = await fetch("/api/production-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: movieIdea, title: movie.title, logline: movie.logline, genre, aspect_ratio: aspect, adultConfirmed, posterOnly: true }) });
        const posterData = await posterResponse.json().catch(() => ({}));
        if (posterResponse.ok && posterData?.posterUrl) setPosterUrl(posterData.posterUrl);
        const availableTrailerScenes = movie.scenes.filter(scene => sourceUrls[scene.id]);
        const trailerCount = Math.max(3, Math.min(12, Math.ceil(requestedTrailerDuration / 5)));
        const trailerShots = Array.from({ length: Math.min(trailerCount, availableTrailerScenes.length) }, (_, i) => {
          const index = trailerCount <= 1 ? 0 : Math.round(i * (availableTrailerScenes.length - 1) / (trailerCount - 1));
          return availableTrailerScenes[index];
        }).filter(Boolean);
        if (trailerShots.length) {
          const ffmpeg = new FFmpeg();
          const coreBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
          await ffmpeg.load({
            coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm")
          });
          for (let i = 0; i < trailerShots.length; i++) {
            const proxy = `/api/video/download?url=${encodeURIComponent(sourceUrls[trailerShots[i].id])}`;
            await ffmpeg.writeFile(`trailer-${i}.mp4`, await fetchFile(proxy));
          }
          const list = trailerShots.map((_, i) => `file 'trailer-${i}.mp4'`).join("\n");
          await ffmpeg.writeFile("trailer.txt", list);
          await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "trailer.txt", "-c", "copy", "-movflags", "+faststart", "movie-trailer.mp4"]);
          const data = await ffmpeg.readFile("movie-trailer.mp4");
          const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
          const buffer = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(buffer).set(bytes);
          setTrailerUrl(URL.createObjectURL(new Blob([buffer], { type: "video/mp4" })));
          setTrailerState("READY");
          setProductionMessage(`AI poster and automatic ${trailerShots.length * 5}-second trailer assembled from the finished film.`);
          return;
        }
      }
      const r = await fetch("/api/production-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: movieIdea, title: movie.title, logline: movie.logline, genre, aspect_ratio: aspect, adultConfirmed, trailerDuration: requestedTrailerDuration, posterOnly: !sourceUrls }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) throw new Error(d?.message || "Production extras could not be started.");
      if (d.posterUrl) setPosterUrl(d.posterUrl);
      if (d.trailerRequestId) {
        let done = false;
        for (let i = 0; i < 90 && !done; i++) {
          await new Promise(res => setTimeout(res, 4000));
          const sr = await fetch("/api/production-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: d.trailerRequestId, action: "status", responseUrl: d.trailerResponseUrl, statusUrl: d.trailerStatusUrl }) });
          const sd = await sr.json().catch(() => ({}));
          const data = sd?.data || {};
          const state = String(data?.status || "").toUpperCase();
          if (state === "COMPLETED" || state === "SUCCEEDED") {
            const rr = await fetch("/api/production-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: d.trailerRequestId, action: "result", responseUrl: d.trailerResponseUrl, statusUrl: d.trailerStatusUrl }) });
            const rd = await rr.json().catch(() => ({}));
            const url = rd?.data?.video?.url || rd?.data?.video_url || rd?.data?.data?.video?.url || rd?.data?.output?.video?.url || rd?.data?.output?.url;
            if (url) { setTrailerUrl(url); setTrailerState("READY"); setProductionMessage(`AI poster and trailer teaser are ready (${requestedTrailerDuration}s target).`); done = true; }
          } else if (state === "FAILED" || state === "CANCELLED") { throw new Error("AI trailer generation failed."); }
        }
        if (!done) { setTrailerState("PROCESSING"); setProductionMessage("AI poster is ready. Trailer is still processing in the background."); }
      } else {
        setTrailerState("READY"); setProductionMessage("AI poster is ready. Trailer request was not returned.");
      }
    } catch (e) {
      setTrailerState("FAILED");
      setProductionMessage(e instanceof Error ? e.message : "Production extras failed.");
    }
  }

  async function generateSubtitlesForScene(scene: Scene, url: string) {
    try {
      const r = await fetch("/api/subtitles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio_url: url, start_seconds: (scene.id - 1) * 5 }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok && d?.srt) setSubtitleText(prev => prev ? `${prev.trim()}\n${d.srt.trim()}` : d.srt.trim());
    } catch {}
  }

  async function oneClickMovie() {
    if (!idea.trim()) { setStatus("Write your movie idea first."); go(0); return; }
    if (!adultConfirmed) {
      setActive(4);
      setStatus("Before generating, confirm the 18+ safety checkbox in Video + Voice.");
      setTimeout(() => document.getElementById("stage-4")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      return;
    }
    setAudio({ dialogue: true, narration: true, music: true, sfx: true });
    setSubtitleText("");
    setPosterUrl("");
    setTrailerUrl("");
    setStatus("ONE-CLICK MOVIE: screenplay → character memory → location continuity → shot direction → video + voice → sound design → music → subtitles → final MP4 → trailer + poster...");
    try {
      const r = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, genre, minutes }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "AI Script failed.");
      setStory(d);

      const nextCharacters: Character[] = [
        { id: "lead", name: "Lead Character", role: "Main protagonist", age: "adult", personality: "emotionally grounded, expressive, determined", wardrobe: "story-appropriate wardrobe locked for continuity", voice: "natural cinematic lead voice", prompt: "original fictional adult protagonist, realistic human features, natural skin texture, expressive eyes, consistent face and body, continuity-locked wardrobe" },
        { id: "support", name: "Supporting Character", role: "Primary supporting role", age: "adult", personality: "natural, emotionally responsive, distinctive", wardrobe: "story-appropriate wardrobe locked for continuity", voice: "natural cinematic supporting voice", prompt: "original fictional adult supporting character, realistic human features, natural skin texture, distinctive but consistent face, continuity-locked wardrobe" },
        { id: "third", name: "Supporting Cast", role: "Secondary story role", age: "adult", personality: "story-driven and consistent", wardrobe: "story-appropriate wardrobe locked for continuity", voice: "natural cinematic voice", prompt: "original fictional adult supporting cast member, realistic human features, consistent face, body and wardrobe" }
      ];
      setCharacters(nextCharacters);
      setSelectedCharacterId(nextCharacters[0].id);

      setDirectorState("ANALYZING");
      const dr = await fetch("/api/director", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: d.title, logline: d.logline, genre, scenes: d.scenes, characters: nextCharacters }) });
      const dd = await dr.json().catch(() => ({}));
      if (dr.ok && dd?.ok) setDirectorPlan(Array.isArray(dd.plan) ? dd.plan : []);
      setDirectorState("READY");

      // Generate the complete movie automatically. The individual 5-second clips remain
      // an internal production mechanism; the user does not need to open/generate them manually.
      const movieScenes: Scene[] = Array.isArray(d.scenes) ? d.scenes : [];
      setActive(4);
      setScenePage(0);
      setStatus(`ONE-CLICK MOVIE: generating the full ${minutes}-minute movie — 0/${movieScenes.length} clips...`);
      const movieUrls: Record<number, string> = {};
      for (let i = 0; i < movieScenes.length; i++) {
        const scene = movieScenes[i];
        setSelectedScene(scene);
        setStatus(`ONE-CLICK MOVIE: generating clip ${i + 1}/${movieScenes.length}...`);
        const url = await generateScene(scene);
        if (!url) throw new Error(`Movie generation stopped at clip ${i + 1}.`);
        movieUrls[scene.id] = url;
      }

      setStatus(`ONE-CLICK MOVIE: all ${movieScenes.length} clips are ready (${minutes} minute${minutes===1?"":"s"}). Starting Auto Editor...`);
      setActive(6);
      setTimeout(() => document.getElementById("stage-6")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
      await autoEditMovie(movieUrls, d);
      void generateProductionPack(d, idea, trailerDuration, movieUrls);
    } catch (e) {
      setDirectorState("FAILED");
      setStatus(e instanceof Error ? e.message : "ONE-CLICK MOVIE failed.");
    }
  }

  async function generateStory() {
    if (!idea.trim()) { setStatus("Write your movie idea first."); go(0); return; }
    setStatus("Building your movie plan...");
    try {
      const r = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea, genre, minutes }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setStory(d); setActive(1); setStatus(`Movie plan ready: ${d.sceneCount} scenes for ${minutes} minute(s).`); void generateProductionPack(d, idea);
      setTimeout(() => document.getElementById("stage-1")?.scrollIntoView({ behavior: "smooth" }), 30);
    } catch (e: unknown) { setStatus(e instanceof Error ? e.message : "Something went wrong."); }
  }

  function openCharacters() {
    const nextCharacters: Character[] = [
      { id: "maya", name: "Maya", role: "Lead Explorer", age: "28", personality: "Brave, curious, determined", wardrobe: "Cinematic explorer jacket and utility gear", voice: "Warm, confident female voice", prompt: "young female explorer, cinematic sci-fi wardrobe, determined expression, consistent appearance" },
      { id: "orion", name: "Orion", role: "AI Companion", age: "Unknown", personality: "Calm, analytical, loyal", wardrobe: "Sleek futuristic AI design", voice: "Calm synthetic voice", prompt: "sleek humanoid AI companion, subtle blue light accents, calm expression, consistent appearance" },
      { id: "guardian", name: "The Guardian", role: "Mystery", age: "Ancient", personality: "Silent, imposing, enigmatic", wardrobe: "Detailed futuristic armor", voice: "Deep cinematic voice", prompt: "ancient mysterious guardian, imposing silhouette, detailed futuristic armor, consistent appearance" }
    ];
    setCharacters(nextCharacters);
    setSelectedCharacterId(current => current && nextCharacters.some(c => c.id === current) ? current : nextCharacters[0].id);
    setActive(2);
    setStatus("Characters created. Tap a character card to select who appears in the next scene.");
    setTimeout(() => document.getElementById("stage-2")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  function openStoryboard() {
    setActive(3);
    if (!story) {
      setStatus("Generate the Movie Plan first, then create your scenes.");
    } else {
      setStatus(`${story.sceneCount} scenes are ready in your storyboard.`);
    }
    setTimeout(() => {
      const el = document.getElementById("stage-3");
      if (!el) return;
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 82), behavior: "smooth" });
    }, 60);
  }

  function openVideo() {
    setActive(4);
    setStatus(story
      ? (selectedScene ? `Scene ${selectedScene.id} is selected for video generation.` : "Select a storyboard scene to generate video.")
      : "Generate the Movie Plan first, then select a storyboard scene for AI Video.");
    setTimeout(() => {
      const el = document.getElementById("stage-4");
      if (!el) return;
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 82), behavior: "smooth" });
    }, 60);
  }

  function selectCharacter(character: Character) {
    setSelectedCharacterId(character.id);
    setStatus(`${character.name} selected — ${character.role}. This character will be included in the next generated scene.`);
  }

  function selectScene(scene: Scene) {
    setSelectedScene(scene);
    setActive(4);
    setStatus(`Scene ${scene.id} selected. You can generate the video now.`);
    setTimeout(() => document.getElementById("stage-4")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }


  function cinemaPrompt(scene: Scene) {
    const characterBible = characters.length
      ? characters.map(c => `${c.name}: ${c.role}; age ${c.age || "adult"}; personality ${c.personality}; wardrobe ${c.wardrobe}; voice ${c.voice}; visual identity: ${c.prompt}`).join("\n")
      : "Use the established fictional cast consistently from the movie idea; never replace faces or wardrobe.";
    const director = directorPlan.find((x: any) => Number(x?.sceneId) === Number(scene.id));
    const directorLine = director
      ? `DIRECTOR: ${director.shot}; ${director.camera}; ${director.lighting}; ${director.pacing}; ${director.transition}.`
      : "DIRECTOR: cinematic coverage, motivated camera movement, natural eyelines, realistic blocking and film grammar.";
    return `${scene.prompt}

CINEMA MASTER DIRECTION:
This is one continuous feature-film production, not a collection of unrelated clips. Continue directly from the previous shot and create a natural visual bridge into the next shot. Preserve exact character identity, face, hair, age, body proportions, wardrobe, accessories, props, location geography, weather, time of day, lighting direction and color grade. Characters must behave like real actors with natural eye contact, body language, walking speed, hand movement and physical interaction. Keep screen direction and spatial continuity consistent. Use realistic cinematography, physically plausible motion, natural depth of field, subtle lens characteristics, motivated lighting, production-design detail, realistic skin texture and film-quality composition. Avoid plastic/CGI-looking faces, random costume changes, teleporting, duplicated people, warped hands, floating objects, sudden location changes or unrelated events.
${directorLine}
CHARACTER BIBLE:
${characterBible}
AUDIO CONTINUITY:
Generate synchronized original dialogue/voice acting when scripted, natural room tone, ambience, Foley and effects, plus an original cinematic score that matches the movie's emotional arc. Keep every character voice and audio atmosphere consistent with the whole film. No copyrighted songs and no imitation of real people's voices.
SHOT ${scene.id}: ${scene.durationSeconds || 5} seconds. Begin exactly where the previous shot logically ends; finish on an action, look or camera position that can continue into the next shot.`;
  }

  async function generateScene(scene: Scene): Promise<string | null> {
    if (generatingScene === scene.id) return null;
    if (!adultConfirmed) { setStatus("Confirm that you are 18+ before generating a video."); return null; }
    setSelectedScene(scene); setActive(4); setGeneratingScene(scene.id);
    setVideoError(x => ({ ...x, [scene.id]: "" }));
    setVideoState(x => ({ ...x, [scene.id]: "SUBMITTING" }));
    setStatus(`Scene ${scene.id}: cinematic continuity engine → video generation...`);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      let r: Response;
      try {
        r = await fetch("/api/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: cinemaPrompt(scene), aspect_ratio: aspect, audio, adultConfirmed }), signal: controller.signal });
      } finally {
        window.clearTimeout(timeout);
      }
      const contentType = r.headers.get("content-type") || "";
      const d = contentType.includes("application/json") ? await r.json().catch(() => ({})) : { message: await r.text().catch(() => "Non-JSON response from server.") };
      if (!r.ok || !d?.ok) {
        const raw = d?.error?.message || d?.error?.detail || d?.message || (typeof d?.error === "string" ? d.error : "Video generation request was rejected.");
        setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
        setVideoError(x => ({ ...x, [scene.id]: raw }));
        setStatus(`Scene ${scene.id} error: ${raw}`);
        return null;
      }
      const rid = d.requestId || d.data?.request_id || d.data?.requestId;
      if (!rid) {
        setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
        setVideoError(x => ({ ...x, [scene.id]: "Vidu accepted the request but returned no request ID. Try again." }));
        setStatus("Vidu accepted the request but returned no request ID. Try again.");
        return null;
      }
      setGenerated(x => ({ ...x, [scene.id]: true }));
      setVideoState(x => ({ ...x, [scene.id]: "IN_QUEUE" }));
      setStatus(`Scene ${scene.id}: IN_QUEUE — AI is generating this 5-second cinematic shot with synchronized audio...`);
      return await pollScene(scene.id, rid, d.statusUrl || d.status_url || d.data?.status_url || d.data?.statusUrl, d.responseUrl || d.response_url || d.data?.response_url || d.data?.responseUrl);
    } catch (e: unknown) {
      setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
      const message = e instanceof DOMException && e.name === "AbortError" ? "The video server took too long to respond. Please try again in a moment or contact support." : e instanceof Error ? e.message : "Video request failed.";
      setVideoError(x => ({ ...x, [scene.id]: message }));
      setStatus(`Scene ${scene.id} error: ${message}`);
      return null;
    } finally {
      setGeneratingScene(current => current === scene.id ? null : current);
    }
  }

  async function pollScene(sceneId: number, rid: string, statusUrl?: string | null, responseUrl?: string | null): Promise<string | null> {
    for (let i = 0; i < 90; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 4000));
      try {
        const r = await fetch("/api/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: rid, action: "status", statusUrl: statusUrl || undefined, responseUrl: responseUrl || undefined }), cache: "no-store" });
        const contentType = r.headers.get("content-type") || "";
        const rawBody = await r.text().catch(() => "");
        let d: any = {};
        try { d = rawBody ? JSON.parse(rawBody) : {}; } catch { d = { message: rawBody }; }
        if (!r.ok || !d?.ok) {
          const raw = d?.error?.message || d?.error?.detail || (typeof d?.error === "string" ? d.error : "") || d?.message || `HTTP ${r.status} from /api/video/status`;
          const detail = [raw, d?.falStatus ? `falStatus=${d.falStatus}` : "", d?.falRequestId ? `requestId=${d.falRequestId}` : ""].filter(Boolean).join(" | ");
          setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
          setVideoError(x => ({ ...x, [sceneId]: detail }));
          setStatus(`Scene ${sceneId} status error: ${detail}`);
          return null;
        }
        const st = String(d?.data?.status || d?.data?.state || d?.data?.data?.status || d?.data?.data?.state || d?.status || d?.state || "");
        if (!st) {
          const detail = d?.data?.message || d?.data?.detail || d?.message || `HTTP ${r.status}: fal.ai returned no status`;
          setVideoState(x => ({ ...x, [sceneId]: "STATUS_UNKNOWN" }));
          setVideoError(x => ({ ...x, [sceneId]: String(detail) }));
          setStatus(`Scene ${sceneId}: status unavailable — ${String(detail)}`);
          continue;
        }
        if (st) {
          setVideoState(x => ({ ...x, [sceneId]: st }));
          setStatus(`Scene ${sceneId}: ${st}`);
        }
        if (["COMPLETED", "SUCCESS", "SUCCEEDED"].includes(st.toUpperCase())) {
          const rr = await fetch("/api/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: rid, action: "result", statusUrl: statusUrl || undefined, responseUrl: responseUrl || undefined }) });
          const rd = await rr.json().catch(() => ({}));
          if (!rr.ok || !rd?.ok) {
            const raw = rd?.error?.message || rd?.error?.detail || (typeof rd?.error === "string" ? rd.error : "") || rd?.message || "Could not retrieve the finished video.";
            setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
            setVideoError(x => ({ ...x, [sceneId]: raw }));
            setStatus(`Scene ${sceneId} result error: ${raw}`);
            return null;
          }
          const url = rd?.data?.video?.url || rd?.data?.data?.video?.url || rd?.data?.video_url || rd?.data?.videoUrl || rd?.video?.url || rd?.video_url || rd?.videoUrl || rd?.data?.url || rd?.url;
          if (url) { setVideoUrls(x => ({ ...x, [sceneId]: url })); setVideoState(x => ({ ...x, [sceneId]: "READY" })); if (audio.dialogue || audio.narration) void generateSubtitlesForScene((story?.scenes || []).find(s => s.id === sceneId) || selectedScene || { id: sceneId, durationSeconds: 5, prompt: "" } as Scene, url); setStatus(`Scene ${sceneId} is READY — audio, subtitles and continuity are being finalized automatically.`); return url; }
          else { setVideoState(x => ({ ...x, [sceneId]: "FAILED" })); setStatus("Generation finished, but Vidu returned no video URL."); }
          return null;
        }
        if (["FAILED", "ERROR", "CANCELLED"].includes(st.toUpperCase())) {
          const detail = d?.data?.error || d?.data?.detail || d?.data?.message || d?.error || "Vidu reported a generation failure.";
          const errorType = d?.data?.error_type ? ` (${d.data.error_type})` : "";
          const logs = Array.isArray(d?.data?.logs) ? d.data.logs.map((x: any) => x?.message).filter(Boolean).slice(-2).join(" | ") : "";
          setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
          setVideoError(x => ({ ...x, [sceneId]: `FAILED${errorType}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}${logs ? ` — ${logs}` : ""}` }));
          setStatus(`Scene ${sceneId} FAILED${errorType}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}${logs ? ` — ${logs}` : ""}`);
          return null;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Network error while checking video status.";
        setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
        setVideoError(x => ({ ...x, [sceneId]: message }));
        setStatus(`Scene ${sceneId} status error: ${message}`);
        return null;
      }
    }
    setVideoState(x => ({ ...x, [sceneId]: "TIMEOUT" })); setStatus("Generation is taking longer than expected.");
    return null;
  }

  async function shareVideo(platform: string, sceneId: number) {
    const url = videoUrls[sceneId]; if (!url) { setStatus("Generate the video first."); return; }
    if (platform === "share" && navigator.share) { try { await navigator.share({ title: "ViralMovie AI", text: "My AI movie scene 🎬", url }); } catch {} return; }
    const u = encodeURIComponent(url);
    const links: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      instagram: "https://www.instagram.com/",
      tiktok: "https://www.tiktok.com/upload?lang=en",
      youtube: "https://studio.youtube.com/"
    };
    if (platform === "share") { try { await navigator.clipboard.writeText(url); setStatus("Video link copied."); } catch { setStatus("Copy failed. Use the video URL from the preview."); } return; }
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }



  async function runAIDirector() {
    if (!story) { setDirectorMessage("Create the movie story first."); go(1); return; }
    setDirectorState("ANALYZING"); setDirectorMessage("AI Director is analyzing story beats, camera language, lighting, pacing and continuity...");
    try {
      const r = await fetch("/api/director", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: story.title, logline: story.logline, genre, scenes: story.scenes, characters }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) throw new Error(d?.error || "AI Director could not analyze the movie.");
      setDirectorPlan(Array.isArray(d.plan) ? d.plan : []);
      setDirectorState("READY");
      setDirectorMessage(`AI Director created ${d.plan?.length || 0} cinematic scene directions.`);
      setActive(6);
      setTimeout(() => document.getElementById("stage-6")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    } catch (e) {
      setDirectorState("FAILED"); setDirectorMessage(e instanceof Error ? e.message : "AI Director failed.");
    }
  }

  async function autoEditMovie(overrideUrls?: Record<number, string>, overrideStory?: Story) {
    const activeStory = overrideStory || story;
    const activeUrls = overrideUrls || videoUrls;
    const scenes = (activeStory?.scenes || []).filter(s => activeUrls[s.id]);
    if (scenes.length < 2) { setEditingMessage("Generate the complete movie first; final assembly is automatic."); setEditingState("WAITING"); return; }
    setEditingState("LOADING"); setEditingMessage(`Preparing ${scenes.length} scenes for automatic editing...`);
    try {
      const ffmpeg = new FFmpeg();
      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm")
      });
      // Long-film safety: process small batches so a 60-minute production does not
      // require hundreds of source files to stay in memory at once.
      const batchSize = 24;
      const batchFiles: string[] = [];
      for (let start = 0; start < scenes.length; start += batchSize) {
        const batch = scenes.slice(start, start + batchSize);
        const batchIndex = Math.floor(start / batchSize);
        for (let j = 0; j < batch.length; j++) {
          const scene = batch[j];
          const globalIndex = start + j;
          setEditingMessage(`Auto Edit: importing shot ${globalIndex + 1}/${scenes.length}...`);
          const proxy = `/api/video/download?url=${encodeURIComponent(activeUrls[scene.id])}`;
          await ffmpeg.writeFile(`scene-${globalIndex}.mp4`, await fetchFile(proxy));
        }
        const list = batch.map((_, j) => `file 'scene-${start + j}.mp4'`).join("\n");
        await ffmpeg.writeFile(`batch-${batchIndex}.txt`, list);
        await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", `batch-${batchIndex}.txt`, "-c", "copy", `batch-${batchIndex}.mp4`]);
        batchFiles.push(`batch-${batchIndex}.mp4`);
        for (let j = 0; j < batch.length; j++) { try { await ffmpeg.deleteFile(`scene-${start + j}.mp4`); } catch {} }
        try { await ffmpeg.deleteFile(`batch-${batchIndex}.txt`); } catch {}
      }
      const finalList = batchFiles.map(file => `file '${file}'`).join("\n");
      await ffmpeg.writeFile("final-batches.txt", finalList);
      setEditingState("RENDERING"); setEditingMessage(`AI Director is assembling ${batchFiles.length} production reels into the final movie...`);
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "final-batches.txt", "-c", "copy", "-movflags", "+faststart", "movie-final-base.mp4"]);
      if (customMusicFile) {
        const musicName = `custom-music${customMusicFile.name.toLowerCase().endsWith(".wav") ? ".wav" : customMusicFile.name.toLowerCase().endsWith(".m4a") ? ".m4a" : ".mp3"}`;
        await ffmpeg.writeFile(musicName, await fetchFile(customMusicFile));
        setEditingMessage("Adding your selected music track to the final film...");
        await ffmpeg.exec(["-stream_loop", "-1", "-i", musicName, "-i", "movie-final-base.mp4", "-filter_complex", "[0:a]volume=0.28[music];[1:a][music]amix=inputs=2:duration=first:dropout_transition=2[a]", "-map", "1:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "movie-final.mp4"]);
        try { await ffmpeg.deleteFile(musicName); } catch {}
        try { await ffmpeg.deleteFile("movie-final-base.mp4"); } catch {}
      } else {
        await ffmpeg.exec(["-i", "movie-final-base.mp4", "-c", "copy", "-movflags", "+faststart", "movie-final.mp4"]);
        try { await ffmpeg.deleteFile("movie-final-base.mp4"); } catch {}
      }
      const data = await ffmpeg.readFile("movie-final.mp4");
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const blob = new Blob([buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setFinalMovieUrl(url);
      setEditingState("READY"); setEditingMessage(`FINAL FILM READY: ${scenes.length} cinematic shots assembled automatically into one MP4 (${activeStory ? ((Number(minutes)||1)) : 1}-minute target).`);
    } catch (e) {
      setEditingState("FAILED"); setEditingMessage(e instanceof Error ? `Auto Edit failed: ${e.message}` : "Auto Edit failed in this browser. Try fewer scenes or use a modern browser.");
    }
  }

  function downloadFinalMovie() {
    if (!finalMovieUrl) { setEditingMessage("Create the final MP4 with Auto Edit first."); return; }
    const a = document.createElement("a"); a.href = finalMovieUrl; a.download = `${(story?.title || "ViralMovie").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase() || "viralmovie"}-final.mp4`; a.click();
  }

  async function publishMovie() {
    if (!selectedScene || !readyUrl) { setPublishMessage("Generate a finished scene first."); return; }
    const title = story?.title || `ViralMovie Scene ${selectedScene.id}`;
    const description = story?.logline || selectedScene.prompt;
    const r = await fetch("/api/admin/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, prompt: selectedScene.prompt, videoUrl: readyUrl, posterUrl, trailerUrl }) });
    const d = await r.json().catch(() => ({}));
    setPublishMessage(r.ok ? `Published: ${d.movie?.title || title}` : (d.error || "Publish failed."));
  }

  function downloadVideo(sceneId: number) {
    const url = videoUrls[sceneId];
    if (!url) { setStatus("Video is not ready yet."); return; }
    window.location.href = `/api/video/download?url=${encodeURIComponent(url)}`;
  }

  function previewVideo(sceneId: number) {
    const url = videoUrls[sceneId];
    const scene = story?.scenes.find(s => s.id === sceneId) || selectedScene;
    if (!url || !scene) { setStatus("Generate the scene first. Preview will appear here automatically."); return; }
    setSelectedScene(scene);
    setActive(4);
    setStatus(`Preview ready for Scene ${sceneId}. Press play to watch.`);
    setTimeout(() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  }

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId) || null;


  const readyUrl = selectedScene ? videoUrls[selectedScene.id] : "";

  return <main className="app-shell">
    <nav className="topbar"><div className="brand"><div className="brand-icon">🎬</div><div><strong>ViralMovie <span>AI</span></strong><small>Turn Your Ideas Into Viral Movies</small></div></div><div className="top-actions"><a href="/movies" className="top-link">🎞️ Movies</a><a href="/credits" className="top-link">🪙 Credits</a><a href="/owner" className="top-link">👑 Owner</a><button>👑 Go Premium</button><div className="profile">👤 Account⌄</div></div></nav>
    <div className="layout">
      <aside className="sidebar"><div className="side-links">
        {["⌂ Dashboard", "🎬 Create Movie", "▣ Create Scene", "▶ My Videos", "☆ Viral Templates", "↗ Social Media", "◉ Credits & Plans", "⚙ Settings"].map((x, i) => <button key={x} className={i === 1 ? "side-link active" : "side-link"} onClick={() => i === 1 ? go(0) : setStatus(`${x.replace(/^\S+\s/, "")} is coming next.`)}>{x}</button>)}
      </div><div className="premium-card"><div className="crown">👑</div><h3>Go Premium</h3><p>More videos, more features, more viral content!</p><button>Upgrade Now</button><div className="film-art">🎥</div></div></aside>
      <section className="content">
        <div className="hero-image"><img src="/hero-dashboard.png" alt="ViralMovie AI cinematic studio"/><div className="hero-overlay"></div><div className="hero-copy"><div className="hero-kicker">AI FILM STUDIO</div><h1>AI Makes <span>Films</span> Online</h1><p>Turn one idea into a cinematic movie with AI — story, characters, scenes, video and social sharing.</p><button type="button" className="hero-cta" onClick={() => go(0)}>✦ Start Creating</button></div></div>
        <div className="feature-command card">
          <div className="feature-command-head"><div><div className="section-kicker">VIRALMOVIE AI · FULL PRODUCTION</div><h2>🎬 ONE-CLICK MOVIE</h2><p>One workflow for the complete creative pipeline. Build the story first, keep characters and continuity consistent, then finish with editing, poster and trailer.</p></div><button type="button" className="one-click-button" onClick={oneClickMovie}>🚀 ONE-CLICK MOVIE</button></div>
          <div className="feature-order">
            {[
              ["01", "🧠 Auto Script", "Idea → plot, scenes and story beats", () => generateStory()],
              ["02", "🎭 Character Memory", "Persistent character identity, wardrobe and voice", () => openCharacters()],
              ["03", "🔗 Auto Continuity", "Characters, locations, props and story logic stay consistent", () => setStatus("Auto Continuity is built into the story and scene prompts.")],
              ["04", "🎨 Auto Visual Style", "Cinematic look, lighting and visual language", () => runAIDirector()],
              ["05", "🎥 Auto Camera", "Shot type and camera movement for every scene", () => runAIDirector()],
              ["06", "✂️ Auto Editor", "Combine completed scenes into the movie timeline", () => { setActive(6); document.getElementById("stage-6")?.scrollIntoView({ behavior: "smooth" }); }],
              ["07", "🖼️ Auto Poster", "Generate a cinematic movie poster", () => { if (story) void generateProductionPack(story, idea, trailerDuration); else setStatus("Create the story first, then generate the poster."); }],
              ["08", "🎬 Auto Trailer", "50–60 second cinematic teaser from finished shots", () => { if (story && Object.keys(videoUrls).length) void generateProductionPack(story, idea, trailerDuration, videoUrls); else setStatus("Generate the Full Movie first; the trailer is assembled automatically from the finished film shots."); }]
            ].map(([num, title, desc, action]: any) => <button type="button" className="feature-step" key={num} onClick={action}><span>{num}</span><div><b>{title}</b><small>{desc}</small></div><strong>→</strong></button>)}
          </div>
        </div>
        <div className="workspace">
          <div className="main-column">
            <section className="card create-card" id="stage-0">
              <div className="title-row"><div className="title-icon">🎬</div><div><div className="section-kicker">STEP 1 — YOUR IDEA</div><h2>Create Film</h2><p>Build your movie step by step. Start with one idea and ViralMovie turns it into a production.</p></div></div>
              <div className="create-step"><span>01</span><div><b>What movie do you want to create?</b><textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="Write your movie idea...

Example: A young astronaut lands on Mars and discovers a mysterious underground city..."/></div></div>
              <div className="create-step"><span>02</span><div><b>Choose your style</b><div className="style-grid">{["🎬 Cinematic","🎭 Drama","😂 Comedy","👽 Sci-Fi","😱 Horror","❤️ Romance","🔥 Action"].map(x => { const value=x.replace(/^\S+\s/,''); return <button type="button" key={x} className={genre===value ? "style-choice selected" : "style-choice"} onClick={()=>setGenre(value)}>{x}</button> })}</div></div></div>
              <div className="create-step"><span>03</span><div><b>Characters</b><p className="muted">Create a Character Bible with consistent visual identity, voice and personality.</p><button type="button" className="secondary" onClick={openCharacters}>✦ {characters.length ? "Edit Character Bible" : "Create Character Bible"}</button></div></div>
              <button type="button" className="create-step create-step-button" onClick={openStoryStep}>
                <span>04</span><div><b>Story</b><p className="muted">AI builds the plot, scenes and continuity from your idea.</p></div><strong>→</strong>
              </button>
              <button type="button" className="create-step create-step-button" onClick={openScenesStep}>
                <span>05</span><div><b>Scenes</b><p className="muted">Your story becomes an automatic cinema production plan.</p></div><strong>→</strong>
              </button>
              <div className="create-step"><span>06</span><div><b>Generate Movie</b><div className="field-row"><select aria-label="Movie format" value={aspect} onChange={e => setAspect(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select><label style={{display:"flex",alignItems:"center",gap:8}}><span className="muted">Minutes</span><input aria-label="Movie duration in minutes" type="number" min={1} max={60} step={1} value={minutes} onChange={e=>{const n=Math.min(60,Math.max(1,Number(e.target.value)||1));setMinutes(n)}} style={{width:82}} /></label><div className="duration-pills compact">{durations.map(x=><button type="button" key={x} className={minutes===x?"selected":""} onClick={()=>setMinutes(x)}>{x===60?"60m":`${x}m`}</button>)}</div></div><small className="muted">Final movie duration: {minutes} minute{minutes===1?"":"s"} • scenes are generated automatically and merged into ONE final MP4 • 5 seconds per internal clip</small></div></div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:8}}><button type="button" className="generate" onClick={(e) => { e.preventDefault(); void oneClickMovie(); }}>✦ Generate Full Movie</button><button type="button" className="secondary" onClick={generateStory}>📝 Build Story Plan</button></div><div className="status-line">{status}</div>
            </section>

            <section className="card" id="stage-1"><div className="section-head"><h2>⚡ AI Story</h2><span>{story ? "READY" : "WAITING"}</span></div>{story ? <><h3>{story.title}</h3><p className="muted">{story.logline}</p><div className="info-box">{story.sceneCount} planned scenes • {minutes * 60} seconds • 5 seconds per scene</div></> : <div className="info-box">Press Generate Full Movie to create the complete film automatically.</div>}</section>

            <section className="card" id="stage-2"><div className="section-head"><h2>👤 Character Bible</h2><span>{selectedCharacter ? `SELECTED: ${selectedCharacter.name.toUpperCase()}` : "CONSISTENCY"}</span></div><p className="muted">Keep the same character identity across 20, 50 or 100 scenes.</p><button type="button" className="secondary" onClick={openCharacters}>✦ {characters.length ? "Refresh Character Bible" : "Create Character Bible"}</button>{characters.length > 0 && <div className="character-bible-grid">{characters.map(c=><button type="button" className={`character character-bible ${selectedCharacterId===c.id?"character-selected":""}`} key={c.id} onClick={()=>selectCharacter(c)}><div className="avatar">◉</div><b>{c.name}</b><span className="character-role">{c.role}</span><small>Age: {c.age || "—"}</small><small>Personality: {c.personality || "—"}</small><small>Wardrobe: {c.wardrobe || "—"}</small><small>Voice: {c.voice || "—"}</small><em>🔒 Character Consistency</em></button>)}</div>}</section>

            <section className="card" id="stage-3"><div className="section-head"><h2>▣ Automatic Production Plan</h2><span>{story?.sceneCount || 0} INTERNAL SHOTS</span></div>{!story ? <div className="info-box">Generate the Movie first.</div> : <>
              <button type="button" className="secondary scene-create" onClick={() => { setScenePage(0); openStoryboard(); }}>✦ Refresh Production Plan</button>
              <div className="info-box"><b>Automatic movie mode:</b> {story.sceneCount} internal scenes are planned for {minutes} minute(s). You do not need to generate or merge them manually — Generate Full Movie processes them and creates one final MP4 automatically.</div>
              <div className="scene-grid">{story.scenes.slice(scenePage * 12, scenePage * 12 + 12).map(scene => <div className={`scene-card ${selectedScene?.id === scene.id ? "scene-selected" : ""}`} key={scene.id}><div className="scene-thumb">🎞️<small>#{String(scene.id).padStart(2,"0")}</small></div><div className="scene-main"><b>Scene {String(scene.id).padStart(2,"0")}</b><span className="scene-title">{scene.prompt.split(".")[0]}</span><div className="scene-meta"><span>⏱ 5 sec</span><span>👤 {selectedCharacter?.name || "Characters"}</span><span>🎙 Dialogue</span><span>🎵 Music</span></div><div className="scene-controls"><button type="button" onClick={() => { selectScene(scene); setStatus(`Shot ${scene.id} is part of the automatic film pipeline. You do not need to generate or merge it manually.`); }}>🎬 View</button></div></div></div>)}</div>
              <button type="button" className="secondary" onClick={()=>setStatus("New scene slot added to the movie plan.")}>＋ Add Production Beat</button><div className="scene-pagination"><button type="button" className="secondary" disabled={scenePage === 0} onClick={() => setScenePage(p => Math.max(0, p - 1))}>← Previous</button><span>Scenes {scenePage * 12 + 1}–{Math.min((scenePage + 1) * 12, story.sceneCount)} of {story.sceneCount}</span><button type="button" className="secondary" disabled={(scenePage + 1) * 12 >= story.sceneCount} onClick={() => setScenePage(p => p + 1)}>Next →</button></div>
            </> }</section>

            <section className="card production-order" id="production-order">
  <div className="section-head"><h2>🎬 AI FILM PRODUCTION ORDER</h2><span>MASTER PIPELINE</span></div>
  <p className="muted">ViralMovie follows this order automatically. You create the idea once; the production stages run in sequence and the final result is one movie.</p>
  <div className="production-order-grid">
    <div className="production-step"><b>01 · AI SCREENWRITER</b><span>Story, acts, scenes, dialogue and emotional arc</span></div>
    <div className="production-step"><b>02 · CHARACTER MEMORY</b><span>Same fictional faces, wardrobe, voices and personalities</span></div>
    <div className="production-step"><b>03 · LOCATION + CONTINUITY</b><span>Same geography, props, weather, lighting and screen direction</span></div>
    <div className="production-step"><b>04 · AI SHOT DIRECTOR</b><span>Shot type, lens language, camera movement, lighting and pacing</span></div>
    <div className="production-step"><b>05 · VIDEO + VOICE</b><span>Cinematic shots with consistent character dialogue and narration</span></div>
    <div className="production-step"><b>06 · SOUND DESIGN</b><span>Room tone, ambience, Foley and synchronized effects</span></div>
    <div className="production-step"><b>07 · MUSIC</b><span>Original score matched to the emotional arc or your selected music</span></div>
    <div className="production-step"><b>08 · SUBTITLES</b><span>Automatic speech-to-text cues and downloadable SRT</span></div>
    <div className="production-step"><b>09 · FINAL MOVIE</b><span>All internal shots are assembled automatically into one MP4</span></div>
    <div className="production-step"><b>10 · TRAILER + POSTER</b><span>Automatic cinematic trailer and movie artwork</span></div>
  </div>
  <div className="info-box"><b>ONE-CLICK MODE:</b> no manual scene merging. Internal 5-second shots are only production units; you receive one finished movie.</div>
</section>

            <section className="card" id="stage-4"><div className="section-head"><h2>🎥 05 · Video + Voice</h2><span>{selectedScene && videoState[selectedScene.id] ? videoState[selectedScene.id] : falConfigured === false ? "FAL OFFLINE" : "AI READY"}</span></div>{selectedScene ? <><div className="info-box"><b>Scene {selectedScene.id}</b><br/><span>{selectedScene.prompt}</span>{selectedCharacter && <><br/><small className="character-context">Character: {selectedCharacter.name} — {selectedCharacter.role}</small></>}</div><label className="safety-check"><input type="checkbox" checked={adultConfirmed} onChange={e => setAdultConfirmed(e.target.checked)} /> I confirm I am 18+ and agree not to create pornography, sexual content involving minors, non-consensual intimate imagery, realistic impersonations/deepfakes of real people, terrorism, scams, extreme gore, or other prohibited content.</label>{falConfigured === false && <div className="error-box"><b>Vidu connection is not ready.</b><br/>The video service is temporarily unavailable. Please try again in a moment.</div>}{videoError[selectedScene.id] && <div className="error-box"><b>Generation error</b><br/>{videoError[selectedScene.id]}</div>}<button type="button" className="generate" disabled={generatingScene === selectedScene.id} onClick={() => generateScene(selectedScene)}>{generatingScene === selectedScene.id ? `⏳ Generating Scene ${selectedScene.id}...` : generated[selectedScene.id] ? "↻ Generate Again" : "✦ Generate Scene"}</button>{readyUrl && <div className="video-box"><video controls playsInline src={readyUrl}/><div className="video-actions"><button className="download" onClick={() => downloadVideo(selectedScene.id)}>⇩ Download Video</button><button className="preview" onClick={() => previewVideo(selectedScene.id)}>◉ Preview</button></div><div className="share-title">Send your video to</div><div className="socials"><button onClick={() => shareVideo("facebook", selectedScene.id)}>f <span>Facebook</span></button><button onClick={() => shareVideo("instagram", selectedScene.id)}>◎ <span>Instagram</span></button><button onClick={() => shareVideo("tiktok", selectedScene.id)}>♪ <span>TikTok</span></button><button onClick={() => shareVideo("youtube", selectedScene.id)}>▶ <span>YouTube</span></button><button onClick={() => shareVideo("share", selectedScene.id)}>↗ <span>Share</span></button></div><p className="share-note">For Instagram, TikTok and YouTube, the platform may ask you to upload the downloaded MP4.</p><div className="publish-box"><h3>👑 Owner Admin · Publish</h3><p>Only the authenticated site owner can publish a finished, reviewed movie to the public Movies catalog. Publishing is blocked for everyone else.</p>{!ownerLoggedIn ? <a className="owner-login" href="/owner" style={{textDecoration:"none",display:"block",textAlign:"center"}}>👑 Open Owner Control Center</a> : <button className="publish" onClick={publishMovie}>🚀 Publish to Movies</button>}<small>{ownerLoggedIn ? publishMessage : "Owner publishing is managed separately from the public studio."}</small></div></div>}</> : <div className="info-box">Choose a scene from Storyboard first.</div>}</section>

            <section className="card" id="stage-5"><div className="section-head"><h2>🔊 06 · Sound Design + 07 · Music</h2><span>AUTOMATIC</span></div><div className="info-box"><b>05 Voice + Dialogue</b> → <b>06 Sound Design</b> → <b>07 Music</b>. These layers are one continuous soundtrack; the controls below configure the same movie audio pipeline.</div><div className="audio-row">{(["dialogue","narration","sfx","music"] as const).map(k => <button key={k} type="button" onClick={() => setAudio(a => ({ ...a, [k]: !a[k] }))}>{audio[k] ? "✓" : "○"} {k.toUpperCase()}</button>)}</div><div className="music-upload"><label><b>🎵 Add your own music</b><input type="file" accept="audio/*" onChange={e => setCustomMusicFile(e.target.files?.[0] || null)} /></label>{customMusicFile && <small>Selected: {customMusicFile.name} · mixed automatically at a cinematic background level.</small>}</div><p className="muted">Every shot receives automatic cinema audio: character dialogue and voice acting, narration when appropriate, original background score, ambience, Foley and realistic sound effects. Audio continuity follows the movie's characters and story. You can keep all four enabled for the most cinematic result.</p></section>

            <section className="card production-pack" id="production-pack"><div className="section-head"><h2>💬 08 · Subtitles → 10 · Trailer + Poster</h2><span>{trailerState}</span></div><p className="muted">Subtitles belong to stage 08. After the final movie is assembled, stage 10 prepares the cinematic trailer and poster. The controls below manage those outputs without creating a second production pipeline.</p><div className="production-grid"><div className="production-item"><b>🖼️ Poster</b>{posterUrl ? <img src={posterUrl} alt="AI movie poster"/> : <span>Generating automatically…</span>}</div><div className="production-item"><b>🎞️ Trailer</b><div className="trailer-options">{[50,60].map(x=><button type="button" key={x} className={trailerDuration===x?"selected":""} onClick={()=>setTrailerDuration(x)}>{x}s</button>)}</div>{trailerUrl ? <video controls playsInline src={trailerUrl}/> : <span>{trailerState === "PROCESSING" ? `Processing your ${trailerDuration}s trailer in the background…` : `AI trailer will be assembled automatically from the finished film · ${trailerDuration}s`}</span>}<button type="button" className="secondary" onClick={()=>{ if (!story) { setStatus("Create the movie story first."); return; } void generateProductionPack(story, idea, trailerDuration, Object.keys(videoUrls).length ? videoUrls : undefined); }}>🎬 Generate Automatically</button></div><div className="production-item"><b>💬 Subtitles</b><span>{subtitleText ? `${subtitleText.split("\\n").filter(Boolean).length} subtitle cues ready.` : "Generated automatically from completed scene audio and collected into the final movie subtitle track."}</span>{subtitleText && <button type="button" className="secondary" onClick={() => { const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([subtitleText+"\\n"],{type:"text/plain"})); a.download="viralmovie-subtitles.srt"; a.click(); }}>⇩ Download .SRT</button>}</div></div><div className="info-box">{productionMessage}</div></section>

            <section className="card" id="stage-6"><div className="section-head"><h2>🎞️ 09 · Final Movie</h2><span>{editingState === "READY" ? "READY" : editingState}</span></div><div className="director-tools"><div className="director-card"><div className="director-title"><span>🤖</span><div><b>AI DIRECTOR · STAGE 04</b><small>Review the shot plan created for the movie; this does not create a second director pipeline.</small></div></div><button type="button" className="secondary" onClick={runAIDirector}>{directorState === "ANALYZING" ? "⏳ AI Director analyzing..." : "🤖 REVIEW AI DIRECTOR"}</button><p>{directorMessage}</p>{directorPlan.length > 0 && <div className="director-plan">{directorPlan.slice(0,12).map((x:any)=><div key={x.sceneId}><b>Scene {x.sceneId}</b><span>{x.shot} · {x.camera} · {x.lighting} · {x.pacing}</span></div>)}</div>}</div><div className="director-card auto-edit-card"><div className="director-title"><span>✂️</span><div><b>FINAL RENDER · STAGE 09</b><small>Scenes → transitions → one final MP4; this is the final assembly step.</small></div></div><button type="button" className="generate" onClick={() => void autoEditMovie()} disabled={editingState === "LOADING" || editingState === "RENDERING"}>{editingState === "LOADING" ? "⏳ Loading editor..." : editingState === "RENDERING" ? "🎬 Rendering final MP4..." : "✂️ RENDER FINAL MOVIE"}</button><p>{editingMessage}</p>{finalMovieUrl && <><video className="final-movie-player" controls playsInline src={finalMovieUrl}/><button type="button" className="download" onClick={downloadFinalMovie}>⇩ Download Final MP4</button></>}</div></div><div className="project-map"><span>🎬 Film</span><span>🔊 Voice + Sound</span><span>💬 Subtitles</span><span>🎞 Final Movie</span><span>🎞 Trailer</span><span>🖼 Poster</span><span>🌐 Publish</span></div><div className="timeline-label">MOVIE TIMELINE</div><div className="timeline"><div className="timeline-track">{(story?.scenes || []).slice(0,24).map(scene=><button key={scene.id} type="button" className={selectedScene?.id===scene.id?"timeline-scene selected":"timeline-scene"} onClick={()=>{selectScene(scene);go(4)}}>Scene {String(scene.id).padStart(2,"0")}</button>)}</div></div><div className="movie-tile"><strong>{minutes===60?"1h":`${minutes} min`}</strong><span>{story?.sceneCount || 0} scenes planned • {Object.keys(generated).length} generated • {Object.keys(videoUrls).length} ready</span></div>{selectedScene && videoError[selectedScene.id] && <div className="error-box"><b>Last video error:</b> {videoError[selectedScene.id]}</div>}<p className="muted">AI Director creates the shot plan. One-Click Movie automatically generates every internal shot, audio, subtitles and production asset, then assembles everything into one final MP4. No manual scene merging is required. Long films are processed in small internal batches to reduce memory pressure.</p></section>

          </div>

          <aside className="right-column" id="preview"><section className="card preview-card"><div className="section-head"><h2>▶ Movie Preview</h2><span>LIVE</span></div>{readyUrl ? <video id="movie-preview-video" controls playsInline preload="metadata" src={readyUrl}/> : <div className="preview-empty"><img src="/hero-dashboard.png" alt="Movie preview"/><span className="play">▶</span><strong>{selectedScene ? `Scene ${selectedScene.id} — press Generate Scene below` : "Select a scene to create your preview"}</strong></div>}<div className="preview-actions">{selectedScene && !readyUrl && <button type="button" className="preview" disabled={generatingScene === selectedScene.id} onClick={() => generateScene(selectedScene)}>{generatingScene === selectedScene.id ? "⏳ Generating..." : "✦ Generate Scene"}</button>}<button className="download" disabled={!readyUrl} onClick={() => selectedScene && downloadVideo(selectedScene.id)}>⇩ Download Video</button><button className="preview" disabled={!readyUrl} onClick={() => selectedScene && previewVideo(selectedScene.id)}>◉ Preview</button></div>{readyUrl && selectedScene && <><div className="share-title">Send your video to</div><div className="socials"><button onClick={() => shareVideo("facebook", selectedScene.id)}>f <span>Facebook</span></button><button onClick={() => shareVideo("instagram", selectedScene.id)}>◎ <span>Instagram</span></button><button onClick={() => shareVideo("tiktok", selectedScene.id)}>♪ <span>TikTok</span></button><button onClick={() => shareVideo("youtube", selectedScene.id)}>▶ <span>YouTube</span></button><button onClick={() => shareVideo("share", selectedScene.id)}>↗ <span>Share</span></button></div><p className="share-note">Social buttons open the platform upload/share page. Download the MP4 first when a platform requires a file upload.</p></>}</section>
            <section className="card pipeline"><div className="section-head"><h2>Movie Pipeline</h2><span>V4</span></div><div className="steps">{steps.map(([name, desc], i) => <button type="button" key={name} className={`step ${active === i ? "active" : ""} ${i < active ? "done" : ""}`} onClick={() => {
          if (i === 2) openCharacters();
          else if (i === 3) openStoryboard();
          else if (i === 4) openVideo();
          else go(i);
        }}><b>{i + 1}. {name}</b><span>{i < active ? "✓" : i === active ? "ACTIVE" : "OPEN"}</span><small>{desc}</small></button>)}</div></section>
            <section className="card my-movies"><div className="section-head"><h2>🎞️ My Movies</h2><span>View all →</span></div><div className="movie-item"><div className="mini-art">🌌</div><div><b>{story?.title || "Your next movie"}</b><small>{story ? `${minutes}:00 • Project ready` : "Start a new project"}</small></div><button onClick={() => go(0)}>Play</button></div></section>
          </aside>
        </div>
      </section>
    </div>
    <footer>ViralMovie AI • AI Makes Films Online • 18+ • Safety-first • Secure server-side rendering. <span className="footer-links"><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/acceptable-use">Acceptable Use</a> · <a href="/security">Security</a></span></footer>
  </main>;
}
