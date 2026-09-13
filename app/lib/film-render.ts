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

    return new Blob(
      [copy.buffer as ArrayBuffer],
      { type }
    );
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
        "-an",
        "-movflags",
        "+faststart",
        "movie-video.mp4",
      ]);

      await ff.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "concat.txt",
        "-vn",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "audio.m4a",
      ]);

      await ff.exec([
        "-i",
        "movie-video.mp4",
        "-i",
        "audio.m4a",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        "movie-final.mp4",
      ]);

      assembled = true;
    } catch {
      assembled = false;
    }
  }

  if (!assembled) {
    await ff.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-c",
      "copy",
      "movie-final.mp4",
    ]);
  }

  const subtitleLines: string[] = [];

  let t = 0;

  for (let i = 0; i < sceneUrls.length; i++) {
    const scene = scenes[i] || {
      id: i + 1,
      prompt: "",
    };

    const duration = 5;

    const text = scene.prompt
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);

    subtitleLines.push(
      `${i + 1}\n` +
        `${srtTime(t)} --> ${srtTime(
          t + duration - 0.15
        )}\n` +
        `${text}\n`
    );

    t += duration;
  }

  const srt = subtitleLines.join("\n");

  await ff.writeFile(
    "subtitles.srt",
    new TextEncoder().encode(srt)
  );

  onProgress?.(
    "Adding automatic subtitle track..."
  );

  await ff.exec([
    "-i",
    "movie-final.mp4",
    "-i",
    "subtitles.srt",
    "-c",
    "copy",
    "-c:s",
    "mov_text",
    "-metadata:s:s:0",
    "language=eng",
    "movie-final-subtitled.mp4",
  ]);

  const trailerIndexes =
    sceneUrls.length <= 4
      ? sceneUrls.map((_, i) => i)
      : Array.from(
          new Set([
            0,
            Math.floor(sceneUrls.length / 3),
            Math.floor(
              (2 * sceneUrls.length) / 3
            ),
            sceneUrls.length - 1,
          ])
        );

  const trailerList = trailerIndexes
    .map((i) => `file '${files[i]}'`)
    .join("\n");

  await ff.writeFile(
    "trailer.txt",
    new TextEncoder().encode(trailerList)
  );

  onProgress?.(
    "Cutting the automatic trailer..."
  );

  await ff.exec([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "trailer.txt",
    "-t",
    "20",
    "-c",
    "copy",
    "trailer.mp4",
  ]);

  const movieData = await ff.readFile(
    "movie-final-subtitled.mp4"
  );

  const trailerData = await ff.readFile(
    "trailer.mp4"
  );

  const subData = await ff.readFile(
    "subtitles.srt"
  );

  const movieBlob = ffmpegFileToBlob(
    movieData,
    "video/mp4"
  );

  const trailerBlob = ffmpegFileToBlob(
    trailerData,
    "video/mp4"
  );

  const subBlob = ffmpegFileToBlob(
    subData,
    "application/x-subrip"
  );

  return {
    movieUrl: URL.createObjectURL(movieBlob),
    trailerUrl: URL.createObjectURL(trailerBlob),
    subtitleUrl: URL.createObjectURL(subBlob),
  };
}
