import { readFile } from "node:fs/promises";
import { connect } from "node:net";

const api = process.env.DEMO_API_URL || "http://127.0.0.1:8787";
const replayDir = new URL("./replay_files/", import.meta.url);

// After the saved reply, write replay_files into the new project and copy the
// source project's FalkorDB graph onto it. The dummy socket ignores live frames,
// so the caller pushes the artifact list into the page.
export async function prepareReplay(projectId, reply) {
  const artifacts = await postArtifacts(projectId, reply.artifacts || []);
  if (reply.replayProject) await copyGraph(reply.replayProject, projectId);
  return artifacts;
}

async function postArtifacts(projectId, names) {
  for (const name of names) {
    const raw = await readFile(new URL(name, replayDir));
    const kind = artifactKind(name);
    const body = {
      name,
      kind,
      content_base64: raw.toString("base64"),
    };
    if (kind === "report") {
      body.evidence_urls = linksIn(raw.toString("utf8"));
    }
    const res = await fetch(`${api}/api/projects/${projectId}/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || `artifact ${name} failed (${res.status})`);
    }
  }
  const listed = await fetch(`${api}/api/projects`).then((res) => res.json());
  const project = (listed.projects || []).find((item) => item.id === projectId);
  if (!project) throw new Error(`project ${projectId} disappeared after the artifact upload`);
  return project.artifacts || [];
}

function artifactKind(name) {
  if (name.endsWith(".pptx")) return "deck";
  if (name === "report.md") return "report";
  return "file";
}

function linksIn(text) {
  return [...text.matchAll(/https?:\/\/[^\s<>"]+/g)].map((match) => match[0].replace(/[.,);>\]]+$/, ""));
}

async function copyGraph(sourceName, projectId) {
  const listed = await fetch(`${api}/api/projects`).then((res) => res.json());
  const candidates = (listed.projects || []).filter(
    (item) => item.name === sourceName && item.id !== projectId,
  );
  const source = candidates.find((item) => (item.artifacts || []).length) || candidates.at(-1);
  if (!source) throw new Error(`no project named ${sourceName} to copy the graph from`);
  if (!/^p_[A-Za-z0-9]+$/.test(projectId) || projectId === source.id) {
    throw new Error(`refusing to replace the graph of ${projectId}`);
  }
  try {
    await redisCall(["GRAPH.COPY", source.id, projectId]);
  } catch (err) {
    if (!String(err.message).includes("already exists")) throw err;
    await redisCall(["GRAPH.DELETE", projectId]);
    await redisCall(["GRAPH.COPY", source.id, projectId]);
  }
}

function redisCall(args) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port: 6379 });
    const chunks = [];
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("falkordb timed out"));
    }, 8000);
    socket.on("data", (chunk) => {
      chunks.push(chunk);
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text.endsWith("\r\n")) return;
      clearTimeout(timer);
      socket.end();
      if (text.startsWith("-")) reject(new Error(text.slice(1).trim()));
      else resolve(text.trim());
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    const parts = args.map((arg) => {
      const value = String(arg);
      return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
    });
    socket.write(`*${args.length}\r\n${parts.join("")}`);
  });
}
