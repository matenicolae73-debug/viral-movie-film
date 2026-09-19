"use client";

import { useEffect, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const durations = [2, 5, 10, 20, 30, 45, 60];

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

  // MODIFICAT: minim 2 secunde
  const [durationSeconds, setDurationSeconds] = useState(2);

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
  const [subtitleText, setSubtitleText] = useState("");
  const [finalMovieUrl, setFinalMovieUrl] = useState("");
  const [editingState, setEditingState] = useState("READY");
  const [editingMessage, setEditingMessage] = useState("Generate one continuous video directly from your prompt.");

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
    setStatus(`${story.sceneCount} continuous video is ready.`);

    setTimeout(() => document.getElementById("stage-3")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function generateSubtitlesForScene(scene: Scene, url: string) {
    try {
      const r = await fetch("/api/subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_url: url,
          start_seconds: (scene.id - 1) * (scene.durationSeconds || 8)
        })
      });

      const d = await r.json().catch(() => ({}));

      if (r.ok && d?.ok && d?.srt) {
        setSubtitleText(prev =>
          prev ? `${prev.trim()}\n${d.srt.trim()}` : d.srt.trim()
        );
      }
    } catch {}
  }

  async function oneClickMovie() {
    if (!idea.trim()) {
      setStatus("Write your movie idea first.");
      go(0);
      return;
    }

    if (!adultConfirmed) {
      setStatus("Confirm 18+ safety before starting the One-Click Movie.");
      go(0);
      return;
    }

    setAudio({
      dialogue: true,
      narration: true,
      music: true,
      sfx: true
    });

    setSubtitleText("");

    setStatus(
      "ONE-CLICK MOVIE: story → consistent characters → continuous cinematic shots → audio → subtitles → one final MP4..."
    );

    try {
      const r = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          genre,
          durationSeconds
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d?.error || "AI Script failed.");
      }

      setStory(d);

      const movieScene: Scene =
        Array.isArray(d.scenes) && d.scenes[0]
          ? d.scenes[0]
          : {
              id: 1,
              durationSeconds,
              prompt: idea
            };

      setActive(4);
      setScenePage(0);
      setSelectedScene(movieScene);

      setStatus(
        `GENERATING ONE CONTINUOUS VIDEO: ${durationSeconds} second${durationSeconds === 1 ? "" : "s"}...`
      );

      const url = await generateScene(movieScene);

      if (!url) {
        throw new Error("Video generation failed.");
      }

      setFinalMovieUrl(url);
      setEditingState("READY");

      setEditingMessage(
        `VIDEO READY: one continuous ${durationSeconds}-second video. No scene merging was used.`
      );

      setActive(6);

      setTimeout(
        () =>
          document
            .getElementById("stage-6")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        30
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "ONE-CLICK MOVIE failed.");
    }
  }

  async function generateStory() {
    if (!idea.trim()) {
      setStatus("Write your movie idea first.");
      go(0);
      return;
    }

    setStatus("Building your movie plan...");

    try {
      const r = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          genre,
          durationSeconds
        })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.error);
      }

      setStory(d);
      setActive(1);

      setStatus(
        `Movie plan ready: 1 continuous video of ${durationSeconds} second${durationSeconds === 1 ? "" : "s"}.`
      );

      setTimeout(
        () =>
          document
            .getElementById("stage-1")
            ?.scrollIntoView({ behavior: "smooth" }),
        30
      );
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  function openCharacters() {
    const nextCharacters: Character[] = [
      {
        id: "maya",
        name: "Maya",
        role: "Lead Explorer",
        age: "28",
        personality: "Brave, curious, determined",
        wardrobe: "Cinematic explorer jacket and utility gear",
        voice: "Warm, confident female voice",
        prompt: "young female explorer, cinematic sci-fi wardrobe, determined expression, consistent appearance"
      },
      {
        id: "orion",
        name: "Orion",
        role: "AI Companion",
        age: "Unknown",
        personality: "Calm, analytical, loyal",
        wardrobe: "Sleek futuristic AI design",
        voice: "Calm synthetic voice",
        prompt: "sleek humanoid AI companion, subtle blue light accents, calm expression, consistent appearance"
      },
      {
        id: "guardian",
        name: "The Guardian",
        role: "Mystery",
        age: "Ancient",
        personality: "Silent, imposing, enigmatic",
        wardrobe: "Detailed futuristic armor",
        voice: "Deep cinematic voice",
        prompt: "ancient mysterious guardian, imposing silhouette, detailed futuristic armor, consistent appearance"
      }
    ];

    setCharacters(nextCharacters);

    setSelectedCharacterId(current =>
      current && nextCharacters.some(c => c.id === current)
        ? current
        : nextCharacters[0].id
    );

    setActive(2);
    setStatus(
      "Characters created. Tap a character card to select who appears in the next scene."
    );

    setTimeout(
      () =>
        document
          .getElementById("stage-2")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      30
    );
  }

  function openStoryboard() {
    setActive(3);

    if (!story) {
      setStatus("Generate the Movie Plan first, then create your scenes.");
    } else {
      setStatus(`${story.sceneCount} continuous video is ready.`);
    }

    setTimeout(() => {
      const el = document.getElementById("stage-3");

      if (!el) return;

      window.scrollTo({
        top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 82),
        behavior: "smooth"
      });
    }, 60);
  }

  function openVideo() {
    setActive(4);

    setStatus(
      story
        ? selectedScene
          ? `Scene ${selectedScene.id} is selected for video generation.`
          : "Select a storyboard scene to generate video."
        : "Generate the Movie Plan first, then select a storyboard scene for AI Video."
    );

    setTimeout(() => {
      const el = document.getElementById("stage-4");

      if (!el) return;

      window.scrollTo({
        top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 82),
        behavior: "smooth"
      });
    }, 60);
  }

  function selectCharacter(character: Character) {
    setSelectedCharacterId(character.id);

    setStatus(
      `${character.name} selected — ${character.role}. This character will be included in the next generated scene.`
    );
  }

  function selectScene(scene: Scene) {
    setSelectedScene(scene);
    setActive(4);
    setStatus(`Scene ${scene.id} selected. You can generate the video now.`);

    setTimeout(
      () =>
        document
          .getElementById("stage-4")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      30
    );
  }

  function cinemaPrompt(scene: Scene) {
    const characterBible = characters.length
      ? characters
          .map(
            c =>
              `${c.name}: ${c.role}; age ${c.age || "adult"}; personality ${c.personality}; wardrobe ${c.wardrobe}; voice ${c.voice}; visual identity: ${c.prompt}`
          )
          .join("\n")
      : "Use the established fictional cast consistently from the movie idea; never replace faces or wardrobe.";

    return `${scene.prompt}

CINEMA MASTER DIRECTION:
This is one continuous feature-film production, not a collection of unrelated clips. Continue directly from the previous shot and create a natural visual bridge into the next shot. Preserve exact character identity, face, hair, age, body proportions, wardrobe, accessories, props, location geography, weather, time of day, lighting direction and color grade. Characters must behave like real actors with natural eye contact, body language, walking speed, hand movement and physical interaction. Keep screen direction and spatial continuity consistent. Use realistic cinematography, physically plausible motion, natural depth of field, subtle lens characteristics, motivated lighting, production-design detail, realistic skin texture and film-quality composition. Avoid plastic/CGI-looking faces, random costume changes, teleporting, duplicated people, warped hands, floating objects, sudden location changes or unrelated events.

CHARACTER BIBLE:
${characterBible}

AUDIO CONTINUITY:
Generate synchronized original dialogue/voice acting when scripted, natural room tone, ambience, Foley and effects, plus an original cinematic score that matches the movie's emotional arc. Keep every character voice and audio atmosphere consistent with the whole film. No copyrighted songs and no imitation of real people's voices.

ONE CONTINUOUS VIDEO: ${scene.durationSeconds || durationSeconds} seconds total. No cuts to separate scenes, no scene changes and no internal shot list. The entire requested action must play as one uninterrupted cinematic take.`;
  }

  async function generateScene(scene: Scene): Promise<string | null> {
    if (generatingScene === scene.id) return null;

    if (!adultConfirmed) {
      setStatus("Confirm that you are 18+ before generating a video.");
      return null;
    }

    setSelectedScene(scene);
    setActive(4);
    setGeneratingScene(scene.id);

    setVideoError(x => ({
      ...x,
      [scene.id]: ""
    }));

    setVideoState(x => ({
      ...x,
      [scene.id]: "SUBMITTING"
    }));

    setStatus(
      `ONE CONTINUOUS VIDEO: ${scene.durationSeconds || durationSeconds} second${(scene.durationSeconds || durationSeconds) === 1 ? "" : "s"} → video generation...`
    );

    try {
      const controller = new AbortController();

      const timeout = window.setTimeout(
        () => controller.abort(),
        30000
      );

      let r: Response;

      try {
        r = await fetch("/api/video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: cinemaPrompt(scene),
            aspect_ratio: aspect,
            audio,
            adultConfirmed,
            durationSeconds: scene.durationSeconds || durationSeconds
          }),
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeout);
      }

      const contentType = r.headers.get("content-type") || "";

      const d = contentType.includes("application/json")
        ? await r.json().catch(() => ({}))
        : {
            message: await r
              .text()
              .catch(() => "Non-JSON response from server.")
          };

      if (!r.ok || !d?.ok) {
        const raw =
          d?.error?.message ||
          d?.error?.detail ||
          d?.message ||
          (typeof d?.error === "string"
            ? d.error
            : "Video generation request was rejected.");

        setVideoState(x => ({
          ...x,
          [scene.id]: "FAILED"
        }));

        setVideoError(x => ({
          ...x,
          [scene.id]: raw
        }));

        setStatus(`Scene ${scene.id} error: ${raw}`);

        return null;
      }

      const rid =
        d.requestId ||
        d.data?.request_id ||
        d.data?.requestId;

      if (!rid) {
        setVideoState(x => ({
          ...x,
          [scene.id]: "FAILED"
        }));

        setVideoError(x => ({
          ...x,
          [scene.id]:
            "The video service accepted the request but returned no request ID. Try again."
        }));

        setStatus(
          "The video service accepted the request but returned no request ID. Try again."
        );

        return null;
      }

      setGenerated(x => ({
        ...x,
        [scene.id]: true
      }));

      setVideoState(x => ({
        ...x,
        [scene.id]: "IN_QUEUE"
      }));

      setStatus(
        `ONE CONTINUOUS VIDEO: IN_QUEUE — AI is generating the ${scene.durationSeconds || durationSeconds}-second video with synchronized audio...`
      );

      return await pollScene(
        scene.id,
        rid,
        d.statusUrl ||
          d.status_url ||
          d.data?.status_url ||
          d.data?.statusUrl,
        d.responseUrl ||
          d.response_url ||
          d.data?.response_url ||
          d.data?.responseUrl
      );
    } catch (e: unknown) {
      setVideoState(x => ({
        ...x,
        [scene.id]: "FAILED"
      }));

      const message =
        e instanceof DOMException && e.name === "AbortError"
          ? "The video server took too long to respond. Please try again in a moment or contact support."
          : e instanceof Error
          ? e.message
          : "Video request failed.";

      setVideoError(x => ({
        ...x,
        [scene.id]: message
      }));

      setStatus(`Video error: ${message}`);

      return null;
    } finally {
      setGeneratingScene(current =>
        current === scene.id ? null : current
      );
    }
  }

  async function pollScene(
    sceneId: number,
    rid: string,
    statusUrl?: string | null,
    responseUrl?: string | null
  ): Promise<string | null> {
    for (let i = 0; i < 90; i++) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, 4000));
      }

      try {
        const r = await fetch("/api/video/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requestId: rid,
            action: "status",
            statusUrl: statusUrl || undefined,
            responseUrl: responseUrl || undefined
          }),
          cache: "no-store"
        });

        const contentType =
          r.headers.get("content-type") || "";

        const rawBody = await r.text().catch(() => "");

        let d: any = {};

        try {
          d = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          d = {
            message: rawBody
          };
        }

        if (!r.ok || !d?.ok) {
          const raw =
            d?.error?.message ||
            d?.error?.detail ||
            (typeof d?.error === "string"
              ? d.error
              : "") ||
            d?.message ||
            `HTTP ${r.status} from /api/video/status`;

          const detail = [
            raw,
            d?.falStatus
              ? `falStatus=${d.falStatus}`
              : "",
            d?.falRequestId
              ? `requestId=${d.falRequestId}`
              : ""
          ]
            .filter(Boolean)
            .join(" | ");

          setVideoState(x => ({
            ...x,
            [sceneId]: "FAILED"
          }));

          setVideoError(x => ({
            ...x,
            [sceneId]: detail
          }));

          setStatus(`Video status error: ${detail}`);

          return null;
        }

        const st = String(
          d?.data?.status ||
            d?.data?.state ||
            d?.data?.data?.status ||
            d?.data?.data?.state ||
            d?.status ||
            d?.state ||
            ""
        );

        if (!st) {
          const detail =
            d?.data?.message ||
            d?.data?.detail ||
            d?.message ||
            `HTTP ${r.status}: the video service returned no status`;

          setVideoState(x => ({
            ...x,
            [sceneId]: "STATUS_UNKNOWN"
          }));

          setVideoError(x => ({
            ...x,
            [sceneId]: String(detail)
          }));

          setStatus(
            `Video status unavailable — ${String(detail)}`
          );

          continue;
        }

        setVideoState(x => ({
          ...x,
          [sceneId]: st
        }));

        setStatus(`Video status: ${st}`);

        if (
          ["COMPLETED", "SUCCESS", "SUCCEEDED"].includes(
            st.toUpperCase()
          )
        ) {
          const rr = await fetch("/api/video/status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              requestId: rid,
              action: "result",
              statusUrl: statusUrl || undefined,
              responseUrl: responseUrl || undefined
            })
          });

          const rd = await rr.json().catch(() => ({}));

          if (!rr.ok || !rd?.ok) {
            const raw =
              rd?.error?.message ||
              rd?.error?.detail ||
              (typeof rd?.error === "string"
                ? rd.error
                : "") ||
              rd?.message ||
              "Could not retrieve the finished video.";

            setVideoState(x => ({
              ...x,
              [sceneId]: "FAILED"
            }));

            setVideoError(x => ({
              ...x,
              [sceneId]: raw
            }));

            setStatus(`Video result error: ${raw}`);

            return null;
          }

          const url =
            rd?.data?.video?.url ||
            rd?.data?.data?.video?.url ||
            rd?.data?.video_url ||
            rd?.data?.videoUrl ||
            rd?.video?.url ||
            rd?.video_url ||
            rd?.videoUrl ||
            rd?.data?.url ||
            rd?.url;

          if (url) {
            setVideoUrls(x => ({
              ...x,
              [sceneId]: url
            }));

            setVideoState(x => ({
              ...x,
              [sceneId]: "READY"
            }));

            if (audio.dialogue || audio.narration) {
              void generateSubtitlesForScene(
                (story?.scenes || []).find(
                  s => s.id === sceneId
                ) ||
                  selectedScene || {
                    id: sceneId,
                    durationSeconds,
                    prompt: ""
                  } as Scene,
                url
              );
            }

            setStatus(
              "ONE CONTINUOUS VIDEO is READY — audio and subtitles are being finalized automatically."
            );

            return url;
          } else {
            setVideoState(x => ({
              ...x,
              [sceneId]: "FAILED"
            }));

            setStatus(
              "Generation finished, but The video service returned no video URL."
            );
          }

          return null;
        }

        if (
          ["FAILED", "ERROR", "CANCELLED"].includes(
            st.toUpperCase()
          )
        ) {
          const detail =
            d?.data?.error ||
            d?.data?.detail ||
            d?.data?.message ||
            d?.error ||
            "The video service reported a generation failure.";

          const errorType = d?.data?.error_type
            ? ` (${d.data.error_type})`
            : "";

          const logs = Array.isArray(d?.data?.logs)
            ? d.data.logs
                .map((x: any) => x?.message)
                .filter(Boolean)
                .slice(-2)
                .join(" | ")
            : "";

          setVideoState(x => ({
            ...x,
            [sceneId]: "FAILED"
          }));

          setVideoError(x => ({
            ...x,
            [sceneId]: `FAILED${errorType}: ${
              typeof detail === "string"
                ? detail
                : JSON.stringify(detail)
            }${logs ? ` — ${logs}` : ""}`
          }));

          setStatus(
            `Video FAILED${errorType}: ${
              typeof detail === "string"
                ? detail
                : JSON.stringify(detail)
            }${logs ? ` — ${logs}` : ""}`
          );

          return null;
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "Network error while checking video status.";

        setVideoState(x => ({
          ...x,
          [sceneId]: "FAILED"
        }));

        setVideoError(x => ({
          ...x,
          [sceneId]: message
        }));

        setStatus(`Video status error: ${message}`);

        return null;
      }
    }

    setVideoState(x => ({
      ...x,
      [sceneId]: "TIMEOUT"
    }));

    setStatus(
      "Generation is taking longer than expected."
    );

    return null;
  }

  async function shareVideo(
    platform: string,
    sceneId: number
  ) {
    const url =
      videoUrls[sceneId] || finalMovieUrl;

    if (!url) {
      setStatus("Generate the video first.");
      return;
    }

    if (
      platform === "share" &&
      navigator.share
    ) {
      try {
        await navigator.share({
          title: "ViralMovie AI",
          text: "My AI movie scene 🎬",
          url
        });
      } catch {}

      return;
    }

    const u = encodeURIComponent(url);

    const links: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      instagram: "https://www.instagram.com/",
      tiktok: "https://www.tiktok.com/upload?lang=en",
      youtube: "https://studio.youtube.com/"
    };

    if (platform === "share") {
      try {
        await navigator.clipboard.writeText(url);
        setStatus("Video link copied.");
      } catch {
        setStatus(
          "Copy failed. Use the video URL from the preview."
        );
      }

      return;
    }

    window.open(
      links[platform],
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function autoEditMovie() {
    const url =
      videoUrls[1] ||
      (selectedScene
        ? videoUrls[selectedScene.id]
        : "");

    if (!url) {
      setEditingState("WAITING");
      setEditingMessage(
        "Generate the continuous video first."
      );
      return;
    }

    setFinalMovieUrl(url);
    setEditingState("READY");

    setEditingMessage(
      `VIDEO READY: one continuous ${durationSeconds}-second video. No scene merging was used.`
    );
  }

  function downloadFinalMovie() {
    if (!finalMovieUrl) {
      setEditingMessage(
        "Create the final MP4 with Auto Edit first."
      );
      return;
    }

    const a = document.createElement("a");

    a.href = finalMovieUrl;

    a.download =
      `${
        (story?.title || "ViralMovie")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "viralmovie"
      }-final.mp4`;

    a.click();
  }

  async function publishMovie() {
    if (!selectedScene || !readyUrl) {
      setPublishMessage(
        "Generate a finished scene first."
      );
      return;
    }

    const title =
      story?.title ||
      `ViralMovie Scene ${selectedScene.id}`;

    const description =
      story?.logline ||
      selectedScene.prompt;

    const r = await fetch(
      "/api/admin/publish",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description,
          prompt: selectedScene.prompt,
          videoUrl: readyUrl
        })
      }
    );

    const d = await r.json().catch(() => ({}));

    setPublishMessage(
      r.ok
        ? `Published: ${d.movie?.title || title}`
        : d.error || "Publish failed."
    );
  }

  function downloadVideo(sceneId: number) {
    const url =
      videoUrls[sceneId] || finalMovieUrl;

    if (!url) {
      setStatus("Video is not ready yet.");
      return;
    }

    window.location.href =
      `/api/video/download?url=${encodeURIComponent(url)}`;
  }

  function previewVideo(sceneId: number) {
    const url =
      videoUrls[sceneId] || finalMovieUrl;

    const scene =
      story?.scenes.find(
        s => s.id === sceneId
      ) || selectedScene;

    if (!url || !scene) {
      setStatus(
        "Generate the scene first. Preview will appear here automatically."
      );
      return;
    }

    setSelectedScene(scene);
    setActive(4);

    setStatus(
      `Preview ready for Video. Press play to watch.`
    );

    setTimeout(
      () =>
        document
          .getElementById("preview")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          }),
      30
    );
  }

  const selectedCharacter =
    characters.find(
      c => c.id === selectedCharacterId
    ) || null;

  const readyUrl = selectedScene
    ? videoUrls[selectedScene.id]
    : "";

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand">
          <div className="brand-icon">🎬</div>
          <div>
            <strong>
              ViralMovie <span>AI</span>
            </strong>
            <small>
              Turn Your Ideas Into Viral Movies
            </small>
          </div>
        </div>

        <div className="top-actions">
          <a
            href="/movies"
            className="top-link"
          >
            🎞️ Movies
          </a>

          <a
            href="/credits"
            className="top-link"
          >
            🪙 Credits
          </a>

          <a
            href="/owner"
            className="top-link"
          >
            👑 Owner
          </a>

          <button>👑 Go Premium</button>

          <div className="profile">
            👤 Account⌄
          </div>
        </div>
      </nav>

      <div className="layout">
        <aside className="sidebar">
          <div className="side-links">
            {[
              "⌂ Dashboard",
              "🎬 Create Movie",
              "▣ Create Scene",
              "▶ My Videos",
              "☆ Viral Templates",
              "↗ Social Media",
              "◉ Credits & Plans",
              "⚙ Settings"
            ].map((x, i) => (
              <button
                key={x}
                className={
                  i === 1
                    ? "side-link active"
                    : "side-link"
                }
                onClick={() =>
                  i === 1
                    ? go(0)
                    : setStatus(
                        `${x.replace(
                          /^\S+\s/,
                          ""
                        )} is coming next.`
                      )
                }
              >
                {x}
              </button>
            ))}
          </div>

          <div className="premium-card">
            <div className="crown">👑</div>
            <h3>Go Premium</h3>
            <p>
              More videos, more features,
              more viral content!
            </p>
            <button>Upgrade Now</button>
            <div className="film-art">🎥</div>
          </div>
        </aside>

        <section className="content">
          <div className="hero-image">
            <img
              src="/hero-dashboard.png"
              alt="ViralMovie AI cinematic studio"
            />

            <div className="hero-overlay"></div>

            <div className="hero-copy">
              <div className="hero-kicker">
                AI FILM STUDIO
              </div>

              <h1>
                AI Makes <span>Films</span> Online
              </h1>

              <p>
                Turn one idea into a cinematic
                movie with AI — story, characters,
                scenes, video and social sharing.
              </p>

              <button
                type="button"
                className="hero-cta"
                onClick={() => go(0)}
              >
                ✦ Start Creating
              </button>
            </div>
          </div>

          <div className="feature-command card">
            <div className="feature-command-head">
              <div>
                <div className="section-kicker">
                  VIRALMOVIE AI · FULL PRODUCTION
                </div>

                <h2>
                  🎬 ONE-CLICK MOVIE
                </h2>

                <p>
                  One workflow for the complete
                  creative pipeline. Build the story
                  first, keep characters and continuity
                  consistent, then finish with editing,
                  poster and trailer.
                </p>
              </div>

              <button
                type="button"
                className="one-click-button"
                onClick={oneClickMovie}
              >
                🚀 ONE-CLICK MOVIE
              </button>
            </div>

            <div className="feature-order">
              {[
                [
                  "01",
                  "🧠 AI Story",
                  "Create the story, characters and scene plan once.",
                  () => generateStory()
                ],
                [
                  "02",
                  "🎥 Generate Movie",
                  "Generate the cinematic shots in sequence with continuity.",
                  () => void oneClickMovie()
                ],
                [
                  "03",
                  "🔊 Audio + Subtitles",
                  "Dialogue, ambience, Foley, music and subtitles stay with the movie.",
                  () => go(5)
                ],
                [
                  "04",
                  "🎬 Final MP4",
                  "Assemble every shot into one movie at the exact selected duration.",
                  () => {
                    setActive(6);
                    document
                      .getElementById("stage-6")
                      ?.scrollIntoView({
                        behavior: "smooth"
                      });
                  }
                ]
              ].map(
                ([
                  num,
                  title,
                  desc,
                  action
                ]: any) => (
                  <button
                    type="button"
                    className="feature-step"
                    key={num}
                    onClick={action}
                  >
                    <span>{num}</span>

                    <div>
                      <b>{title}</b>
                      <small>{desc}</small>
                    </div>

                    <strong>→</strong>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="workspace">
            <div className="main-column">
              <section
                className="card create-card"
                id="stage-0"
              >
                <div className="title-row">
                  <div className="title-icon">
                    🎬
                  </div>

                  <div>
                    <div className="section-kicker">
                      STEP 1 — YOUR IDEA
                    </div>

                    <h2>Create Film</h2>

                    <p>
                      Build your movie step by
                      step. Start with one idea and
                      ViralMovie turns it into a
                      production.
                    </p>
                  </div>
                </div>

                <div className="create-step">
                  <span>01</span>

                  <div>
                    <b>
                      What movie do you want to
                      create?
                    </b>

                    <textarea
                      value={idea}
                      onChange={e =>
                        setIdea(e.target.value)
                      }
                      placeholder={`Write your movie idea...

Example: A young astronaut lands on Mars and discovers a mysterious underground city...`}
                    />
                  </div>
                </div>

                <div className="create-step">
                  <span>02</span>

                  <div>
                    <b>Choose your style</b>

                    <div className="style-grid">
                      {[
                        "🎬 Cinematic",
                        "🎭 Drama",
                        "😂 Comedy",
                        "👽 Sci-Fi",
                        "😱 Horror",
                        "❤️ Romance",
                        "🔥 Action"
                      ].map(x => {
                        const value =
                          x.replace(
                            /^\S+\s/,
                            ""
                          );

                        return (
                          <button
                            type="button"
                            key={x}
                            className={
                              genre === value
                                ? "style-choice selected"
                                : "style-choice"
                            }
                            onClick={() =>
                              setGenre(value)
                            }
                          >
                            {x}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="create-step">
                  <span>03</span>

                  <div>
                    <b>Characters</b>

                    <p className="muted">
                      Create a Character Bible
                      with consistent visual
                      identity, voice and
                      personality.
                    </p>

                    <button
                      type="button"
                      className="secondary"
                      onClick={
                        openCharacters
                      }
                    >
                      ✦{" "}
                      {characters.length
                        ? "Edit Character Bible"
                        : "Create Character Bible"}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="create-step create-step-button"
                  onClick={openStoryStep}
                >
                  <span>04</span>

                  <div>
                    <b>Story</b>

                    <p className="muted">
                      AI builds the plot, scenes
                      and continuity from your idea.
                    </p>
                  </div>

                  <strong>→</strong>
                </button>

                <button
                  type="button"
                  className="create-step create-step-button"
                  onClick={openScenesStep}
                >
                  <span>05</span>

                  <div>
                    <b>Scenes</b>

                    <p className="muted">
                      Your story becomes an
                      automatic cinema production
                      plan.
                    </p>
                  </div>

                  <strong>→</strong>
                </button>

                <div className="create-step">
                  <span>06</span>

                  <div>
                    <b>Generate Movie</b>

                    <div className="field-row">
                      <select
                        aria-label="Movie format"
                        value={aspect}
                        onChange={e =>
                          setAspect(
                            e.target.value
                          )
                        }
                      >
                        <option>16:9</option>
                        <option>9:16</option>
                        <option>1:1</option>
                      </select>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8
                        }}
                      >
                        <span className="muted">
                          Seconds
                        </span>

                        {/* MODIFICAT: min 2, max 60 */}
                        <input
                          aria-label="Video duration in seconds"
                          type="number"
                          min={2}
                          max={60}
                          step={1}
                          value={durationSeconds}
                          onChange={e => {
                            const n = Math.min(
                              60,
                              Math.max(
                                2,
                                Number(
                                  e.target.value
                                ) || 2
                              )
                            );

                            setDurationSeconds(
                              n
                            );
                          }}
                          style={{
                            width: 82
                          }}
                        />
                      </label>

                      <div className="duration-pills compact">
                        {durations.map(x => (
                          <button
                            type="button"
                            key={x}
                            className={
                              durationSeconds ===
                              x
                                ? "selected"
                                : ""
                            }
                            onClick={() =>
                              setDurationSeconds(
                                x
                              )
                            }
                          >
                            {x === 60
                              ? "60s"
                              : `${x}s`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <small className="muted">
                      Video duration:{" "}
                      {durationSeconds} second
                      {durationSeconds === 1
                        ? ""
                        : "s"}{" "}
                      • ONE continuous video • no
                      scene splitting • no scene
                      merging
                    </small>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 8
                  }}
                >
                  <button
                    type="button"
                    className="generate"
                    onClick={oneClickMovie}
                  >
                    ✦ Generate Full Movie
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    onClick={generateStory}
                  >
                    📝 Build Story Plan
                  </button>
                </div>

                <div className="status-line">
                  {status}
                </div>
              </section>

              <section
                className="card"
                id="stage-1"
              >
                <div className="section-head">
                  <h2>⚡ AI Story</h2>

                  <span>
                    {story
                      ? "READY"
                      : "WAITING"}
                  </span>
                </div>

                {story ? (
                  <>
                    <h3>{story.title}</h3>

                    <p className="muted">
                      {story.logline}
                    </p>

                    <div className="info-box">
                      ONE continuous video •{" "}
                      {durationSeconds} seconds • no
                      internal scene splitting
                    </div>
                  </>
                ) : (
                  <div className="info-box">
                    Press Generate Full Movie to
                    create the continuous video
                    automatically.
                  </div>
                )}
              </section>

              <section
                className="card"
                id="stage-2"
              >
                <div className="section-head">
                  <h2>
                    👤 Character Bible
                  </h2>

                  <span>
                    {selectedCharacter
                      ? `SELECTED: ${selectedCharacter.name.toUpperCase()}`
                      : "CONSISTENCY"}
                  </span>
                </div>

                <p className="muted">
                  Keep the same character
                  identity across 20, 50 or 100
                  scenes.
                </p>

                <button
                  type="button"
                  className="secondary"
                  onClick={openCharacters}
                >
                  ✦{" "}
                  {characters.length
                    ? "Refresh Character Bible"
                    : "Create Character Bible"}
                </button>

                {characters.length > 0 && (
                  <div className="character-bible-grid">
                    {characters.map(c => (
                      <button
                        type="button"
                        className={`character character-bible ${
                          selectedCharacterId ===
                          c.id
                            ? "character-selected"
                            : ""
                        }`}
                        key={c.id}
                        onClick={() =>
                          selectCharacter(c)
                        }
                      >
                        <div className="avatar">
                          ◉
                        </div>

                        <b>{c.name}</b>

                        <span className="character-role">
                          {c.role}
                        </span>

                        <small>
                          Age: {c.age || "—"}
                        </small>

                        <small>
                          Personality:{" "}
                          {c.personality ||
                            "—"}
                        </small>

                        <small>
                          Wardrobe:{" "}
                          {c.wardrobe || "—"}
                        </small>

                        <small>
                          Voice:{" "}
                          {c.voice || "—"}
                        </small>

                        <em>
                          🔒 Character
                          Consistency
                        </em>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section
                className="card"
                id="stage-3"
              >
                <div className="section-head">
                  <h2>
                    ▣ Continuous Video Plan
                  </h2>

                  <span>
                    {story?.sceneCount || 0}{" "}
                    CONTINUOUS VIDEO
                  </span>
                </div>

                {!story ? (
                  <div className="info-box">
                    Generate the video first.
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="secondary scene-create"
                      onClick={() => {
                        setScenePage(0);
                        openStoryboard();
                      }}
                    >
                      ✦ Refresh Production Plan
                    </button>

                    <div className="info-box">
                      <b>Single-video mode:</b>{" "}
                      One continuous video of{" "}
                      {durationSeconds} seconds is
                      generated directly. There are no
                      internal scenes to generate or
                      merge.
                    </div>

                    <div className="scene-grid">
                      {story.scenes
                        .slice(
                          scenePage * 12,
                          scenePage * 12 + 12
                        )
                        .map(scene => (
                          <div
                            className={`scene-card ${
                              selectedScene?.id ===
                              scene.id
                                ? "scene-selected"
                                : ""
                            }`}
                            key={scene.id}
                          >
                            <div className="scene-thumb">
                              🎞️
                              <small>
                                #
                                {String(
                                  scene.id
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </small>
                            </div>

                            <div className="scene-main">
                              <b>
                                Continuous Video
                              </b>

                              <span className="scene-title">
                                {
                                  scene.prompt.split(
                                    "."
                                  )[0]
                                }
                              </span>

                              <div className="scene-meta">
                                <span>
                                  ⏱{" "}
                                  {scene.durationSeconds ||
                                    8}{" "}
                                  sec
                                </span>

                                <span>
                                  👤{" "}
                                  {selectedCharacter?.name ||
                                    "Characters"}
                                </span>

                                <span>
                                  🎙 Dialogue
                                </span>

                                <span>
                                  🎵 Music
                                </span>
                              </div>

                              <div className="scene-controls">
                                <button
                                  type="button"
                                  onClick={() => {
                                    selectScene(
                                      scene
                                    );

                                    setStatus(
                                      `This is the single continuous video. Generate it directly — no scene merging.`
                                    );
                                  }}
                                >
                                  🎬 View
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setStatus(
                          "New scene slot added to the movie plan."
                        )
                      }
                    >
                      ＋ Add Production Beat
                    </button>

                    <div className="scene-pagination">
                      <button
                        type="button"
                        className="secondary"
                        disabled={
                          scenePage === 0
                        }
                        onClick={() =>
                          setScenePage(p =>
                            Math.max(
                              0,
                              p - 1
                            )
                          )
                        }
                      >
                        ← Previous
                      </button>

                      <span>
                        Scenes{" "}
                        {scenePage * 12 + 1}–
                        {Math.min(
                          (scenePage + 1) * 12,
                          story.sceneCount
                        )}{" "}
                        of{" "}
                        {story.sceneCount}
                      </span>

                      <button
                        type="button"
                        className="secondary"
                        disabled={
                          (scenePage + 1) *
                            12 >=
                          story.sceneCount
                        }
                        onClick={() =>
                          setScenePage(p =>
                            p + 1
                          )
                        }
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}
              </section>

              <section
                className="card"
                id="stage-4"
              >
                <div className="section-head">
                  <h2>
                    🎥 05 · Video + Voice
                  </h2>

                  <span>
                    {selectedScene &&
                    videoState[
                      selectedScene.id
                    ]
                      ? videoState[
                          selectedScene.id
                        ]
                      : falConfigured === false
                      ? "VIDEO SERVICE OFFLINE"
                      : "AI READY"}
                  </span>
                </div>

                {selectedScene ? (
                  <>
                    <div className="info-box">
                      <b>Continuous Video</b>
                      <br />

                      <span>
                        {selectedScene.prompt}
                      </span>

                      {selectedCharacter && (
                        <>
                          <br />

                          <small className="character-context">
                            Character:{" "}
                            {
                              selectedCharacter.name
                            }{" "}
                            —{" "}
                            {
                              selectedCharacter.role
                            }
                          </small>
                        </>
                      )}
                    </div>

                    <label className="safety-check">
                      <input
                        type="checkbox"
                        checked={adultConfirmed}
                        onChange={e =>
                          setAdultConfirmed(
                            e.target.checked
                          )
                        }
                      />

                      I confirm I am 18+ and agree
                      not to create pornography,
                      sexual content involving
                      minors, non-consensual intimate
                      imagery, realistic
                      impersonations/deepfakes of real
                      people, terrorism, scams, extreme
                      gore, or other prohibited content.
                    </label>

                    {falConfigured === false && (
                      <div className="error-box">
                        <b>
                          Video service connection is
                          not ready.
                        </b>

                        <br />

                        The video service is temporarily
                        unavailable. Please try again in
                        a moment.
                      </div>
                    )}

                    {videoError[
                      selectedScene.id
                    ] && (
                      <div className="error-box">
                        <b>
                          Generation error
                        </b>

                        <br />

                        {
                          videoError[
                            selectedScene.id
                          ]
                        }
                      </div>
                    )}

                    <button
                      type="button"
                      className="generate"
                      disabled={
                        generatingScene ===
                        selectedScene.id
                      }
                      onClick={() =>
                        generateScene(
                          selectedScene
                        )
                      }
                    >
                      {generatingScene ===
                      selectedScene.id
                        ? `⏳ Generating Video...`
                        : generated[
                            selectedScene.id
                          ]
                        ? "↻ Generate Again"
                        : "✦ Generate Video"}
                    </button>

                    {readyUrl && (
                      <div className="video-box">
                        <video
                          controls
                          playsInline
                          src={readyUrl}
                        />

                        <div className="video-actions">
                          <button
                            className="download"
                            onClick={() =>
                              downloadVideo(
                                selectedScene.id
                              )
                            }
                          >
                            ⇩ Download Video
                          </button>

                          <button
                            className="preview"
                            onClick={() =>
                              previewVideo(
                                selectedScene.id
                              )
                            }
                          >
                            ◉ Preview
                          </button>
                        </div>

                        <div className="share-title">
                          Send your video to
                        </div>

                        <div className="socials">
                          <button
                            onClick={() =>
                              shareVideo(
                                "facebook",
                                selectedScene.id
                              )
                            }
                          >
                            f{" "}
                            <span>
                              Facebook
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              shareVideo(
                                "instagram",
                                selectedScene.id
                              )
                            }
                          >
                            ◎{" "}
                            <span>
                              Instagram
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              shareVideo(
                                "tiktok",
                                selectedScene.id
                              )
                            }
                          >
                            ♪{" "}
                            <span>
                              TikTok
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              shareVideo(
                                "youtube",
                                selectedScene.id
                              )
                            }
                          >
                            ▶{" "}
                            <span>
                              YouTube
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              shareVideo(
                                "share",
                                selectedScene.id
                              )
                            }
                          >
                            ↗{" "}
                            <span>
                              Share
                            </span>
                          </button>
                        </div>

                        <p className="share-note">
                          For Instagram, TikTok and
                          YouTube, the platform may ask
                          you to upload the downloaded
                          MP4.
                        </p>

                        <div className="publish-box">
                          <h3>
                            👑 Owner Admin · Publish
                          </h3>

                          <p>
                            Only the authenticated
                            site owner can publish a
                            finished, reviewed movie to
                            the public Movies catalog.
                            Publishing is blocked for
                            everyone else.
                          </p>

                          {!ownerLoggedIn ? (
                            <a
                              className="owner-login"
                              href="/owner"
                              style={{
                                textDecoration:
                                  "none",
                                display: "block",
                                textAlign:
                                  "center"
                              }}
                            >
                              👑 Open Owner Control
                              Center
                            </a>
                          ) : (
                            <button
                              className="publish"
                              onClick={
                                publishMovie
                              }
                            >
                              🚀 Publish to Movies
                            </button>
                          )}

                          <small>
                            {ownerLoggedIn
                              ? publishMessage
                              : "Owner publishing is managed separately from the public studio."}
                          </small>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="info-box">
                    Choose the continuous video from
                    the production plan first.
                  </div>
                )}
              </section>

              <section
                className="card"
                id="stage-5"
              >
                <div className="section-head">
                  <h2>
                    🔊 06 · Sound Design + 07 · Music
                  </h2>

                  <span>AUTOMATIC</span>
                </div>

                <div className="info-box">
                  <b>05 Voice + Dialogue</b> →{" "}
                  <b>06 Sound Design</b> →{" "}
                  <b>07 Music</b>. These layers are one
                  continuous soundtrack; the controls
                  below configure the same movie audio
                  pipeline.
                </div>

                <div className="audio-row">
                  {(
                    [
                      "dialogue",
                      "narration",
                      "sfx",
                      "music"
                    ] as const
                  ).map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        setAudio(a => ({
                          ...a,
                          [k]: !a[k]
                        }))
                      }
                    >
                      {audio[k] ? "✓" : "○"}{" "}
                      {k.toUpperCase()}
                    </button>
                  ))}
                </div>

                <p className="muted">
                  Every shot receives automatic cinema
                  audio: character dialogue and voice
                  acting, narration when appropriate,
                  original background score, ambience,
                  Foley and realistic sound effects.
                  Audio continuity follows the movie's
                  characters and story. You can keep all
                  four enabled for the most cinematic
                  result.
                </p>
              </section>

              <section
                className="card"
                id="stage-6"
              >
                <div className="section-head">
                  <h2>
                    🎞️ 09 · Final Movie
                  </h2>

                  <span>
                    {editingState === "READY"
                      ? "READY"
                      : editingState}
                  </span>
                </div>

                <div className="director-tools">
                  <div className="director-card auto-edit-card">
                    <div className="director-title">
                      <span>🎬</span>

                      <div>
                        <b>
                          FINAL MOVIE RENDER
                        </b>

                        <small>
                          The single generated
                          video is ready as the
                          final MP4.
                        </small>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="generate"
                      onClick={() =>
                        void autoEditMovie()
                      }
                      disabled={
                        editingState ===
                          "LOADING" ||
                        editingState ===
                          "RENDERING"
                      }
                    >
                      {editingState ===
                      "LOADING"
                        ? "⏳ Preparing movie..."
                        : editingState ===
                          "RENDERING"
                        ? "🎬 Rendering final MP4..."
                        : "🎬 COMPLETE & RENDER FINAL MOVIE"}
                    </button>

                    <p>
                      {editingMessage}
                    </p>

                    {finalMovieUrl && (
                      <>
                        <video
                          className="final-movie-player"
                          controls
                          playsInline
                          src={finalMovieUrl}
                        />

                        <button
                          type="button"
                          className="download"
                          onClick={
                            downloadFinalMovie
                          }
                        >
                          ⇩ Download Final MP4
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="project-map">
                  <span>🎬 Story</span>
                  <span>🎥 Shots</span>
                  <span>🔊 Audio</span>
                  <span>💬 Subtitles</span>
                  <span>🎞 Final MP4</span>
                  <span>🌐 Publish</span>
                </div>

                <div className="timeline-label">
                  MOVIE TIMELINE
                </div>

                <div className="timeline">
                  <div className="timeline-track">
                    {(story?.scenes || [])
                      .slice(0, 24)
                      .map(scene => (
                        <button
                          key={scene.id}
                          type="button"
                          className={
                            selectedScene?.id ===
                            scene.id
                              ? "timeline-scene selected"
                              : "timeline-scene"
                          }
                          onClick={() => {
                            selectScene(
                              scene
                            );
                            go(4);
                          }}
                        >
                          Continuous Video
                        </button>
                      ))}
                  </div>
                </div>

                <div className="movie-tile">
                  <strong>
                    {durationSeconds}s
                  </strong>

                  <span>
                    1 continuous video •{" "}
                    {Object.keys(videoUrls).length}{" "}
                    ready
                  </span>
                </div>

                {selectedScene &&
                  videoError[
                    selectedScene.id
                  ] && (
                    <div className="error-box">
                      <b>
                        Last video error:
                      </b>{" "}
                      {
                        videoError[
                          selectedScene.id
                        ]
                      }
                    </div>
                  )}

                <p className="muted">
                  One-Click Movie generates one
                  continuous video directly from your
                  prompt. No scene splitting,
                  no scene-by-scene generation and no
                  merging.
                </p>
              </section>
            </div>

            <aside
              className="right-column"
              id="preview"
            >
              <section className="card preview-card">
                <div className="section-head">
                  <h2>
                    ▶ Movie Preview
                  </h2>

                  <span>LIVE</span>
                </div>

                {readyUrl ? (
                  <video
                    id="movie-preview-video"
                    controls
                    playsInline
                    preload="metadata"
                    src={readyUrl}
                  />
                ) : (
                  <div className="preview-empty">
                    <img
                      src="/hero-dashboard.png"
                      alt="Movie preview"
                    />

                    <span className="play">
                      ▶
                    </span>

                    <strong>
                      {selectedScene
                        ? `Scene ${selectedScene.id} — press Generate Video below`
                        : "Select a scene to create your preview"}
                    </strong>
                  </div>
                )}

                <div className="preview-actions">
                  {selectedScene &&
                    !readyUrl && (
                      <button
                        type="button"
                        className="preview"
                        disabled={
                          generatingScene ===
                          selectedScene.id
                        }
                        onClick={() =>
                          generateScene(
                            selectedScene
                          )
                        }
                      >
                        {generatingScene ===
                        selectedScene.id
                          ? "⏳ Generating..."
                          : "✦ Generate Video"}
                      </button>
                    )}

                  <button
                    className="download"
                    disabled={!readyUrl}
                    onClick={() =>
                      selectedScene &&
                      downloadVideo(
                        selectedScene.id
                      )
                    }
                  >
                    ⇩ Download Video
                  </button>

                  <button
                    className="preview"
                    disabled={!readyUrl}
                    onClick={() =>
                      selectedScene &&
                      previewVideo(
                        selectedScene.id
                      )
                    }
                  >
                    ◉ Preview
                  </button>
                </div>

                {readyUrl &&
                  selectedScene && (
                    <>
                      <div className="share-title">
                        Send your video to
                      </div>

                      <div className="socials">
                        <button
                          onClick={() =>
                            shareVideo(
                              "facebook",
                              selectedScene.id
                            )
                          }
                        >
                          f{" "}
                          <span>
                            Facebook
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            shareVideo(
                              "instagram",
                              selectedScene.id
                            )
                          }
                        >
                          ◎{" "}
                          <span>
                            Instagram
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            shareVideo(
                              "tiktok",
                              selectedScene.id
                            )
                          }
                        >
                          ♪{" "}
                          <span>
                            TikTok
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            shareVideo(
                              "youtube",
                              selectedScene.id
                            )
                          }
                        >
                          ▶{" "}
                          <span>
                            YouTube
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            shareVideo(
                              "share",
                              selectedScene.id
                            )
                          }
                        >
                          ↗{" "}
                          <span>
                            Share
                          </span>
                        </button>
                      </div>

                      <p className="share-note">
                        Social buttons open the platform
                        upload/share page. Download the
                        MP4 first when a platform requires
                        a file upload.
                      </p>
                    </>
                  )}
              </section>

              <section className="card pipeline">
                <div className="section-head">
                  <h2>Movie Pipeline</h2>
                  <span>V4</span>
                </div>

                <div className="steps">
                  {steps.map(
                    ([name, desc], i) => (
                      <button
                        type="button"
                        key={name}
                        className={`step ${
                          active === i
                            ? "active"
                            : ""
                        } ${
                          i < active
                            ? "done"
                            : ""
                        }`}
                        onClick={() => {
                          if (i === 2)
                            openCharacters();
                          else if (i === 3)
                            openStoryboard();
                          else if (i === 4)
                            openVideo();
                          else go(i);
                        }}
                      >
                        <b>
                          {i + 1}. {name}
                        </b>

                        <span>
                          {i < active
                            ? "✓"
                            : i === active
                            ? "ACTIVE"
                            : "OPEN"}
                        </span>

                        <small>
                          {desc}
                        </small>
                      </button>
                    )
                  )}
                </div>
              </section>

              <section className="card my-movies">
                <div className="section-head">
                  <h2>
                    🎞️ My Movies
                  </h2>

                  <span>
                    View all →
                  </span>
                </div>

                <div className="movie-item">
                  <div className="mini-art">
                    🌌
                  </div>

                  <div>
                    <b>
                      {story?.title ||
                        "Your next movie"}
                    </b>

                    <small>
                      {story
                        ? `${durationSeconds}s • Project ready`
                        : "Start a new project"}
                    </small>
                  </div>

                  <button
                    onClick={() => go(0)}
                  >
                    Play
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>

      <footer>
        ViralMovie AI • AI Makes Films Online •
        18+ • Safety-first • Secure server-side
        rendering.

        <span className="footer-links">
          <a href="/terms">
            Terms
          </a>{" "}
          ·{" "}
          <a href="/privacy">
            Privacy
          </a>{" "}
          ·{" "}
          <a href="/acceptable-use">
            Acceptable Use
          </a>{" "}
          ·{" "}
          <a href="/security">
            Security
          </a>
        </span>
      </footer>
    </main>
  );
}
