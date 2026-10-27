import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const appUrl = process.env.DEMO_APP_URL || "http://127.0.0.1:3000";
const recordVideo = process.env.DEMO_RECORD === "1";
const outputDir = new URL("./artifacts/", import.meta.url);
const typeDelayMs = 32;

const projectName = `Wi-Fi Sensing Review`;

const evidence = `
Source pack:
Wi-Fi CSI human-activity-recognition studies often report performance drops across rooms, users, orientations, and device placements. Compare the evidence carefully. Distinguish reported findings from hypotheses.
`.trim();

const question = `
Using the project source pack, explain why Wi-Fi CSI human-activity-recognition results degrade across rooms, users, and device placements.

Deliver:
1. an evidence map with each source's setting, evaluation split, and claim;
2. one falsifiable hypothesis explaining the conflicting findings;
3. a leakage-resistant research protocol using cross-room, cross-user, and
   cross-device evaluation;
4. baselines, metrics, controlled variables, and rejection criteria;
5. a skeptical review identifying confounders and reproducibility risks.

Do not claim experimental results. Clearly distinguish evidence, hypothesis,
and proposed evaluation.
`.trim();

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

await context.addInitScript(() => {
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
});

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
  // Plain Enter sends the chat message. Shift+Enter inserts a newline.
  for (const char of text) {
    if (char === "\n") {
      await page.keyboard.press("Shift+Enter");
      await page.waitForTimeout(typeDelayMs);
      continue;
    }
    await page.keyboard.type(char, { delay: typeDelayMs });
  }
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

// A click during hydration hits the button and React drops it. Retry until the wizard opens.
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

try {
  step(`open ${appUrl}`);
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.mouse.move(pointer.x, pointer.y);
  await page.evaluate(([cx, cy]) => window.__moveDemoCursor(cx, cy), [pointer.x, pointer.y]);
  await openNewProject();

  step("name the project");
  await typeInto(page.getByLabel("Project name"), projectName);
  await clickLocator(page.getByRole("button", { name: "Confirm", exact: true }));

  step("pick the autoresearch template");
  await clickLocator(page.locator("button.template-card", { hasText: /autoresearch/i }));
  await clickLocator(page.getByRole("button", { name: "Continue", exact: true }));

  step("add the source pack");
  await typeInto(page.getByLabel("Knowledge text"), evidence);
  await clickLocator(page.getByRole("button", { name: "Add text", exact: true }));
  await page.locator(".seed-list .seed-kind", { hasText: "text" }).waitFor();
  await page.waitForTimeout(1500);

  step("create the project");
  await clickLocator(page.getByRole("button", { name: "Create", exact: true }));

  step("open the PI chat");
  const pi = page.locator("button.chat-row").filter({
    has: page.locator("strong", { hasText: "Principal Investigator" }),
  });
  await pi.waitFor({ timeout: 20_000 });
  await clickLocator(pi);
  await page.locator(".thread .msg.agent .bubble").filter({ hasText: "I split the goal" }).waitFor();
  await page.waitForTimeout(2500);

  step("send the question");
  await typeInto(page.getByLabel("Message"), question);
  await clickLocator(page.getByRole("button", { name: "Send", exact: true }));
  await page.locator(".thread .msg.user .bubble").filter({ hasText: "evidence map" }).waitFor();
  await page.locator(".bubble.thinking").waitFor();

  step("wait for the research reply in the PI chat");
  await settleReply();
  await showReply();
  step("demo completed");
} finally {
  const video = page.video();
  await page.close();
  if (video) {
    step(`video saved to ${await video.path()}`);
  }
  await context.close();
  await browser.close();
}
