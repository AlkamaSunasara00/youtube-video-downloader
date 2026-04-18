import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { formatBytes, formatDuration, isValidHttpUrl, sanitizeFilename } from "@/lib/utils";

const BASE_ARGS = ["--no-warnings", "--no-call-home", "--no-playlist"];
const SUPPORTED_EXTENSIONS = new Set(["mp4", "webm", "mkv", "mov", "m4v"]);

function getYtDlpCandidates() {
  const customBinary = process.env.YT_DLP_PATH?.trim();
  const candidates = [
    customBinary ? { command: customBinary, baseArgs: [] } : null,
    { command: "yt-dlp", baseArgs: [] },
    { command: "python", baseArgs: ["-m", "yt_dlp"] },
    { command: "py", baseArgs: ["-m", "yt_dlp"] },
  ].filter(Boolean);

  const deduped = [];
  const seen = new Set();

  for (const candidate of candidates) {
    const key = `${candidate.command}|${candidate.baseArgs.join(" ")}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function getFfmpegArgs() {
  const ffmpegLocation =
    process.env.FFMPEG_PATH?.trim() || process.env.FFMPEG_LOCATION?.trim();

  return ffmpegLocation ? ["--ffmpeg-location", ffmpegLocation] : [];
}

function createMergedSelector(formatId, extension) {
  const ext = (extension || "").toLowerCase();

  if (ext === "webm") {
    return `${formatId}+bestaudio[ext=webm]/${formatId}+bestaudio/best`;
  }

  return `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio/best`;
}

function getMergeOutputFormat(extension) {
  return extension === "webm" ? "webm" : "mp4";
}

function parseHeight(rawFormat) {
  if (Number.isFinite(rawFormat?.height) && rawFormat.height > 0) {
    return rawFormat.height;
  }

  const source = [rawFormat?.resolution, rawFormat?.format_note, rawFormat?.format]
    .filter(Boolean)
    .join(" ");
  const match = source.match(/(\d{3,4})p/i);

  return match ? Number(match[1]) : 0;
}

function createFormatRecord(rawFormat) {
  const height = parseHeight(rawFormat);
  const extension = (rawFormat.ext || "mp4").toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return null;
  }

  const hasVideo = rawFormat.vcodec && rawFormat.vcodec !== "none";
  if (!hasVideo) {
    return null;
  }

  const hasAudio = rawFormat.acodec && rawFormat.acodec !== "none";
  const quality =
    (height && `${height}p`) ||
    rawFormat.format_note ||
    rawFormat.resolution ||
    "Best available";
  const fileSizeValue = rawFormat.filesize || rawFormat.filesize_approx || 0;
  const outputExtension = hasAudio ? extension : getMergeOutputFormat(extension);

  return {
    quality,
    format_id: hasAudio
      ? rawFormat.format_id
      : createMergedSelector(rawFormat.format_id, extension),
    ext: outputExtension,
    filesize: formatBytes(fileSizeValue),
    videoOnly: !hasAudio,
    note: hasAudio
      ? "This format already includes audio."
      : "This video stream will be merged with the best available audio.",
    sortHeight: height,
    sortSize: fileSizeValue,
    sortAudio: hasAudio ? 1 : 0,
    sortFps: Number(rawFormat.fps) || 0,
  };
}

function normaliseFormats(rawFormats) {
  const formatMap = new Map();

  for (const rawFormat of rawFormats || []) {
    const record = createFormatRecord(rawFormat);

    if (!record) {
      continue;
    }

    const key = `${record.quality}-${record.ext}-${record.videoOnly}`;
    const current = formatMap.get(key);

    if (
      !current ||
      record.sortAudio > current.sortAudio ||
      record.sortHeight > current.sortHeight ||
      record.sortSize > current.sortSize ||
      record.sortFps > current.sortFps
    ) {
      formatMap.set(key, record);
    }
  }

  return [...formatMap.values()]
    .sort((left, right) => {
      if (right.sortHeight !== left.sortHeight) {
        return right.sortHeight - left.sortHeight;
      }

      if (right.sortAudio !== left.sortAudio) {
        return right.sortAudio - left.sortAudio;
      }

      if (right.sortSize !== left.sortSize) {
        return right.sortSize - left.sortSize;
      }

      return right.sortFps - left.sortFps;
    })
    .map(({ sortHeight, sortSize, sortAudio, sortFps, ...format }) => format);
}

function extractReadableError(stderr) {
  const message = stderr?.trim();

  if (!message) {
    return "yt-dlp failed to process that video.";
  }

  if (/ffmpeg/i.test(message) && /not found|missing/i.test(message)) {
    return "FFmpeg is required to merge that format. Install FFmpeg or pick a format that already includes audio.";
  }

  if (/unsupported url/i.test(message)) {
    return "That link is not supported by yt-dlp.";
  }

  if (/private video/i.test(message)) {
    return "That video is private and cannot be downloaded.";
  }

  return message.split(/\r?\n/).filter(Boolean).slice(-1)[0];
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(extractReadableError(stderr));
      error.code = code;
      reject(error);
    });
  });
}

async function runYtDlp(args) {
  let lastError = null;

  for (const candidate of getYtDlpCandidates()) {
    try {
      return await runCommand(candidate.command, [...candidate.baseArgs, ...args]);
    } catch (error) {
      if (error?.code === "ENOENT") {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    lastError
      ? "yt-dlp is not installed. Install yt-dlp or set YT_DLP_PATH before using the downloader."
      : "yt-dlp is not available in this environment."
  );
}

export async function getVideoInfo(url) {
  if (!isValidHttpUrl(url)) {
    throw new Error("Please enter a valid video URL.");
  }

  const { stdout } = await runYtDlp([...BASE_ARGS, "--dump-single-json", url]);
  const payload = JSON.parse(stdout);
  const formats = normaliseFormats(payload.formats);

  if (!formats.length) {
    throw new Error("No downloadable formats were found for this video.");
  }

  return {
    title: payload.title || "Untitled video",
    thumbnail: payload.thumbnail || payload.thumbnails?.[0]?.url || "",
    duration: formatDuration(payload.duration),
    formats,
  };
}

export async function downloadVideo(url, formatId, extension) {
  if (!isValidHttpUrl(url)) {
    throw new Error("Please enter a valid video URL.");
  }

  if (typeof formatId !== "string" || !formatId.trim()) {
    throw new Error("A video format is required before downloading.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "video-downloader-"));
  const outputTemplate = join(tempDir, "%(title).180B [%(id)s].%(ext)s");
  const shouldMerge = formatId.includes("+");
  const mergeFormat = getMergeOutputFormat((extension || "").toLowerCase());
  const args = [
    ...BASE_ARGS,
    ...getFfmpegArgs(),
    "--restrict-filenames",
    "--print",
    "after_move:filepath",
    "-f",
    formatId,
    "-o",
    outputTemplate,
  ];

  if (shouldMerge) {
    args.push("--merge-output-format", mergeFormat);
  }

  args.push(url);

  try {
    const { stdout } = await runYtDlp(args);
    const outputLines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    let filePath = outputLines.at(-1);

    if (!filePath) {
      const files = await readdir(tempDir);
      const [firstFile] = files;

      if (!firstFile) {
        throw new Error("The download finished without producing a file.");
      }

      filePath = join(tempDir, firstFile);
    }

    return {
      filePath,
      fileName: sanitizeFilename(basename(filePath)),
      createStream: () => createReadStream(filePath),
      cleanup: () => rm(tempDir, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
