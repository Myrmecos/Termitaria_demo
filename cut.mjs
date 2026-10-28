import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(await readFile(join(root, "cuts.json"), "utf8"));
const source = join(root, spec.source);
const outDir = join(root, "artifacts", "cuts");

await mkdir(outDir, { recursive: true });

for (const clip of spec.clips) {
  const work = join(outDir, `.${clip.id}`);
  await rm(work, { recursive: true, force: true });
  await mkdir(work);
  const parts = [];
  const durations = [];
  for (let i = 0; i < clip.ranges.length; i += 1) {
    const range = clip.ranges[i];
    const part = join(work, `part-${i}.mp4`);
    const duration = range.end - range.start;
    durations.push(duration);
    await ffmpeg([
      "-y",
      "-i", source,
      "-ss", String(range.start),
      "-t", duration.toFixed(3),
      "-an",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", "25",
      "-preset", "veryfast",
      part,
    ]);
    parts.push(part);
  }

  let joined = parts[0];
  if (parts.length > 1) {
    const list = join(work, "list.txt");
    await writeFile(list, parts.map((part) => `file '${part}'`).join("\n") + "\n");
    joined = join(work, "joined.mp4");
    await ffmpeg(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);
  }

  const length = await probe(joined);
  const cues = buildCues(clip, durations, length);
  const ass = join(work, "sub.ass");
  await writeFile(ass, assScript(cues));
  const burned = join(outDir, `${clip.id}.mp4`);
  await ffmpeg([
    "-y",
    "-i", joined,
    "-vf", `ass=${filterPath(ass)}`,
    "-an",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-r", "25",
    "-preset", "veryfast",
    burned,
  ]);
  await rm(work, { recursive: true, force: true });
  console.log(`${clip.id} ${length.toFixed(2)}s`);
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}`));
    });
  });
}

function probe(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      file,
    ], { stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(Number(out.trim()));
      else reject(new Error("ffprobe failed"));
    });
  });
}

// One sentence, or one clause of a long sentence, is on screen at a time.
function buildCues(clip, durations, length) {
  const cues = [];
  let at = 0;
  for (let i = 0; i < durations.length; i += 1) {
    const range = clip.ranges[i];
    const lines = range.lines ?? [range.text ?? clip.text];
    const slice = durations[i] / lines.length;
    for (const text of lines) {
      cues.push({ start: at, end: at + slice, text });
      at += slice;
    }
  }
  if (cues.length) cues[cues.length - 1].end = length;
  return cues;
}

// FontSize 52 on this 900px frame matches the animation captions: one line, about 40px tall.
function assScript(cues) {
  const events = cues.map((cue) => {
    const text = cue.text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
    return `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Default,,0,0,0,,${text}`;
  });
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1440
PlayResY: 900
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Helvetica,52,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,40,40,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}

function assTime(seconds) {
  const cs = Math.max(0, Math.round(seconds * 100));
  const pad = (value) => String(value).padStart(2, "0");
  const hour = Math.floor(cs / 360000);
  const minute = Math.floor((cs % 360000) / 6000);
  const second = Math.floor((cs % 6000) / 100);
  return `${hour}:${pad(minute)}:${pad(second)}.${pad(cs % 100)}`;
}

function filterPath(file) {
  return file.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
