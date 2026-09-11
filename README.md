# ViralMovie AI V4.0.1

Professional dark cinematic AI movie studio for Vercel.

## Working flow
IDEA -> AI STORY -> CHARACTERS -> STORYBOARD -> AI VIDEO -> AUDIO -> MOVIE -> EXPORT

## Video engine
Vidu Q3 Turbo through fal.ai. The `FAL_KEY` stays server-side in Vercel Environment Variables.

For economical testing the app submits 5-second, 540p scenes. fal currently documents Q3 Turbo at $0.035/video second at 540p, so a 5-second test costs about $0.175 before any account-specific pricing/credits. See the official API docs: https://fal.ai/models/fal-ai/vidu/q3/text-to-video/turbo/api

## Fixed in V4.0.1
- Added the missing video status API route.
- Added the missing video download API route.
- Movie Preview now receives the completed Vidu MP4 URL.
- Preview uses a real HTML video player with controls.
- Download streams the MP4 through the server.
- Facebook / Instagram / TikTok / YouTube / Share buttons remain available after generation.
- Character and Storyboard controls remain interactive.

Social platforms may require the user to download the MP4 and upload it manually; browser buttons cannot silently upload to a user's social account without the platform's authentication/API flow.

## Important
The current app generates individual 5-second scenes. It does not yet stitch all scenes into one final long MP4 movie. That is the next engineering step.


## V4.1 video generation fix
- Added visible Vidu/fal.ai submission, queue, status and result errors in the UI.
- Generate Scene now shows SUBMITTING / IN_QUEUE / IN_PROGRESS / READY or the exact server error.
- The Generate Scene button is disabled while the request is running to prevent duplicate paid requests.
- Vidu Q3 Turbo remains server-side through FAL_KEY.
- Test with 5-second 540p scenes first; fal.ai charges for inference.


## V4.2 Character Selection Fix
- Characters are now real selectable client-side cards.
- Selected character is highlighted and shown in the AI Video panel.
- The selected character description is added to the Vidu scene prompt for continuity.
- Project export includes the selected character.


## V4.2.1 button fix
- Storyboard "Open & Generate" now actually starts video generation; previously it only selected the scene.
- Character cards are real selectable buttons and the selected character is included in the generation prompt.
- Video API errors are shown directly in the status line.


## V4.2.2 video reliability fix
- Generate Scene now shows non-JSON/server errors instead of silently failing.
- Added a 30-second client timeout with a clear Vercel/FAL_KEY message.
- Status polling checks immediately and normalizes fal.ai status/state responses.
- Added `/api/video/health` to confirm the deployed server sees `FAL_KEY`.
- ZIP filename intentionally remains `ViralMovie-AI-V4-FIXED.zip`.

## V4.2.2 diagnostics
The video status endpoint now exposes fal.ai `error_type` and recent runner logs, and the UI displays them when a Vidu job reaches FAILED. This makes credit/auth/model/input failures visible instead of showing only a generic failure.
