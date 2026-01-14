import { ipcMain as w, dialog as y, shell as P, app as m, BrowserWindow as v, protocol as S, nativeImage as T } from "electron";
import { fileURLToPath as j } from "node:url";
import a from "node:path";
import D from "node:crypto";
import u from "node:fs/promises";
const R = a.dirname(j(import.meta.url));
process.env.APP_ROOT = a.join(R, "..");
const f = process.env.VITE_DEV_SERVER_URL, z = a.join(process.env.APP_ROOT, "dist-electron"), E = a.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = f ? a.join(process.env.APP_ROOT, "public") : E;
let l;
const I = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".heic"]), _ = /* @__PURE__ */ new Set([".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"]), L = async (e) => {
  const r = await u.readFile(e);
  return D.createHash("sha256").update(r).digest("hex");
}, C = async (e) => {
  try {
    const r = T.createFromPath(e).resize({ width: 9, height: 8 });
    if (r.isEmpty()) return;
    const o = r.toBitmap(), n = [];
    for (let s = 0; s < 8; s += 1)
      for (let t = 0; t < 9; t += 1) {
        const c = (s * 9 + t) * 4, d = o[c], h = o[c + 1], p = o[c + 2];
        n.push(Math.round(d * 0.299 + h * 0.587 + p * 0.114));
      }
    let i = "";
    for (let s = 0; s < 8; s += 1)
      for (let t = 0; t < 8; t += 1) {
        const c = n[s * 9 + t], d = n[s * 9 + t + 1];
        i += c > d ? "1" : "0";
      }
    return parseInt(i, 2).toString(16).padStart(16, "0");
  } catch {
    return;
  }
}, b = async (e, r) => {
  const o = [], n = await u.readdir(e, { withFileTypes: !0 });
  for (const i of n) {
    const s = a.join(e, i.name);
    if (i.isDirectory()) {
      o.push(...await b(s, r));
      continue;
    }
    if (!i.isFile()) continue;
    const t = a.extname(i.name).toLowerCase();
    !I.has(t) && !_.has(t) || o.push({ path: s, folder: r });
  }
  return o;
}, F = async (e, r) => {
  const o = a.extname(e).toLowerCase(), n = I.has(o), i = _.has(o);
  if (!n && !i) return null;
  const s = await u.stat(e), t = e.toLowerCase().includes("screenshot") ? "Screenshot" : s.size < 200 * 1024 ? "Sehr klein" : void 0, c = n ? await L(e) : void 0, d = n ? await C(e) : void 0;
  return console.log(`Gelesen: ${e}`), {
    id: a.basename(e),
    name: a.basename(e),
    path: e,
    fileUrl: `media://${encodeURIComponent(e)}`,
    size: s.size,
    modifiedAt: s.mtimeMs,
    type: n ? "image" : "video",
    folder: r,
    autoFlag: t,
    hash: c,
    dHash: d
  };
}, O = () => {
  S.registerFileProtocol("media", (e, r) => {
    const o = e.url.replace("media://", ""), n = decodeURIComponent(o);
    r({ path: n });
  });
}, x = () => {
  l = new v({
    icon: a.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: a.join(R, "preload.mjs")
    }
  }), l.webContents.on("did-finish-load", () => {
    l == null || l.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), f ? l.loadURL(f) : l.loadFile(a.join(E, "index.html"));
};
w.handle("pick-folders", async (e) => {
  const r = await y.showOpenDialog({
    properties: ["openDirectory", "multiSelections"]
  });
  if (r.canceled)
    return { folders: [], items: [] };
  const o = r.filePaths, n = (await Promise.all(
    o.map(async (p) => b(p, p))
  )).flat(), i = n.length;
  let s = 0;
  const t = [];
  if (i === 0)
    return e.sender.send("scan-progress", { loaded: 0, total: 0 }), { folders: o, items: t };
  e.sender.send("scan-progress", { loaded: 0, total: i });
  let c = 0;
  const d = Math.min(4, i), h = Array.from({ length: d }, async () => {
    for (; c < n.length; ) {
      const p = n[c];
      c += 1;
      const g = await F(p.path, p.folder);
      g && t.push(g), s += 1, e.sender.send("scan-progress", { loaded: s, total: i });
    }
  });
  return await Promise.all(h), { folders: o, items: t };
});
w.handle("move-to-trash", async (e, r) => {
  const o = [], n = [], i = r.length;
  let s = 0;
  if (i === 0)
    return e.sender.send("trash-progress", { processed: 0, total: 0 }), { trashed: o, failed: n };
  e.sender.send("trash-progress", { processed: s, total: i });
  for (const t of r) {
    try {
      await P.trashItem(t), console.log(`Gelöscht: ${t}`), o.push(t);
    } catch {
      n.push(t);
    }
    s += 1, e.sender.send("trash-progress", { processed: s, total: i });
  }
  return { trashed: o, failed: n };
});
m.on("window-all-closed", () => {
  process.platform !== "darwin" && (m.quit(), l = null);
});
m.on("activate", () => {
  v.getAllWindows().length === 0 && x();
});
m.whenReady().then(() => {
  O(), x();
});
export {
  z as MAIN_DIST,
  E as RENDERER_DIST,
  f as VITE_DEV_SERVER_URL
};
