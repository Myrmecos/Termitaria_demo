import { chromium } from "playwright";
import { access, mkdir, rename } from "node:fs/promises";
import { dummyReplies } from "./dummy-replies.mjs";
import { prepareReplay } from "./replay.mjs";

const appUrl = process.env.DEMO_APP_URL || "http://127.0.0.1:3000";
const recordVideo = process.env.DEMO_RECORD === "1";
const useDummy = process.env.DUMMY === "1";
const outputDir = new URL("./artifacts/", import.meta.url);

export async function recordSession({
  projectName,
  template,
  evidence = "",
  chatName,
  modelLabel = "DeepSeek-V4.1-Flash",
  question,
  sentMark,
  recordingName,
}) {
  if (recordVideo) {
    await mkdir(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(recordVideo
      ? { recordVideo: { dir: outputDir.pathname, size: { width: 1440, height: 900 } } }
      : {}),
  });

  await context.addInitScript((holdLiveReplies) => {
    window.__moveDemoCursor = (x, y) => {
      let cursor = document.getElementById("demo-cursor");
      if (!cursor) {
        cursor = document.createElement("div");
        cursor.id = "demo-cursor";
        cursor.style.cssText = [
          "position:fixed",
          "top:0",
          "left:0",
          "width:32px",
          "height:32px",
          "pointer-events:none",
          "z-index:2147483647",
          "filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))",
        ].join(";");
        cursor.innerHTML =
          "<svg width='32' height='32' viewBox='0 0 32 32' aria-hidden='true'>" +
          "<path d='M3 2 L3 26 L9 20 L15 30 L19 28 L13 18 L25 18 Z' fill='#111' stroke='#fff' stroke-width='2' stroke-linejoin='round'/>" +
          "</svg>";
        document.documentElement.appendChild(cursor);
      }
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    };

    // DUMMY=1 keeps the typed question on screen and plays a saved reply.
    // Outbound chat sends are dropped, and live socket frames are ignored.
    if (!holdLiveReplies) return;
    const NativeWS = window.WebSocket;
    const sockets = [];
    function DemoSocket(url, protocols) {
      const ws = protocols === undefined ? new NativeWS(url) : new NativeWS(url, protocols);
      const nativeSend = ws.send.bind(ws);
      const nativeAdd = ws.addEventListener.bind(ws);
      const nativeRemove = ws.removeEventListener.bind(ws);
      let handler = null;
      const extras = [];
      function deliver(event) {
        if (handler) handler.call(ws, event);
        for (const fn of extras.slice()) fn.call(ws, event);
      }
      Object.defineProperty(ws, "onmessage", {
        configurable: true,
        enumerable: true,
        get() {
          return handler;
        },
        set(fn) {
          handler = typeof fn === "function" ? fn : null;
        },
      });
      ws.addEventListener = (type, fn, opts) => {
        if (type === "message" && typeof fn === "function") {
          extras.push(fn);
          return;
        }
        nativeAdd(type, fn, opts);
      };
      ws.removeEventListener = (type, fn, opts) => {
        if (type === "message") {
          const index = extras.indexOf(fn);
          if (index >= 0) extras.splice(index, 1);
          return;
        }
        nativeRemove(type, fn, opts);
      };
      nativeAdd("message", (event) => {
        if (window.__demoMute) return;
        deliver(event);
      });
      ws.send = (data) => {
        try {
          const frame = JSON.parse(data);
          if (frame && frame.type === "message.send") return;
        } catch {
          // Non-JSON frames still go out.
        }
        nativeSend(data);
      };
      sockets.push({
        push(frame) {
          deliver(new MessageEvent("message", { data: JSON.stringify(frame) }));
        },
      });
      return ws;
    }
    DemoSocket.prototype = NativeWS.prototype;
    DemoSocket.CONNECTING = NativeWS.CONNECTING;
    DemoSocket.OPEN = NativeWS.OPEN;
    DemoSocket.CLOSING = NativeWS.CLOSING;
    DemoSocket.CLOSED = NativeWS.CLOSED;
    window.WebSocket = DemoSocket;
    window.__demoMute = true;
    window.__demoPush = (frame) => {
      for (const sock of sockets) sock.push(frame);
    };
  }, useDummy);

  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const pointer = { x: 80, y: 80 };

  function step(message) {
    console.log(message);
  }

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
  }

  async function moveTo(x, y) {
    const fromX = pointer.x;
    const fromY = pointer.y;
    const distance = Math.hypot(x - fromX, y - fromY);
    const duration = Math.min(980, Math.max(420, distance * 0.85));
    const steps = Math.max(18, Math.round(duration / 16));
    for (let i = 1; i <= steps; i += 1) {
      const t = easeInOut(i / steps);
      const nextX = fromX + (x - fromX) * t;
      const nextY = fromY + (y - fromY) * t;
      await page.mouse.move(nextX, nextY);
      await page.evaluate(([cx, cy]) => window.__moveDemoCursor(cx, cy), [nextX, nextY]);
      await page.waitForTimeout(duration / steps);
    }
    pointer.x = x;
    pointer.y = y;
  }

  async function clickLocator(locator) {
    await locator.waitFor();
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error("the target is not visible");
    }
    await moveTo(box.x + box.width / 2, box.y + Math.min(box.height / 2, 36));
    await page.waitForTimeout(90);
    await page.mouse.down();
    await page.waitForTimeout(70);
    await page.mouse.up();
  }

  async function typeInto(locator, text) {
    await clickLocator(locator);
    const chars = [...text];
    if (chars.length === 0) return;
    // A long box finishes in about 5 seconds. A short name stays brisk.
    const budget = Math.min(5000, chars.length * 28);
    const chunk = Math.max(1, Math.ceil(chars.length / 70));
    const started = Date.now();
    let index = 0;
    while (index < chars.length) {
      let piece = "";
      const end = Math.min(chars.length, index + chunk);
      while (index < end) {
        if (chars[index] === "\n") {
          if (piece) {
            await page.keyboard.insertText(piece);
            piece = "";
          }
          await page.keyboard.press("Shift+Enter");
          index += 1;
          break;
        }
        piece += chars[index];
        index += 1;
      }
      if (piece) await page.keyboard.insertText(piece);
      const wait = Math.round((index / chars.length) * budget) - (Date.now() - started);
      if (wait > 0) await page.waitForTimeout(wait);
    }
  }

  async function pushFrame(frame) {
    await page.evaluate((item) => window.__demoPush(item), frame);
  }

  async function pushPlan(labels, doneCount) {
    const steps = labels.map((label, index) => ({
      id: `s${index + 1}`,
      label,
      state: index < doneCount ? "done" : index === doneCount ? "active" : "pending",
    }));
    await pushFrame({ type: "plan", steps });
  }

  async function pushPresence(agentId, state) {
    await pushFrame({ type: "presence", agent_id: agentId, state });
  }

  async function pushChat(turn, id) {
    await pushFrame({
      type: "message.final",
      chat_id: "channel",
      message: {
        id,
        role: "agent",
        text: turn.text,
        created_at_ms: Date.now(),
        agent_id: turn.agentId,
        sender: turn.sender,
      },
    });
  }

  // Each specialist speaks in General, the roster dot turns yellow, and one plan step advances.
  async function playSwarm(reply) {
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll(".plan li span")]
        .map((node) => (node.textContent || "").trim())
        .filter(Boolean),
    );
    const turns = reply.turns || [];
    await pushPresence(reply.agentId, "thinking");
    await page.waitForTimeout(turns.length ? 1200 : 4000);
    for (let i = 0; i < turns.length; i += 1) {
      const turn = turns[i];
      await pushPresence(reply.agentId, "online");
      await pushPresence(turn.agentId, "thinking");
      await page.waitForTimeout(1600);
      await pushChat(turn, `m_dummy_${turn.agentId}`);
      await page.locator(".conversation .msg-name", { hasText: turn.sender }).waitFor();
      await pushPresence(turn.agentId, "online");
      if (labels.length) await pushPlan(labels, Math.min(i + 1, labels.length));
      await page.waitForTimeout(800);
    }
    await pushPresence(reply.agentId, "thinking");
    await page.waitForTimeout(1200);
    await pushChat(reply, "m_dummy_reply");
    await page.locator(".conversation .msg.agent .bubble").filter({ hasText: reply.mark }).waitFor();
    await pushPresence(reply.agentId, "online");
    if (labels.length) await pushPlan(labels, labels.length);
  }

  async function openNamedChat(title) {
    const row = page.locator("button.chat-row").filter({
      has: page.locator("strong", { hasText: title === "General" ? /^General$/ : title }),
    });
    const ready = page.waitForResponse(
      (res) => res.request().method() === "GET" && res.url().includes("/messages") && res.ok(),
    );
    await clickLocator(row);
    await ready;
    await page.getByLabel("Message").waitFor();
  }

  async function playPrivate(direct) {
    await openNamedChat(direct.chatName);
    await typeInto(page.getByLabel("Message"), direct.question.trim());
    await clickLocator(page.getByRole("button", { name: "Send", exact: true }));
    await page.locator(".thread .msg.user .bubble").filter({ hasText: direct.question.trim() }).waitFor();
    await page.locator(".bubble.thinking").waitFor();
    await page.waitForTimeout(2500);
    await pushFrame({
      type: "message.final",
      chat_id: direct.agentId,
      message: {
        id: "m_dummy_private",
        role: "agent",
        text: direct.text,
        created_at_ms: Date.now(),
        agent_id: direct.agentId,
        sender: direct.chatName,
      },
    });
    await page.locator(".conversation .msg.agent .bubble").filter({ hasText: direct.mark }).waitFor();
    await showReply();
  }

  async function openNewProject() {
    const start = page.getByRole("button", { name: "New project" });
    const name = page.getByLabel("Project name");
    await start.waitFor();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await clickLocator(start);
      try {
        await name.waitFor({ timeout: 3000 });
        return;
      } catch {
        step("new project click landed before the page was ready, retrying");
      }
    }
    await name.waitFor();
  }

  async function settleReply() {
    let last = -1;
    let stableFor = 0;
    const started = Date.now();
    while (Date.now() - started < 600_000) {
      const length = await page.evaluate(() => {
        const bubbles = [...document.querySelectorAll(".conversation .msg.agent .bubble")];
        const sizes = bubbles
          .filter((bubble) => !bubble.classList.contains("thinking"))
          .map((bubble) => (bubble.textContent || "").trim().length);
        return sizes.length ? Math.max(...sizes) : 0;
      });
      if (length > 400 && length === last) {
        stableFor += 400;
        if (stableFor >= 1600) return;
      } else {
        stableFor = 0;
      }
      last = length;
      await page.waitForTimeout(400);
    }
    throw new Error("the reply did not settle");
  }

  async function showReply() {
    const bounds = await page.evaluate(() => {
      const thread = document.querySelector(".conversation .thread");
      const user = [...document.querySelectorAll(".conversation .thread .msg.user")].at(-1);
      if (!thread || !user) return null;
      const delta = user.getBoundingClientRect().bottom - thread.getBoundingClientRect().top;
      thread.scrollTop += delta;
      return {
        start: thread.scrollTop,
        max: Math.max(thread.scrollTop, thread.scrollHeight - thread.clientHeight),
      };
    });
    if (!bounds) return;
    await page.waitForTimeout(1600);
    const distance = Math.max(0, bounds.max - bounds.start);
    const duration = Math.min(12000, Math.max(2200, distance * 3));
    const steps = Math.max(20, Math.round(duration / 40));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
      await page.evaluate((y) => {
        const thread = document.querySelector(".conversation .thread");
        if (thread) thread.scrollTop = y;
      }, bounds.start + distance * eased);
      await page.waitForTimeout(duration / steps);
    }
    await page.waitForTimeout(1500);
  }

  async function chooseModel() {
    const select = page.getByLabel("Model");
    try {
      await select.waitFor({ timeout: 5000 });
    } catch {
      step("this chat has no model menu");
      return;
    }
    const chosen = await select.evaluate((node, part) => {
      const hit = [...node.options].find((option) => (option.textContent || "").includes(part));
      if (!hit) return "";
      node.value = hit.value;
      node.dispatchEvent(new Event("change", { bubbles: true }));
      return (hit.textContent || "").trim();
    }, modelLabel);
    step(chosen ? `model ${chosen}` : `model ${modelLabel} is not listed`);
  }

  let createdProjectId = "";
  page.on("response", async (response) => {
    if (response.request().method() !== "POST" || !response.ok()) return;
    if (!response.url().endsWith("/api/projects")) return;
    try {
      const body = await response.json();
      if (body && body.id) createdProjectId = body.id;
    } catch {
      // A project response with no JSON body is not the create call.
    }
  });

  try {
    step(`open ${appUrl}`);
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.mouse.move(pointer.x, pointer.y);
    await page.evaluate(([cx, cy]) => window.__moveDemoCursor(cx, cy), [pointer.x, pointer.y]);
    await openNewProject();

    step("name the project");
    await typeInto(page.getByLabel("Project name"), projectName);
    await clickLocator(page.getByRole("button", { name: "Confirm", exact: true }));

    step("pick the team template");
    await clickLocator(page.locator("button.template-card", { hasText: template }));
    await clickLocator(page.getByRole("button", { name: "Continue", exact: true }));

    if (evidence.trim()) {
      step("add the source pack");
      await typeInto(page.getByLabel("Knowledge text"), evidence.trim());
      await clickLocator(page.getByRole("button", { name: "Add text", exact: true }));
      await page.locator(".seed-list .seed-kind", { hasText: "text" }).waitFor();
      await page.waitForTimeout(1500);
    }

    step("create the project");
    await clickLocator(page.getByRole("button", { name: "Create", exact: true }));

    step(`open ${chatName}`);
    const chat = page.locator("button.chat-row").filter({
      has: page.locator("strong", {
        hasText: chatName === "General" ? /^General$/ : chatName,
      }),
    });
    await chat.waitFor({ timeout: 20_000 });
    await clickLocator(chat);
    await page.getByLabel("Message").waitFor();
    await chooseModel();

    step("send the question");
    await typeInto(page.getByLabel("Message"), question.trim());
    await clickLocator(page.getByRole("button", { name: "Send", exact: true }));
    await page.locator(".thread .msg.user .bubble").filter({ hasText: sentMark }).waitFor();
    await page.locator(".bubble.thinking").waitFor();

    if (useDummy) {
      const reply = dummyReplies[recordingName];
      if (!reply) throw new Error(`no saved reply for ${recordingName}`);
      step("show the swarm, then the saved reply");
      await playSwarm(reply);
    }

    step("wait for the reply");
    await settleReply();
    await showReply();

    const saved = useDummy ? dummyReplies[recordingName] : null;
    if (saved && saved.private) {
      step(`ask ${saved.private.chatName}`);
      await playPrivate(saved.private);
    }
    if (saved && saved.artifacts && saved.artifacts.length) {
      if (!createdProjectId) throw new Error("the new project id was not captured");
      step("inject artifacts and copy the knowledge graph");
      const artifacts = await prepareReplay(createdProjectId, saved);
      await pushFrame({ type: "artifact", artifacts });
    }

    step("show artifacts and the knowledge graph");
    await clickLocator(page.getByRole("tab", { name: "Artifacts", exact: true }));
    if (saved && saved.artifacts && saved.artifacts.length) {
      await page.locator(".file-card").nth(saved.artifacts.length - 1).waitFor();
    }
    await page.waitForTimeout(2500);
    await clickLocator(page.getByRole("tab", { name: "Knowledge", exact: true }));
    if (saved && saved.replayProject) {
      await page.getByText("Drag to move").waitFor();
    }
    await page.waitForTimeout(2500);
    await clickLocator(page.getByRole("tab", { name: "Chats", exact: true }));
    await page.waitForTimeout(2000);
    step("demo completed");
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    if (video) {
      const saved = await video.path();
      const target = new URL(await recordingFileName(recordingName), outputDir);
      await rename(saved, target);
      step(`video saved to ${target.pathname}`);
    }
    await browser.close();
  }
}

async function recordingFileName(kind) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const base = `${kind}_${date}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
  let name = `${base}.webm`;
  for (let extra = 2; ; extra += 1) {
    try {
      await access(new URL(name, outputDir));
      name = `${base}_${extra}.webm`;
    } catch {
      return name;
    }
  }
}
