# ViralMovie AI V5.0 — Full Film Pipeline

This build adds the requested automatic movie workflow:

IDEA → STORY → CHARACTER BIBLE → STORYBOARD → AI VIDEO → AUDIO → FINAL MP4 → TRAILER → SUBTITLES → EXPORT

## New
- Movies Online streaming-style public page with Latest, Trending, AI Originals, Action, Sci-Fi, Drama and Short Films.
- Film navigation: Create Film, My Films, Movies Online, Characters, Projects, Account.
- Full-film confirmation before bulk paid generation.
- Automatic generation of all visible storyboard scenes.
- Client-side FFmpeg assembly into one MP4.
- Automatic short trailer from selected key scenes.
- Automatic SRT subtitles generated from the screenplay/scene text.
- Final movie preview and MP4 download.
- Character bible is injected into every scene prompt for continuity.
- Audio preferences for dialogue, narration, music and SFX.
- Account and Credits pages prepared for the billing layer.

## Important technical note
The final assembly is performed in the browser with FFmpeg WASM so the prototype does not require a paid server-side video-rendering service. This is practical for short tests, but long films can use a lot of phone memory/CPU. For 10–60 minute production movies, the next production step is a persistent storage + background render worker.

The current automatic subtitles are screenplay/scene-text based SRT subtitles. True speech-to-text subtitles from the generated audio require a transcription service and can be added as the production audio stage.

FAL_KEY remains server-side. Never put it in client code.
