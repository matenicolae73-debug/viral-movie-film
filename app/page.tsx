"use client";

import { useEffect, useState } from "react";

const durations = [1, 5, 10, 20, 30, 45, 60];
const steps = [
  ["IDEA", "Your concept"], ["AI STORY", "Plot, scenes and continuity"],
  ["CHARACTERS", "Consistent characters"], ["STORYBOARD", "Automatic scene breakdown"],
  ["AI VIDEO", "Generate cinematic scenes"], ["AUDIO", "Dialogue, narration, SFX and music"],
  ["MOVIE", "Build the final timeline"], ["EXPORT", "Download and share"]
];

type Scene = { id: number; prompt: string };
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
    setActive(index);
    setStatus(index === 0 ? "Start with your movie idea." : `${steps[index][0]} section opened.`);
    setTimeout(() => {
      const el = document.getElementById(`stage-${index}`);
      if (!el) return;
      const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 82);
      window.scrollTo({ top, behavior: "smooth" });
    }, 60);
  };

  async function generateProductionPack(movie: Story, movieIdea: string) {
    setProductionMessage("Creating AI poster and trailer automatically...");
    setTrailerState("SUBMITTING");
    try {
      const r = await fetch("/api/production-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: movieIdea, title: movie.title, logline: movie.logline, genre, aspect_ratio: aspect, adultConfirmed }) });
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
            if (url) { setTrailerUrl(url); setTrailerState("READY"); setProductionMessage("AI poster and trailer are ready."); done = true; }
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

  async function generateTestFilm() {
    const testIdea = idea.trim() || "A mysterious night in a futuristic city where a young explorer discovers a glowing portal and must decide whether to enter.";
    const testMinutes = 1;
    setIdea(testIdea);
    setMinutes(testMinutes);
    setStatus("Test Film: building a 1-minute movie plan...");
    try {
      const r = await fetch("/api/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: testIdea, genre, minutes: testMinutes }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setStory(d);
      void generateProductionPack(d, testIdea);
      setScenePage(0);
      const firstScene = d.scenes?.[0];
      if (!firstScene) throw new Error("The test movie plan did not contain a scene.");
      setSelectedScene(firstScene);
      setActive(4);
      setStatus("Test Film ready: generating Scene 1 of 12 with AI video + synchronized audio...");
      setTimeout(() => document.getElementById("stage-4")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      void generateScene(firstScene);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Test Film generation failed.");
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

  async function generateScene(scene: Scene) {
    if (generatingScene === scene.id) return;
    if (!adultConfirmed) { setStatus("Confirm that you are 18+ before generating a video."); return; }
    setSelectedScene(scene); setActive(4); setGeneratingScene(scene.id);
    setVideoError(x => ({ ...x, [scene.id]: "" }));
    setVideoState(x => ({ ...x, [scene.id]: "SUBMITTING" }));
    setStatus(`Scene ${scene.id}: connecting to Vidu Q3 Turbo...`);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 30000);
      let r: Response;
      try {
        r = await fetch("/api/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `${scene.prompt}\n\nCharacter continuity: ${selectedCharacter ? selectedCharacter.prompt : "Use the established movie characters consistently."}`, aspect_ratio: aspect, audio, adultConfirmed }), signal: controller.signal });
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
        return;
      }
      const rid = d.requestId || d.data?.request_id || d.data?.requestId;
      if (!rid) {
        setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
        setVideoError(x => ({ ...x, [scene.id]: "Vidu accepted the request but returned no request ID. Try again." }));
        setStatus("Vidu accepted the request but returned no request ID. Try again.");
        return;
      }
      setGenerated(x => ({ ...x, [scene.id]: true }));
      setVideoState(x => ({ ...x, [scene.id]: "IN_QUEUE" }));
      setStatus(`Scene ${scene.id}: IN_QUEUE — Vidu is generating your 5-second AI video with synchronized audio...`);
      await pollScene(scene.id, rid);
    } catch (e: unknown) {
      setVideoState(x => ({ ...x, [scene.id]: "FAILED" }));
      const message = e instanceof DOMException && e.name === "AbortError" ? "The video server took too long to respond. Please try again in a moment or contact support." : e instanceof Error ? e.message : "Video request failed.";
      setVideoError(x => ({ ...x, [scene.id]: message }));
      setStatus(`Scene ${scene.id} error: ${message}`);
    } finally {
      setGeneratingScene(current => current === scene.id ? null : current);
    }
  }

  async function pollScene(sceneId: number, rid: string) {
    for (let i = 0; i < 90; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 4000));
      try {
        const r = await fetch("/api/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: rid, action: "status" }), cache: "no-store" });
        const contentType = r.headers.get("content-type") || "";
        const d = contentType.includes("application/json") ? await r.json().catch(() => ({})) : { message: await r.text().catch(() => "Non-JSON response from server.") };
        if (!r.ok || !d?.ok) {
          const raw = d?.error?.message || d?.error?.detail || d?.message || "Status check failed.";
          setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
          setVideoError(x => ({ ...x, [sceneId]: raw }));
          setStatus(`Scene ${sceneId} status error: ${raw}`);
          return;
        }
        const st = String(d?.data?.status || d?.data?.state || d?.status || "");
        if (st) {
          setVideoState(x => ({ ...x, [sceneId]: st }));
          setStatus(`Scene ${sceneId}: ${st}`);
        }
        if (["COMPLETED", "SUCCESS", "SUCCEEDED"].includes(st.toUpperCase())) {
          const rr = await fetch("/api/video/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: rid, action: "result" }) });
          const rd = await rr.json().catch(() => ({}));
          if (!rr.ok || !rd?.ok) {
            const raw = rd?.error?.message || rd?.error?.detail || rd?.message || "Could not retrieve the finished video.";
            setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
            setVideoError(x => ({ ...x, [sceneId]: raw }));
            setStatus(`Scene ${sceneId} result error: ${raw}`);
            return;
          }
          const url = rd?.data?.video?.url || rd?.data?.data?.video?.url || rd?.video?.url;
          if (url) { setVideoUrls(x => ({ ...x, [sceneId]: url })); setVideoState(x => ({ ...x, [sceneId]: "READY" })); setStatus(`Scene ${sceneId} is READY — Preview, Download and Share.`); }
          else { setVideoState(x => ({ ...x, [sceneId]: "FAILED" })); setStatus("Generation finished, but Vidu returned no video URL."); }
          return;
        }
        if (["FAILED", "ERROR", "CANCELLED"].includes(st.toUpperCase())) {
          const detail = d?.data?.error || d?.data?.detail || d?.data?.message || d?.error || "Vidu reported a generation failure.";
          const errorType = d?.data?.error_type ? ` (${d.data.error_type})` : "";
          const logs = Array.isArray(d?.data?.logs) ? d.data.logs.map((x: any) => x?.message).filter(Boolean).slice(-2).join(" | ") : "";
          setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
          setVideoError(x => ({ ...x, [sceneId]: `FAILED${errorType}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}${logs ? ` — ${logs}` : ""}` }));
          setStatus(`Scene ${sceneId} FAILED${errorType}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}${logs ? ` — ${logs}` : ""}`);
          return;
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Network error while checking video status.";
        setVideoState(x => ({ ...x, [sceneId]: "FAILED" }));
        setVideoError(x => ({ ...x, [sceneId]: message }));
        setStatus(`Scene ${sceneId} status error: ${message}`);
        return;
      }
    }
    setVideoState(x => ({ ...x, [sceneId]: "TIMEOUT" })); setStatus("Generation is taking longer than expected.");
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



  async function publishMovie() {
    if (!selectedScene || !readyUrl) { setPublishMessage("Generate a finished scene first."); return; }
    const title = story?.title || `ViralMovie Scene ${selectedScene.id}`;
    const description = story?.logline || selectedScene.prompt;
    const r = await fetch("/api/admin/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, prompt: selectedScene.prompt, videoUrl: readyUrl }) });
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

  function exportProject() {
    const payload = { product: "ViralMovie AI", idea, genre, durationMinutes: minutes, aspectRatio: aspect, story, characters, selectedCharacter, generatedScenes: generated, audio, videoUrls, posterUrl, trailerUrl, subtitles: subtitleText };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "viralmovie-project.json"; a.click(); URL.revokeObjectURL(url); setStatus("Project exported successfully.");
  }

  const readyUrl = selectedScene ? videoUrls[selectedScene.id] : "";

  return <main className="app-shell">
    <nav className="topbar"><div className="brand"><div className="brand-icon">🎬</div><div><strong>ViralMovie <span>AI</span></strong><small>Turn Your Ideas Into Viral Movies</small></div></div><div className="top-actions"><a href="/movies" className="top-link">🎞️ Movies</a><a href="/credits" className="top-link">🪙 Credits</a><a href="/owner" className="top-link">👑 Owner</a><button>👑 Go Premium</button><div className="profile">👤 Account⌄</div></div></nav>
    <div className="layout">
      <aside className="sidebar"><div className="side-links">
        {["⌂ Dashboard", "🎬 Create Movie", "▣ Create Scene", "▶ My Videos", "☆ Viral Templates", "↗ Social Media", "◉ Credits & Plans", "⚙ Settings"].map((x, i) => <button key={x} className={i === 1 ? "side-link active" : "side-link"} onClick={() => i === 1 ? go(0) : setStatus(`${x.replace(/^\S+\s/, "")} is coming next.`)}>{x}</button>)}
      </div><div className="premium-card"><div className="crown">👑</div><h3>Go Premium</h3><p>More videos, more features, more viral content!</p><button>Upgrade Now</button><div className="film-art">🎥</div></div></aside>
      <section className="content">
        <div className="hero-image"><img src="/hero-dashboard.png" alt="ViralMovie AI cinematic studio"/><div className="hero-overlay"></div><div className="hero-copy"><div className="hero-kicker">AI FILM STUDIO</div><h1>AI Makes <span>Films</span> Online</h1><p>Turn one idea into a cinematic movie with AI — story, characters, scenes, video and social sharing.</p><button type="button" className="hero-cta" onClick={() => go(0)}>✦ Start Creating</button></div></div>
        <div className="workspace">
          <div className="main-column">
            <section className="card create-card" id="stage-0">
              <div className="title-row"><div className="title-icon">🎬</div><div><div className="section-kicker">STEP 1 — YOUR IDEA</div><h2>Create Film</h2><p>Build your movie step by step. Start with one idea and ViralMovie turns it into a production.</p></div></div>
              <div className="create-step"><span>01</span><div><b>What movie do you want to create?</b><textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="Write your movie idea...

Example: A young astronaut lands on Mars and discovers a mysterious underground city..."/></div></div>
              <div className="create-step"><span>02</span><div><b>Choose your style</b><div className="style-grid">{["🎬 Cinematic","🎭 Drama","😂 Comedy","👽 Sci-Fi","😱 Horror","❤️ Romance","🔥 Action"].map(x => { const value=x.replace(/^\S+\s/,''); return <button type="button" key={x} className={genre===value ? "style-choice selected" : "style-choice"} onClick={()=>setGenre(value)}>{x}</button> })}</div></div></div>
              <div className="create-step"><span>03</span><div><b>Characters</b><p className="muted">Create a Character Bible with consistent visual identity, voice and personality.</p><button type="button" className="secondary" onClick={openCharacters}>✦ {characters.length ? "Edit Character Bible" : "Create Character Bible"}</button></div></div>
              <div className="create-step"><span>04</span><div><b>Story</b><p className="muted">AI builds the plot, scenes and continuity from your idea.</p></div></div>
              <div className="create-step"><span>05</span><div><b>Scenes</b><p className="muted">Your story becomes an editable storyboard and movie timeline.</p></div></div>
              <div className="create-step"><span>06</span><div><b>Generate Movie</b><div className="field-row"><select aria-label="Movie format" value={aspect} onChange={e => setAspect(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select><div className="duration-pills compact">{durations.map(x=><button type="button" key={x} className={minutes===x?"selected":""} onClick={()=>setMinutes(x)}>{x===60?"1h":`${x}m`}</button>)}</div></div></div></div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:8}}><button type="button" className="generate" onClick={generateStory}>✦ Generate Movie</button><button type="button" className="secondary" onClick={generateTestFilm}>🧪 Quick Test</button></div><div className="status-line">{status}</div>
            </section>

            <section className="card" id="stage-1"><div className="section-head"><h2>⚡ AI Story</h2><span>{story ? "READY" : "WAITING"}</span></div>{story ? <><h3>{story.title}</h3><p className="muted">{story.logline}</p><div className="info-box">{story.sceneCount} planned scenes • {minutes * 60} seconds • 5 seconds per scene</div></> : <div className="info-box">Press Generate Movie to create the story structure.</div>}</section>

            <section className="card" id="stage-2"><div className="section-head"><h2>👤 Character Bible</h2><span>{selectedCharacter ? `SELECTED: ${selectedCharacter.name.toUpperCase()}` : "CONSISTENCY"}</span></div><p className="muted">Keep the same character identity across 20, 50 or 100 scenes.</p><button type="button" className="secondary" onClick={openCharacters}>✦ {characters.length ? "Refresh Character Bible" : "Create Character Bible"}</button>{characters.length > 0 && <div className="character-bible-grid">{characters.map(c=><button type="button" className={`character character-bible ${selectedCharacterId===c.id?"character-selected":""}`} key={c.id} onClick={()=>selectCharacter(c)}><div className="avatar">◉</div><b>{c.name}</b><span className="character-role">{c.role}</span><small>Age: {c.age || "—"}</small><small>Personality: {c.personality || "—"}</small><small>Wardrobe: {c.wardrobe || "—"}</small><small>Voice: {c.voice || "—"}</small><em>🔒 Character Consistency</em></button>)}</div>}</section>

            <section className="card" id="stage-3"><div className="section-head"><h2>▣ Storyboard</h2><span>{story?.sceneCount || 0} SCENES • 5 SEC EACH</span></div>{!story ? <div className="info-box">Generate the Movie first.</div> : <>
              <button type="button" className="secondary scene-create" onClick={() => { setScenePage(0); openStoryboard(); }}>✦ Create / Refresh Scenes</button>
              <div className="info-box"><b>Long-film mode:</b> {story.sceneCount} scenes are planned for {minutes} minute(s). The storyboard shows 12 scenes at a time so long movies remain fast to navigate.</div>
              <div className="scene-grid">{story.scenes.slice(scenePage * 12, scenePage * 12 + 12).map(scene => <div className={`scene-card ${selectedScene?.id === scene.id ? "scene-selected" : ""}`} key={scene.id}><div className="scene-thumb">🎞️<small>#{String(scene.id).padStart(2,"0")}</small></div><div className="scene-main"><b>Scene {String(scene.id).padStart(2,"0")}</b><span className="scene-title">{scene.prompt.split(".")[0]}</span><div className="scene-meta"><span>⏱ 5 sec</span><span>👤 {selectedCharacter?.name || "Characters"}</span><span>🎙 Dialogue</span><span>🎵 Music</span></div><div className="scene-controls"><button type="button" onClick={() => { selectScene(scene); if (!generated[scene.id]) void generateScene(scene); }}>{generated[scene.id] ? "✓ Preview" : "🎥 Generate"}</button><button type="button" onClick={() => setStatus(`Scene ${scene.id} selected for editing.`)}>✏️ Edit</button><button type="button" onClick={() => { selectScene(scene); void generateScene(scene); }}>🔄 Regenerate</button><button type="button" onClick={() => setStatus(`Scene ${scene.id} moved up.`)}>⬆️</button><button type="button" onClick={() => setStatus(`Scene ${scene.id} moved down.`)}>⬇️</button></div></div></div>)}</div>
              <button type="button" className="secondary" onClick={()=>setStatus("New scene slot added to the movie plan.")}>＋ Add Scene</button><div className="scene-pagination"><button type="button" className="secondary" disabled={scenePage === 0} onClick={() => setScenePage(p => Math.max(0, p - 1))}>← Previous</button><span>Scenes {scenePage * 12 + 1}–{Math.min((scenePage + 1) * 12, story.sceneCount)} of {story.sceneCount}</span><button type="button" className="secondary" disabled={(scenePage + 1) * 12 >= story.sceneCount} onClick={() => setScenePage(p => p + 1)}>Next →</button></div>
            </> }</section>

            <section className="card" id="stage-4"><div className="section-head"><h2>🎥 AI Video + Sound</h2><span>{selectedScene && videoState[selectedScene.id] ? videoState[selectedScene.id] : falConfigured === false ? "FAL OFFLINE" : "AI READY"}</span></div>{selectedScene ? <><div className="info-box"><b>Scene {selectedScene.id}</b><br/><span>{selectedScene.prompt}</span>{selectedCharacter && <><br/><small className="character-context">Character: {selectedCharacter.name} — {selectedCharacter.role}</small></>}</div><label className="safety-check"><input type="checkbox" checked={adultConfirmed} onChange={e => setAdultConfirmed(e.target.checked)} /> I confirm I am 18+ and agree not to create pornography, sexual content involving minors, non-consensual intimate imagery, realistic impersonations/deepfakes of real people, terrorism, scams, extreme gore, or other prohibited content.</label>{falConfigured === false && <div className="error-box"><b>Vidu connection is not ready.</b><br/>The video service is temporarily unavailable. Please try again in a moment.</div>}{videoError[selectedScene.id] && <div className="error-box"><b>Generation error</b><br/>{videoError[selectedScene.id]}</div>}<button type="button" className="generate" disabled={generatingScene === selectedScene.id} onClick={() => generateScene(selectedScene)}>{generatingScene === selectedScene.id ? `⏳ Generating Scene ${selectedScene.id}...` : generated[selectedScene.id] ? "↻ Generate Again" : "✦ Generate Scene"}</button>{readyUrl && <div className="video-box"><video controls playsInline src={readyUrl}/><div className="video-actions"><button className="download" onClick={() => downloadVideo(selectedScene.id)}>⇩ Download Video</button><button className="preview" onClick={() => previewVideo(selectedScene.id)}>◉ Preview</button></div><div className="share-title">Send your video to</div><div className="socials"><button onClick={() => shareVideo("facebook", selectedScene.id)}>f <span>Facebook</span></button><button onClick={() => shareVideo("instagram", selectedScene.id)}>◎ <span>Instagram</span></button><button onClick={() => shareVideo("tiktok", selectedScene.id)}>♪ <span>TikTok</span></button><button onClick={() => shareVideo("youtube", selectedScene.id)}>▶ <span>YouTube</span></button><button onClick={() => shareVideo("share", selectedScene.id)}>↗ <span>Share</span></button></div><p className="share-note">For Instagram, TikTok and YouTube, the platform may ask you to upload the downloaded MP4.</p><div className="publish-box"><h3>👑 Owner Admin · Publish</h3><p>Only the authenticated site owner can publish a finished, reviewed movie to the public Movies catalog. Publishing is blocked for everyone else.</p>{!ownerLoggedIn ? <a className="owner-login" href="/owner" style={{textDecoration:"none",display:"block",textAlign:"center"}}>👑 Open Owner Control Center</a> : <button className="publish" onClick={publishMovie}>🚀 Publish to Movies</button>}<small>{ownerLoggedIn ? publishMessage : "Owner publishing is managed separately from the public studio."}</small></div></div>}</> : <div className="info-box">Choose a scene from Storyboard first.</div>}</section>

            <section className="card" id="stage-5"><div className="section-head"><h2>🔊 AI Audio</h2><span>GENERATED</span></div><div className="audio-row">{(["dialogue","narration","sfx","music"] as const).map(k => <button key={k} onClick={() => setAudio(a => ({ ...a, [k]: !a[k] }))}>{audio[k] ? "✓" : "○"} {k.toUpperCase()}</button>)}</div><p className="muted">Every generated scene uses Vidu Q3 direct audio-video generation. The AI creates synchronized dialogue/voice acting, narration when appropriate, music, ambience, Foley and sound effects according to the selected controls.</p></section>

            <section className="card production-pack" id="production-pack"><div className="section-head"><h2>🎬 AI Production Pack</h2><span>{trailerState}</span></div><p className="muted">When a movie is created, ViralMovie automatically prepares a cinematic poster, trailer teaser and subtitle track as scenes are generated.</p><div className="production-grid"><div className="production-item"><b>🖼️ Poster</b>{posterUrl ? <img src={posterUrl} alt="AI movie poster"/> : <span>Generating automatically…</span>}</div><div className="production-item"><b>🎞️ Trailer</b><div className="trailer-options">{[15,30,50,60].map(x=><button type="button" key={x} className={trailerDuration===x?"selected":""} onClick={()=>setTrailerDuration(x)}>{x}s</button>)}</div>{trailerUrl ? <video controls playsInline src={trailerUrl}/> : <span>{trailerState === "PROCESSING" ? `Processing your ${trailerDuration}s trailer in the background…` : `AI trailer ready to generate automatically · ${trailerDuration}s`}</span>}<button type="button" className="secondary" onClick={()=>setStatus(`Automatic ${trailerDuration}-second trailer selected.`)}>🎬 Generate Automatically</button></div><div className="production-item"><b>💬 Subtitles</b><span>{subtitleText ? `${subtitleText.split("\\n").filter(Boolean).length} subtitle cues ready.` : "Generated automatically after each completed scene."}</span>{subtitleText && <button type="button" className="secondary" onClick={() => { const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([subtitleText+"\\n"],{type:"text/plain"})); a.download="viralmovie-subtitles.srt"; a.click(); }}>⇩ Download .SRT</button>}</div></div><div className="info-box">{productionMessage}</div></section>

            <section className="card" id="stage-6"><div className="section-head"><h2>🎞️ Movie Timeline</h2><span>MY PROJECT</span></div><div className="project-map"><span>🎬 Film</span><span>🎞 Trailer</span><span>🔊 Audio</span><span>💬 Subtitles</span><span>🖼 Poster</span><span>🌐 Publish</span></div><div className="timeline-label">MOVIE TIMELINE</div><div className="timeline"><div className="timeline-track">{(story?.scenes || []).slice(0,24).map(scene=><button key={scene.id} type="button" className={selectedScene?.id===scene.id?"timeline-scene selected":"timeline-scene"} onClick={()=>{selectScene(scene);go(4)}}>Scene {String(scene.id).padStart(2,"0")}</button>)}</div></div><div className="movie-tile"><strong>{minutes===60?"1h":`${minutes} min`}</strong><span>{story?.sceneCount || 0} scenes planned • {Object.keys(generated).length} generated</span></div>{selectedScene && videoError[selectedScene.id] && <div className="error-box"><b>Last video error:</b> {videoError[selectedScene.id]}</div>}<p className="muted">Your movie is organized as a real production timeline. Generate, review and regenerate scenes before the final render.</p></section>

            <section className="card" id="stage-7"><div className="section-head"><h2>⇩ Export</h2><span>SHARE</span></div><button className="generate" onClick={exportProject}>Export Project</button></section>
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
