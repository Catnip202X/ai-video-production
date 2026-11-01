#!/usr/bin/env node
// Renders a built anatomy figure (or any page that animates with requestAnimationFrame) to a repeatable video.
// The page's clock is replaced before it loads, then stepped one video frame at a time, so a run gives the same
// frames every time and never depends on how fast the machine is. No npm dependencies: Chrome, ffmpeg and Node 22+.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const USAGE = `node anatomy-to-video.mjs <page.html> --out <file.mp4> --duration <seconds> [options]

  --from <s>          start here; earlier frames are stepped through but not captured (default 0)
  --fps <n>           default 60
  --size <WxH>        output size, default 1920x1080
  --select <css>      element to frame, default .iso-plate if the page has one, else the whole page; "none" for the whole page
  --bg <colour>       fill around the framed element, default black
  --theme <dark|light>  emulate prefers-color-scheme
  --key <t:key>       press a key at t seconds, repeatable, e.g. --key 2.5:ArrowRight
  --crf <n>           default 12`;

function parseArgs(argv) {
  const o = { from: 0, fps: 60, size: "1920x1080", bg: "black", keys: [], crf: 12 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => argv[++i];
    if (a === "--out") o.out = next();
    else if (a === "--duration") o.duration = Number(next());
    else if (a === "--from") o.from = Number(next());
    else if (a === "--fps") o.fps = Number(next());
    else if (a === "--size") o.size = next();
    else if (a === "--select") o.select = next();
    else if (a === "--bg") o.bg = next();
    else if (a === "--theme") o.theme = next();
    else if (a === "--crf") o.crf = Number(next());
    else if (a === "--key") { const [t, key] = next().split(/:(.*)/s); o.keys.push({ t: Number(t), key }); }
    else if (a === "--help" || a === "-h") { console.log(USAGE); process.exit(0); }
    else rest.push(a);
  }
  o.page = rest[0];
  return o;
}

// Runs in the page before any of its own scripts.
function fakeClock() {
  let now = 0, nextId = 1, seed = 0x2f6e2b1;
  let frames = new Map();
  const timers = new Map();
  const realDate = Date;
  performance.now = () => now;
  Date.now = () => 1700000000000 + now;
  window.requestAnimationFrame = (cb) => { const id = nextId++; frames.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { frames.delete(id); };
  window.setTimeout = (fn, ms = 0, ...args) => { const id = nextId++; timers.set(id, { at: now + Number(ms || 0), fn, args }); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = nextId++; timers.set(id, { at: now + Number(ms || 0), fn, args, every: Math.max(1, Number(ms || 0)) }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  Math.random = () => {   // mulberry32, so seeded noise repeats
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Everything counts as on screen: a figure that waits for its element to scroll into view would otherwise stay still.
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(target) { setTimeout(() => this.cb([{ target, isIntersecting: true, intersectionRatio: 1 }], this), 0); }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
  window.__step = (ms) => {
    const end = now + ms;
    for (;;) {
      let due = null, dueId = 0;
      for (const [id, t] of timers) if (t.at <= end && (!due || t.at < due.at || (t.at === due.at && id < dueId))) { due = t; dueId = id; }
      if (!due) break;
      now = Math.max(now, due.at);
      if (due.every) due.at += due.every; else timers.delete(dueId);
      due.fn(...due.args);
    }
    now = end;
    const run = frames;
    frames = new Map();
    for (const cb of run.values()) cb(now);
  };
  // The engine owns time, so CSS must not animate on its own.
  const freeze = () => {
    const s = document.createElement("style");
    s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}*:focus,*:focus-visible{outline:none!important}";
    (document.head || document.documentElement).appendChild(s);
  };
  document.addEventListener("DOMContentLoaded", freeze, { once: true });
  void realDate;
}

function findChrome() {
  const found = [process.env.CHROME, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => p && existsSync(p));
  if (!found) throw new Error("Chrome not found. Set CHROME to its path.");
  return found;
}

function startChrome(profile) {
  const chrome = spawn(findChrome(), ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--use-angle=metal", "--ignore-gpu-blocklist", "--force-color-profile=srgb", "--hide-scrollbars", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const port = new Promise((done, fail) => {
    let text = "";
    const timer = globalThis.setTimeout(() => fail(new Error("Chrome did not start")), 20000);
    chrome.stderr.on("data", (d) => {
      text += d;
      const m = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (m) { clearTimeout(timer); done(Number(m[1])); }
    });
    chrome.on("exit", (code) => fail(new Error(`Chrome exited early: ${code}`)));
  });
  return { chrome, port };
}

async function connect(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((done, fail) => { ws.onopen = done; ws.onerror = () => fail(new Error("Could not reach Chrome")); });
  let id = 0;
  const waiting = new Map(), listeners = new Map();
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && waiting.has(m.id)) {
      const { done, fail } = waiting.get(m.id);
      waiting.delete(m.id);
      if (m.error) fail(new Error(m.error.message)); else done(m.result);
    } else if (m.method) listeners.get(m.method)?.(m.params);
  };
  return {
    send: (method, params = {}) => new Promise((done, fail) => { const i = ++id; waiting.set(i, { done, fail }); ws.send(JSON.stringify({ id: i, method, params })); }),
    on: (method, fn) => listeners.set(method, fn),
    close: () => ws.close(),
  };
}

function memoryFree() {
  if (process.platform !== "darwin") return 100;
  return Number(execFileSync("sysctl", ["-n", "kern.memorystatus_level"]).toString().trim());
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.page || !o.out || !(o.duration > 0)) { console.error(USAGE); process.exit(1); }
  const [W, H] = o.size.split("x").map(Number);
  if (W % 2 || H % 2) throw new Error("--size must be even in both directions");
  if (memoryFree() < 30) throw new Error("Under 30% memory free. Not starting.");
  if (!/^https?:/.test(o.page) && !existsSync(o.page)) throw new Error(`No such page: ${o.page}`);
  const url = /^https?:/.test(o.page) ? o.page : pathToFileURL(resolve(o.page)).href;
  mkdirSync(dirname(resolve(o.out)), { recursive: true });

  const profile = mkdtempSync(join(tmpdir(), "anatomy-video-"));
  const { chrome, port } = startChrome(profile);
  let ffmpeg;
  try {
    const cdp = await connect(await port);
    const pageErrors = [];
    cdp.on("Runtime.exceptionThrown", (p) => pageErrors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text));
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    if (o.theme) await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: o.theme }] });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `(${fakeClock})();` });
    const loaded = new Promise((done) => cdp.on("Page.loadEventFired", done));
    await cdp.send("Page.navigate", { url });
    await loaded;
    const js = async (expression) => {
      const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    await js("document.fonts.ready.then(() => true)");

    const sel = o.select === "none" ? null : o.select || ((await js(`!!document.querySelector(".iso-plate")`)) ? ".iso-plate" : null);
    let clip = null, dsf = 1;
    if (sel) {
      const box = await js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; })()`);
      if (!box) throw new Error(`Nothing matches ${sel}`);
      clip = { ...box, scale: 1 };
      dsf = Math.min(4, Math.ceil(Math.min(W / box.width, H / box.height)));   // vector art: draw at output size, don't upscale
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: dsf, mobile: false });
    }

    ffmpeg = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-c:v", "png", "-framerate", String(o.fps), "-i", "-",
      "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${o.bg}`,
      "-c:v", "libx264", "-preset", "slow", "-crf", String(o.crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", resolve(o.out)], { stdio: ["pipe", "inherit", "inherit"] });
    const finished = new Promise((done, fail) => { ffmpeg.on("exit", (c) => (c === 0 ? done() : fail(new Error(`ffmpeg exited ${c}`)))); ffmpeg.stdin.on("error", fail); });

    const ms = 1000 / o.fps, first = Math.round(o.from * o.fps), total = first + Math.round(o.duration * o.fps);
    const keys = o.keys.map((k) => ({ ...k, frame: Math.round(k.t * o.fps) }));
    const started = Date.now();
    await js(`document.querySelector('[tabindex]')?.focus()`);
    for (let n = 0; n < total; n++) {
      for (const k of keys) if (k.frame === n) {
        await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: k.key, code: k.key });
        await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: k.key, code: k.key });
      }
      await js(`__step(${n === 0 ? 0 : ms})`);
      if (n < first) continue;
      if (pageErrors.length) throw new Error(`Page error: ${pageErrors[0]}`);
      if (n % 60 === 0 && memoryFree() < 10) throw new Error("Under 10% memory free. Stopping.");
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !!clip, ...(clip ? { clip } : {}) });
      if (!ffmpeg.stdin.write(Buffer.from(data, "base64"))) await new Promise((done) => ffmpeg.stdin.once("drain", done));
      if ((n - first) % 60 === 0) process.stderr.write(`\r  ${n - first}/${total - first} frames`);
    }
    ffmpeg.stdin.end();
    await finished;
    cdp.close();

    const got = Number(execFileSync("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", resolve(o.out)]).toString().trim());
    if (got !== total - first) throw new Error(`Expected ${total - first} frames, the file has ${got}`);
    console.error(`\nDone: ${got} frames in ${((Date.now() - started) / 1000).toFixed(1)} s -> ${o.out}`);
  } catch (err) {
    ffmpeg?.stdin.destroy();
    ffmpeg?.kill("SIGKILL");
    if (existsSync(o.out)) rmSync(o.out, { force: true });
    throw err;
  } finally {
    chrome.kill("SIGKILL");
    rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((err) => { console.error(`Render failed: ${err.message}`); process.exit(1); });
