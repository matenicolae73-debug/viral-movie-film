import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let loaded = false;

async function getFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }

  if (!loaded) {
    const base =
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${base}/ffmpeg-core.js`,
        "text/javascript"
      ),
      wasmURL: await toBlobURL(
        `${base}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
      workerURL: await toBlobURL(
        `${base}/ffmpeg-core.worker.js`,
        "text/javascript"
      ),
    });

    loaded = true;
  }

  return ffmpeg;
}

export type RenderResult = {
  movieUrl: string;
  trailerUrl: string;
  subtitleUrl: string;
};

function srtTime(seconds: number) {
  const ms = Math.max(0, Math.round(seconds * 1000));

  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(s).padStart(2, "0")},${String(milli).padStart(
    3,
    "0"
  )}`;
}

/**
 * Converts FFmpeg FileData into a Blob safely.
 *
 * FFmpeg can return Uint8Array backed by ArrayBufferLike,
 * while newer TypeScript DOM definitions require a real
 * ArrayBuffer for BlobPart.
 */
function ffmpegFileToBlob(
  data: unknown,
  type: string
): Blob {
  if (typeof data === "string") {
    return new Blob([data], { type });
  }

  if (data instanceof Uint8Array) {
    const copy = new Uint8Array(data.byteLength);

    copy.set(data);

    const buffer = copy.buffer as ArrayBuffer;

    return new Blob([buffer], { type });
  }

  throw new Error(
    "Unsupported FFmpeg file data returned by readFile()."
  );
}

export async function renderFilm(
  sceneUrls: string[],
  scenes: { id: number; prompt: string }[],
  onProgress?: (message: string) => void
): Promise<RenderResult> {
  if (!sceneUrls.length) {
    throw new Error(
      "No generated scenes are ready for the final movie."
    );
  }

  const ff = await getFFmpeg();
  const files: string[] = [];

  for (let i = 0; i < sceneUrls.length; i++) {
    onProgress?.(
      `Preparing scene ${i + 1}/${sceneUrls.length}...`
    );

    const proxyUrl =
      `/api/video/download?url=${encodeURIComponent(
        sceneUrls[i]
      )}`;

    const data = await fetchFile(proxyUrl);

    const name = `scene-${String(i).padStart(4, "0")}.mp4`;

    await ff.writeFile(name, data);

    files.push(name);
  }

  const list = files
    .map((file) => `file '${file}'`)
    .join("\n");

  await ff.writeFile(
    "concat.txt",
    new TextEncoder().encode(list)
  );

  onProgress?.(
    "Assembling the final MP4 with cinematic transitions..."
  );

  let assembled = false;

  if (files.length > 1 && files.length <= 30) {
    try {
      const videoInputs = files.flatMap((file) => [
        "-i",
        file,
      ]);

      const chains = files
        .map(
          (_, i) =>
            `[${i}:v]format=yuv420p,setpts=PTS-STARTPTS[v${i}]`
        )
        .join(";");

      let last = "v0";

      const xfadeParts: string[] = [];

      for (let i = 1; i < files.length; i++) {
        const out = `vx${i}`;

        const offset = Math.max(
          0.2,
          i * 5 - 0.3
        );

        xfadeParts.push(
          `[${last}][v${i}]xfade=transition=fade:duration=0.3:offset=${offset}[${out}]`
        );

        last = out;
      }

      const filter =
        `${chains};${xfadeParts.join(";")}`;

      await ff.exec([
        ...videoInputs,
        "-filter_complex",
        filter,
        "-map",
        `[${last}]`,
       
