import j, { join as te } from "node:path";
import { app as u, screen as D, BrowserWindow as Ae, shell as De, session as ee, ipcMain as R, desktopCapturer as pe, globalShortcut as ie, systemPreferences as ye, protocol as ke, net as ut, Menu as Be } from "electron";
import { PostHog as pt } from "posthog-node";
import { uuidv7 as qe } from "uuidv7";
import { electronApp as ht } from "@electron-toolkit/utils";
import { randomUUID as $e } from "node:crypto";
import { v4 as gt } from "uuid";
import { createRouter as ft } from "radix3";
import o, { z } from "zod";
import { existsSync as mt, writeFileSync as wt, unlinkSync as bt } from "node:fs";
import yt from "electron-updater";
import { spawn as Te, execSync as Le } from "node:child_process";
import { spawn as vt } from "child_process";
import { EventEmitter as St } from "events";
import { EventEmitter as Ge } from "node:events";
import b from "@recallai/desktop-sdk";
import Dt from "screenshot-desktop";
import { pathToFileURL as Rt } from "node:url";
import { electronAppUniversalProtocolClient as xe } from "electron-app-universal-protocol-client";
import At from "node:module";
const ro = import.meta.filename, se = import.meta.dirname, Ye = At.createRequire(import.meta.url), B = process.platform === "darwin", S = process.platform === "win32", Ce = process.platform === "linux", v = process.env.NODE_ENV === "development";
process.env.NODE_ENV;
const U = `interviewcoder${v ? "-dev" : ""}`, kt = 14, ve = "https://downloads.v2.interviewcoder.co/downloads/", Xe = "interviewcoder", K = "InterviewCoder", Tt = "isDashboard";
if (v && process.env.PLAYWRIGHT_ENV !== "test") {
  const t = `${Xe}-dev`, e = u.getPath("userData");
  u.setPath("userData", j.join(j.dirname(e), t)), console.log(`App userData path: ${u.getPath("userData")}`);
}
let Y = { type: "anonymous", randomDistinctId: qe() };
const ue = new pt("phc_AXG9qwwTAPSJJ68tiYxIujNSztjw0Vm5J6tYpPdxiDh", {
  host: "https://us.i.posthog.com",
  // handles uncaught exceptions and unhandled rejections
  enableExceptionAutocapture: !0
});
function Ct(t) {
  Y.type === "anonymous" && ue?.capture({
    distinctId: t,
    event: "$merge_dangerously",
    properties: {
      alias: Y.randomDistinctId
    }
  }), Y = { type: "identified", userEmail: t }, ue?.identify({ distinctId: t });
}
function Et() {
  const t = qe();
  Y = { type: "anonymous", randomDistinctId: t }, ue?.identify({ distinctId: t });
}
function $(...t) {
  console.error(...t);
  const e = t.map(
    (r) => r instanceof Error ? r.message : typeof r == "object" && r !== null ? JSON.stringify(r) : String(r)
  ).join(`
`), s = t.filter((r) => r instanceof Error).map((r) => ({
    name: r.name,
    message: r.message,
    stack: r.stack
  })), n = Y.type === "anonymous" ? Y.randomDistinctId : Y.userEmail;
  ue?.captureException(new Error(e), n, { referencedErrors: s });
}
function Je(t) {
  v || u.getLoginItemSettings().openAtLogin !== t && u.setLoginItemSettings({
    openAtLogin: t,
    openAsHidden: !1
    // Always show the app when auto-launching
  });
}
const Ee = te(u.getPath("userData"), "onboarding.done");
let _e = mt(Ee);
function Qe() {
  return _e;
}
function _t() {
  wt(Ee, ""), _e = !0, a.createOrRecreateWindows({ justFinishedOnboarding: !0 });
}
function Ze() {
  try {
    bt(Ee);
  } catch {
  }
  _e = !1, a.createOrRecreateWindows();
}
function It(t, e, s, n) {
  e = Math.floor(e), s = Math.floor(s);
  const i = D.getPrimaryDisplay().displayFrequency;
  let l = Math.min(Math.max(i, 30), 360);
  i > 60 && (l = Math.max(60, Math.floor(i / 2)));
  const c = 1e3 / l, p = t.getBounds(), f = p.width, m = p.height, C = p.x, E = p.y, k = C + Math.floor((f - e) / 2), L = E + Math.floor((m - s) / 2), x = e - f, g = s - m, T = k - C, y = L - E, I = Math.floor(n / c);
  let Q = 0;
  const oe = Date.now();
  let F = null;
  const Pe = () => {
    const We = Date.now() - oe;
    if (Q = Math.min(I, Math.floor(We / c)), Q < I) {
      const ne = Ot(We / n), fe = Math.floor(f + x * ne), me = Math.floor(m + g * ne), we = Math.floor(C + T * ne), be = Math.floor(E + y * ne);
      if (S) {
        const re = t.getBounds();
        (Math.abs(re.width - fe) >= 1 || Math.abs(re.height - me) >= 1 || Math.abs(re.x - we) >= 1 || Math.abs(re.y - be) >= 1) && t.setBounds(
          {
            x: we,
            y: be,
            width: fe,
            height: me
          },
          !1
        );
      } else
        t.setBounds({
          x: we,
          y: be,
          width: fe,
          height: me
        });
      F = setTimeout(Pe, c);
    } else
      t.setBounds({
        x: k,
        y: L,
        width: e,
        height: s
      }), t.setResizable(!1), F !== null && (clearTimeout(F), F = null);
  }, Ne = t.isResizable();
  return Ne || t.setResizable(!0), Pe(), {
    cancel: () => {
      F !== null && (clearTimeout(F), F = null), t.setBounds({
        x: k,
        y: L,
        width: e,
        height: s
      }), t.setResizable(Ne);
    }
  };
}
function Ot(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
const { autoUpdater: H } = yt, Mt = 1e3 * 60 * 60;
let q = { state: "none" }, et = !1;
function Pt() {
  if (v || !ve || ve === "") {
    console.log("[AutoUpdate] Skipped - no update endpoint configured");
    return;
  }
  try {
    H.on("update-available", (t) => {
      q = { state: "available", version: t.version }, a.sendToWebContents("updater-state", q);
    }), H.on("update-downloaded", (t) => {
      q = { state: "downloaded", version: t.version }, a.sendToWebContents("updater-state", q);
    }), H.setFeedURL({
      provider: "generic",
      url: ve
    }), console.log("[AutoUpdate] Checking for updates..."), H.checkForUpdates(), setInterval(() => {
      console.log("[AutoUpdate] Checking for updates..."), H.checkForUpdates();
    }, Mt);
  } catch (t) {
    console.error("[AutoUpdate] Failed to set up auto-update:", t);
  }
}
function tt() {
  return q;
}
function st() {
  q.state !== "none" && (Ue(q.version) === Ue(u.getVersion()) ? a.createOrRecreateWindows() : (et = !0, H.quitAndInstall()));
}
function Nt() {
  return et;
}
function Ue(t) {
  return t.split(".").slice(0, 2).join(".");
}
const Wt = "2.6.0", je = {
  version: Wt
};
class Ie {
  constructor(e, s) {
    if (this.moreOptions = s, this.window = new Ae(
      e || {
        show: !1,
        type: "panel",
        // window style options
        alwaysOnTop: !0,
        transparent: !0,
        frame: !1,
        roundedCorners: !1,
        hasShadow: !1,
        // window resize options
        fullscreenable: !1,
        minimizable: !1,
        // macOS specific options
        hiddenInMissionControl: !0,
        // Windows specific options
        skipTaskbar: !0,
        // will be overwritten by this.restoreUndetectability()
        webPreferences: {
          preload: te(se, "../preload/index.cjs")
        }
      }
    ), this.window.setTitle(K), this.restoreUndetectability(), (S || B) && (this.window.on("show", () => {
      this.restoreUndetectability();
    }), this.window.on("restore", () => {
      this.restoreUndetectability();
    }), this.window.on("focus", () => {
      this.restoreUndetectability();
    })), s.alwaysOnTop && (this.window.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), this.window.setResizable(!1), S && (this.window.setAlwaysOnTop(!0, "screen-saver", 1), this.window.webContents.setBackgroundThrottling(!1)), B)) {
      let n = !1;
      const r = setInterval(() => {
        if (this.window.isDestroyed()) {
          clearInterval(r);
          return;
        }
        !this.window.isFocused() && !n ? (this.window.showInactive(), n = !0) : this.window.isFocused() && n && (n = !1);
      }, 100);
      this.disposers.push(() => clearInterval(r));
    }
    this.moveToDisplay(s.initialDisplay), this.setIgnoreMouseEvents(!0), this.window.once("ready-to-show", () => {
      s.alwaysOnTop && this.window.show(), this.window.setTitle(K);
    }), this.window.on("page-title-updated", () => {
      this.window.getTitle() !== K && this.window.setTitle(K);
    }), this.window.webContents.on("will-navigate", (n) => {
      n.preventDefault();
    }), this.window.webContents.setWindowOpenHandler((n) => {
      try {
        const r = new URL(n.url);
        (r.protocol === "https:" || v && r.protocol === "http:" || r.protocol === "mailto:") && (De.openExternal(n.url), a.sendToWebContents("opened-external-link", { url: n.url }));
      } catch (r) {
        $(`error trying to open url ${n.url}`, r);
      }
      return { action: "deny" };
    }), u.on("before-quit", () => {
      this.isActuallyClosing = !0;
    }), this.window.on("close", (n) => {
      this.isActuallyClosing || Nt() || (n.preventDefault(), this.fakeClose());
    }), this.loadRenderer(), s.justFinishedOnboarding && this.window.webContents.once("did-finish-load", () => {
      a.sendToWebContents("trigger-login", null);
    });
  }
  window;
  disposers = [];
  isActuallyClosing = !1;
  validateLatestVersion(e) {
    const s = e.split(".");
    if (s.length === 3) {
      const [n, r] = je.version.split("."), [i, l] = s;
      if (n === i && r && l)
        return !0;
    }
    return !1;
  }
  async getRemoteRendererUrl() {
    const s = `/${B ? "osx" : "win"}`, [n, r] = je.version.split("."), l = await (await fetch(`${s}/${n}.${r}.x`)).text();
    if (!this.validateLatestVersion(l))
      throw new Error(`Invalid latest version: ${l}`);
    const c = `/${l}/index.html?appVersion=${l}`;
    return `${s}${c}`;
  }
  loadOfflineView(e = !1) {
    const s = e ? process.env.ELECTRON_RENDERER_URL : "app://renderer";
    this.window.loadURL(`${s}/offline.html`);
  }
  async loadRenderer(e = !1) {
    const s = (n) => {
      const r = new URL(n);
      return this.moreOptions.searchParams.forEach((i, l) => {
        r.searchParams.append(l, i);
      }), r.toString();
    };
    if (v && process.env.ELECTRON_RENDERER_URL && !e) {
      this.window.loadURL(s(`${process.env.ELECTRON_RENDERER_URL}/index.html`));
      return;
    }
    {
      this.window.loadURL(s("app://renderer/index.html"));
      return;
    }
  }
  /**
   * You should probably use windowManager.sendToWebContents() instead.
   */
  sendToWebContents(e, s) {
    this.window.isDestroyed() || this.window.webContents.send(e, s);
  }
  isIpcEventFromWindow(e) {
    return e.sender === this.window.webContents;
  }
  setIgnoreMouseEvents(e) {
    this.window.setIgnoreMouseEvents(e, { forward: !0 });
  }
  resizeWindow(e, s, n) {
    It(this.window, e, s, n);
  }
  focus() {
    this.window.focus();
  }
  blur() {
    S && (this.window.setFocusable(!1), this.window.setFocusable(!0)), this.restoreUndetectability(), this.window.blur();
  }
  close() {
    this.window.isDestroyed() || (this.isActuallyClosing = !0, this.window.close(), this.disposers.forEach((e) => e()));
  }
  onceDidFinishLoad(e) {
    this.window.webContents.once("did-finish-load", e);
  }
  isDestroyed() {
    return this.window.isDestroyed();
  }
  getBounds() {
    return this.window.getBounds();
  }
  /**
   * You should probably use windowManager.setTargetDisplay() instead so that
   * the chosen display is remembered across window recreations.
   */
  moveToDisplay(e, s) {
    this.window.setBounds(
      {
        x: e.workArea.x,
        y: e.workArea.y,
        width: e.workArea.width,
        height: e.workArea.height
      },
      !1
    ), a.sendToWebContents("display-changed", {
      preservePosition: s?.preservePosition,
      cursorScreenX: s?.cursorScreenX,
      cursorScreenY: s?.cursorScreenY
    });
  }
  reload() {
    this.window.webContents.reload();
  }
  onUnload(e) {
    this.window.webContents.on("did-navigate", e);
  }
  toggleDevTools() {
    this.window.webContents.isDevToolsOpened() ? this.window.webContents.closeDevTools() : (this.window.webContents.openDevTools({ mode: "detach" }), u.focus());
  }
  closeDevTools() {
    this.window.webContents.closeDevTools();
  }
  setContentProtection(e) {
    this.window.setContentProtection(e);
  }
  restoreUndetectability() {
    const e = this.moreOptions.getUndetectabilityEnabled();
    this.window.setContentProtection(e), S && this.window.setSkipTaskbar(e || this.moreOptions.forceSkipTaskbar);
  }
  fakeClose() {
    a.fakeQuit();
  }
}
class le extends Ie {
  constructor(e) {
    const s = {
      show: !1,
      alwaysOnTop: !1,
      transparent: !0,
      frame: !1,
      roundedCorners: !1,
      hasShadow: !0,
      fullscreenable: !1,
      minimizable: !1,
      resizable: !1,
      hiddenInMissionControl: !1,
      skipTaskbar: !0,
      // will be overwritten by this.restoreUndetectability()
      webPreferences: {
        preload: te(se, "../preload/index.cjs")
      }
    };
    super(s, e), this.window.once("ready-to-show", () => {
      this.window.show();
    });
  }
  setIgnoreMouseEvents(e) {
  }
  show() {
    this.window.blur(), this.window.hide(), setTimeout(() => {
      this.window.show(), this.window.focus();
    }, 100);
  }
}
class _ extends Ie {
  static DEFAULT_WIDTH = 1200;
  static DEFAULT_HEIGHT = 800;
  static MIN_WIDTH = 800;
  static MIN_HEIGHT = 600;
  constructor(e) {
    const s = {
      show: !1,
      // start hidden
      frame: !0,
      transparent: !1,
      fullscreenable: !1,
      titleBarStyle: "hidden",
      // windows
      titleBarOverlay: { color: "#FAFAFA", height: 34 },
      // mac
      trafficLightPosition: { x: 12, y: 12 },
      minWidth: _.MIN_WIDTH,
      minHeight: _.MIN_HEIGHT,
      hiddenInMissionControl: !1,
      skipTaskbar: !0,
      webPreferences: {
        preload: te(se, "../preload/index.cjs")
      }
    };
    super(s, {
      alwaysOnTop: !1,
      initialDisplay: e.initialDisplay,
      getUndetectabilityEnabled: he,
      forceSkipTaskbar: !1,
      justFinishedOnboarding: !1,
      searchParams: new URLSearchParams({ [Tt]: "1" })
    }), this.centerOnDisplay(e.initialDisplay);
  }
  setIgnoreMouseEvents(e) {
  }
  setVisibility(e) {
    e ? (this.window.show(), this.window.focus()) : this.window.hide(), a.sendToWebContents("dashboard-visibility", { visible: e });
  }
  maximize() {
    this.window.isMaximized() ? this.window.unmaximize() : this.window.maximize();
  }
  minimize() {
    this.window.minimize();
  }
  isFocused() {
    return this.window.isFocused();
  }
  fakeClose() {
    this.setVisibility(!1), this.sendToWebContents("hide-window", { reason: "native_close_requested" });
  }
  centerOnDisplay(e) {
    const s = e.workArea.width - 100, n = e.workArea.height - 100;
    let r = _.DEFAULT_WIDTH, i = _.DEFAULT_HEIGHT;
    r > s && (r = s), i > n && (i = n), r < _.MIN_WIDTH && (r = _.MIN_WIDTH), i < _.MIN_HEIGHT && (i = _.MIN_HEIGHT), this.window.setBounds({
      x: e.workArea.x + (e.workArea.width - r) / 2,
      y: e.workArea.y + (e.workArea.height - i) / 2,
      width: r,
      height: i
    });
  }
}
class Bt {
  currentWindow = null;
  dashboardWindow = null;
  targetDisplay = null;
  handleDockIcon() {
    if (!B) return;
    this.currentWindow instanceof le ? u.dock?.show() : u.dock?.hide(), u.focus({ steal: !0 });
  }
  createOrRecreateWindows(e) {
    const s = Qe(), n = {
      alwaysOnTop: s,
      initialDisplay: this.getTargetDisplay(),
      getUndetectabilityEnabled: s ? he : () => !1,
      forceSkipTaskbar: s,
      justFinishedOnboarding: e?.justFinishedOnboarding ?? !1,
      searchParams: new URLSearchParams()
    };
    this.currentWindow?.close(), this.currentWindow = s ? new Ie(void 0, n) : new le(n), this.dashboardWindow?.close(), this.dashboardWindow = new _({ initialDisplay: this.getTargetDisplay() }), this.handleDockIcon();
  }
  /** Can only be called after createWindow() */
  getCurrentWindow() {
    if (!this.currentWindow)
      throw new Error("No current window. Did you call createWindow()?");
    return this.currentWindow;
  }
  /** Can only be called after createDashboardWindow() */
  getDashboardWindow() {
    if (!this.dashboardWindow)
      throw new Error("No dashboard window. Did you call createDashboardWindow()?");
    return this.dashboardWindow;
  }
  setTargetDisplay(e, s) {
    this.targetDisplay = e, this.currentWindow?.moveToDisplay(e, {
      preservePosition: s?.preservePosition,
      cursorScreenX: s?.cursorScreenX,
      cursorScreenY: s?.cursorScreenY
    });
  }
  getTargetDisplay() {
    return this.targetDisplay ?? D.getPrimaryDisplay();
  }
  setContentProtection(e) {
    this.currentWindow?.setContentProtection(e), this.dashboardWindow?.setContentProtection(e);
  }
  restoreUndetectability() {
    this.currentWindow?.restoreUndetectability(), this.dashboardWindow?.restoreUndetectability();
  }
  fakeQuit() {
    this.currentWindow instanceof le ? u.quit() : this.dashboardWindow ? (this.getDashboardWindow().setVisibility(!1), this.sendToWebContents("hide-window", { reason: "native_close_requested" })) : this.sendToWebContents("hide-window", { reason: "native_close_requested" });
  }
  sendToWebContents(e, s) {
    this.currentWindow?.sendToWebContents(e, s), this.dashboardWindow?.sendToWebContents(e, s);
  }
}
const a = new Bt(), ot = {
  DASHBOARD_ACTIVITY: !1,
  DEVTOOLS_ENABLED: !1
};
function he() {
  return !0;
}
const nt = "chrome-extension", $t = { "Access-Control-Allow-Origin": "*" }, Se = (t, e = 200) => new Response(t, { status: e, headers: $t }), w = ft();
w.insert("/os/platform/arch", (t) => t.body(process.arch));
w.insert("/os/platform/name", (t) => t.body(process.platform));
w.insert("/app/version", (t) => t.body(u.getVersion()));
w.insert("/app/quit", (t) => (u.quit(), t.body()));
w.insert("/app/install_update", (t) => (st(), t.body()));
w.insert("/app/logout", (t) => (a.sendToWebContents("trigger-logout", null), t.body()));
w.insert("/app/settings/clear", async (t) => (await ee.defaultSession.clearStorageData(), a.sendToWebContents("trigger-logout", null), t.body()));
w.insert("/app/listen/start", async (t) => {
  const e = o.object({ meetingId: o.string().nullable() }), { meetingId: s } = e.parse(await t.request.json());
  return a.sendToWebContents("start-listening", {
    meetingId: s
  }), t.body();
});
w.insert("/app/listen/stop", (t) => (a.sendToWebContents("stop-listening", null), t.body()));
w.insert("/app/listen/resume", async (t) => {
  const e = o.object({ sessionId: o.string() }), { sessionId: s } = e.parse(await t.request.json());
  return a.sendToWebContents("resume-session", { sessionId: s }), t.body();
});
w.insert("/app/open_personalize_modal", (t) => (a.sendToWebContents("open-dashboard-modal", "personalize"), t.body()));
w.insert("/app/settings/poll_updater_state", (t) => (a.sendToWebContents("updater-state", tt()), t.body()));
w.insert("/app/settings/get_auto_launch", (t) => {
  const e = u.getLoginItemSettings();
  return t.body(JSON.stringify({ enabled: e.openAtLogin }));
});
w.insert("/app/settings/set_auto_launch", async (t) => {
  const e = o.object({ enabled: o.boolean() }), { enabled: s } = e.parse(await t.request.json());
  return Je(s), t.body(JSON.stringify({ enabled: s }));
});
w.insert("/app/settings/poll_undetectability", (t) => (a.sendToWebContents("invisible-changed", {
  invisible: he()
}), t.body()));
w.insert("/app/settings/keybinds/begin_recording", (t) => (a.sendToWebContents("broadcast-to-all-windows", {
  command: "set-keybinds-is-recording",
  isRecording: !0
}), t.body()));
w.insert("/app/settings/keybinds/end_recording", (t) => (a.sendToWebContents("broadcast-to-all-windows", {
  command: "set-keybinds-is-recording",
  isRecording: !1
}), t.body()));
w.insert("/app/settings/keybinds/poll_accelerators", (t) => (a.sendToWebContents("send-keybindings-to-dashboard", null), t.body()));
w.insert("/app/settings/keybinds/set_accelerator", async (t) => {
  const e = o.object({ name: o.string(), accelerator: o.string().nullable() }), { name: s, accelerator: n } = e.parse(await t.request.json());
  return a.sendToWebContents("set-keybind-accelerator", { name: s, accelerator: n }), t.body();
});
w.insert("/app/settings/keybinds/set_disabled", async (t) => {
  const e = o.object({ name: o.string(), disabled: o.boolean() }), { name: s, disabled: n } = e.parse(await t.request.json());
  return a.sendToWebContents("set-keybind-disabled", { name: s, disabled: n }), t.body();
});
async function Lt(t) {
  const e = new URL(t.url), s = w.lookup(e.pathname);
  if (!s)
    return Se(null, 404);
  try {
    return await s({ url: e, request: t, body: Se });
  } catch (n) {
    return console.error("Error in handleDashboardIpc:", n), Se(null, 500);
  }
}
[
  process.env.ELECTRON_RENDERER_URL,
  "",
  "https://app.v2.interviewcoder.co",
  "https://desktop.v2.interviewcoder.co"
].filter(Boolean);
const xt = [
  "https://app.v2.interviewcoder.co",
  "",
  "https://desktop.v2.interviewcoder.co"
].filter(Boolean);
function Ut(t) {
  return !0;
}
const jt = "x-desktop-access-token", Fe = "X-Trace-Id";
let ce = null;
function Ft(t) {
  ce = t;
}
function zt() {
  ee.defaultSession.webRequest.onBeforeSendHeaders((t, e) => {
    try {
      const s = new URL(t.url);
      ce && Ut(t.referrer) && (s.origin === "https://app.v2.interviewcoder.co" && (t.requestHeaders[jt] = ce), s.origin === "https://platform.v2.interviewcoder.co" && !ze(t.requestHeaders, "Authorization") && (t.requestHeaders.Authorization = `Bearer ${ce}`), s.origin === "https://platform.v2.interviewcoder.co" && !ze(t.requestHeaders, Fe) && (t.requestHeaders[Fe] = gt()));
    } catch {
    }
    e({ requestHeaders: t.requestHeaders });
  }), ee.defaultSession.webRequest.onBeforeRequest((t, e) => {
    try {
      const s = new URL(t.url), n = new URL(t.referrer);
      if (xt.includes(n.origin) && s.pathname.startsWith("/ipc/")) {
        const r = s.pathname.slice(5);
        e({ redirectURL: `${nt}://ipc/${r}${s.search}` });
        return;
      }
    } catch {
    }
    e({});
  });
}
function ze(t, e) {
  return !!t[e] || !!t[e.toLowerCase()];
}
let Oe = { page: "login", modal: null };
function Ht() {
  return Oe;
}
function Vt(t) {
  Oe = t, rt();
}
function rt() {
  a.sendToWebContents("dashboard-window-state", { state: Oe });
}
function it() {
  const e = a.getCurrentWindow().getBounds(), s = D.getDisplayMatching(e);
  return D.getAllDisplays().map((n) => ({
    ...n,
    label: n.label || `Display ${n.id}`,
    primary: n.id === D.getPrimaryDisplay().id,
    current: n.id === s.id
  }));
}
function at(t) {
  return D.getAllDisplays().find((e) => e.id === t);
}
class Kt {
  window;
  displayId;
  constructor(e, s) {
    this.displayId = e.id, this.window = new Ae({
      show: !1,
      frame: !1,
      transparent: !0,
      alwaysOnTop: !0,
      skipTaskbar: !0,
      resizable: !1,
      movable: !1,
      minimizable: !1,
      maximizable: !1,
      fullscreenable: !1,
      x: e.bounds.x,
      y: e.bounds.y,
      width: e.bounds.width,
      height: e.bounds.height,
      webPreferences: {
        preload: te(se, "../preload/index.cjs")
      }
    }), this.window.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), this.window.setIgnoreMouseEvents(!1);
    const n = () => {
      console.log(`[DisplayOverlay] Overlay click triggered for display ${this.displayId}`), s(this.displayId);
    }, r = `overlay-click-${this.displayId}`;
    R.on(r, n), this.window.on("closed", () => {
      console.log(`[DisplayOverlay] Cleaning up IPC handler for display ${this.displayId}`), R.removeListener(r, n);
    }), this.window.webContents.on("will-navigate", (i) => {
      i.preventDefault();
    }), this.window.webContents.setWindowOpenHandler(() => ({ action: "deny" })), this.loadReactOverlay(e, r);
  }
  loadReactOverlay(e, s) {
    const n = {
      display: {
        id: e.id,
        label: e.label || `Display ${e.id}`,
        bounds: e.bounds
      },
      ipcChannel: s,
      onOverlayClick: () => {
      }
      // This will be handled via IPC
    };
    let r;
    v && process.env.ELECTRON_RENDERER_URL ? r = new URL(`${process.env.ELECTRON_RENDERER_URL}/overlay.html`) : r = new URL("app://renderer/overlay.html");
    const i = encodeURIComponent(JSON.stringify(n));
    r.searchParams.set("displayData", i), this.window.loadURL(r.toString());
  }
  show() {
    this.window.show();
  }
  hide() {
    this.window.hide();
  }
  highlight() {
    this.window.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('highlight'));
    `).catch(() => {
    });
  }
  unhighlight() {
    this.window.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('unhighlight'));
    `).catch(() => {
    });
  }
  destroy() {
    console.log(`[DisplayOverlay] Destroying overlay for display ${this.displayId}`), this.window.isDestroyed() || this.window.close();
  }
  getBounds() {
    return this.window.getBounds();
  }
}
class qt {
  overlays = /* @__PURE__ */ new Map();
  isActive = !1;
  showOverlays() {
    console.log("[DisplayOverlayManager] Showing overlays"), this.hideOverlays(), this.isActive = !0;
    const e = D.getAllDisplays(), n = a.getCurrentWindow().getBounds(), r = D.getDisplayMatching(n);
    for (const i of e) {
      if (i.id === r.id)
        continue;
      const l = new Kt(i, (c) => {
        if (console.log(
          `[DisplayOverlayManager] Display ${c} clicked, checking if active: ${this.isActive}`
        ), !this.isActive) {
          console.log(
            `[DisplayOverlayManager] Ignoring click for display ${c} - overlays are inactive`
          );
          return;
        }
        console.log(`[DisplayOverlayManager] Moving window to display ${c}`);
        const p = at(c);
        p && a.setTargetDisplay(p), this.hideOverlays();
      });
      this.overlays.set(i.id, l), l.show();
    }
  }
  hideOverlays() {
    console.log("[DisplayOverlayManager] Hiding overlays"), this.isActive = !1;
    for (const e of this.overlays.values())
      e.destroy();
    this.overlays.clear();
  }
  highlightDisplay(e) {
    const s = this.overlays.get(e);
    s && s.highlight();
  }
  unhighlightDisplay(e) {
    const s = this.overlays.get(e);
    s && s.unhighlight();
  }
}
const ae = new qt(), Gt = o.union([
  o.object({
    page: o.literal("login"),
    modal: o.enum(["app"]).nullable()
  }),
  o.object({
    page: o.literal("activity"),
    modal: o.enum(["profile", "security", "billing", "app", "personalize", "help", "knowledge_base"]).nullable()
  })
]), Yt = o.union([
  o.object({
    command: o.literal("log-out")
  }),
  o.object({
    command: o.literal("show-tutorial")
  }),
  o.object({
    command: o.literal("audio-session-stopped"),
    sessionId: o.string()
  }),
  o.object({
    command: o.literal("session-state-change"),
    sessionId: o.string(),
    state: o.enum([
      "ongoing",
      "analyzing",
      "analysis-succeeded",
      "analysis-failed",
      "consumer-analysis-succeeded"
    ]),
    hasAudio: o.boolean()
  }),
  o.object({
    command: o.literal("dashboard-show-listen-button")
  }),
  o.object({
    command: o.literal("dashboard-hide-listen-button")
  }),
  o.object({
    command: o.literal("set-keybinds-is-recording"),
    isRecording: o.boolean()
  }),
  o.object({
    command: o.literal("show-settings-and-highlight-tour")
  }),
  o.object({
    command: o.literal("restart-interactive-tour")
  }),
  o.object({
    command: o.literal("unlock-settings-window")
  })
]), Xt = {
  "quit-app": o.null(),
  "check-for-update": o.null(),
  "install-update": o.null(),
  "get-updater-state": o.null(),
  "finish-onboarding": o.null(),
  "reset-onboarding": o.null(),
  "register-global-shortcut": o.object({
    accelerator: o.string()
  }),
  "unregister-global-shortcut": o.object({
    accelerator: o.string()
  }),
  "enable-dev-shortcuts": o.null(),
  "reset-global-shortcuts": o.null(),
  "set-ignore-mouse-events": o.object({
    ignore: o.boolean()
  }),
  "resize-window": o.object({
    width: o.number(),
    height: o.number(),
    duration: o.number()
  }),
  "focus-window": o.null(),
  "unfocus-window": o.null(),
  "restart-window": o.null(),
  // Display management events
  "get-available-displays": o.null(),
  "get-invisible": o.null(),
  "move-window-to-display": o.object({
    displayId: o.number(),
    preservePosition: o.boolean().optional(),
    cursorScreenX: o.number().optional(),
    cursorScreenY: o.number().optional()
  }),
  "show-display-overlays": o.null(),
  "hide-display-overlays": o.null(),
  "highlight-display": o.object({
    displayId: o.number()
  }),
  "unhighlight-display": o.object({
    displayId: o.number()
  }),
  // Mac specific events
  "mac-open-system-settings": o.object({
    section: o.enum(["privacy > microphone", "privacy > screen-recording"])
  }),
  "mac-enable-native-recorder": o.object({
    sampleRate: o.number()
  }),
  "mac-disable-native-recorder": o.null(),
  "mac-set-mic-monitor-enabled": o.object({
    enabled: o.boolean(),
    version: o.enum(["v1", "v2"])
  }),
  "logout-user": o.null(),
  "login-user": o.object({
    userEmail: o.email()
  }),
  "set-auto-launch-enabled": o.object({
    enabled: o.boolean()
  }),
  "broadcast-to-all-windows": Yt,
  "set-dashboard-visibility": o.object({
    visible: o.boolean()
  }),
  "set-dashboard-state": o.object({
    state: Gt
  }),
  "get-dashboard-window-state": o.null(),
  "maximize-dashboard-window": o.null(),
  "minimize-dashboard-window": o.null()
}, Jt = {
  "request-has-onboarded": {
    payload: o.null(),
    response: o.object({
      hasOnboarded: o.boolean()
    })
  },
  "check-mic-permission": {
    payload: o.null(),
    response: o.boolean()
  },
  "request-media-permission": {
    payload: o.enum(["microphone", "camera", "screen"]),
    response: o.boolean()
  },
  "capture-screenshot": {
    payload: o.null(),
    response: o.object({
      contentType: o.string(),
      data: o.instanceof(Buffer)
    })
  },
  "mac-check-macos-version": {
    payload: o.null(),
    response: o.object({
      isSupported: o.boolean()
    })
  },
  "get-auto-launch-enabled": {
    payload: o.null(),
    response: o.object({
      enabled: o.boolean()
    })
  },
  "get-login-protocol-state": {
    payload: o.null(),
    response: o.object({
      state: o.string()
    })
  },
  "set-platform-access-token": {
    payload: o.object({
      accessToken: o.string().nullable()
    }),
    response: o.void()
  },
  "set-recall-api-key": {
    payload: o.object({
      apiKey: o.string().nullable()
    }),
    response: o.void()
  },
  "recall-sdk-create-upload": {
    payload: o.object({
      sessionId: o.string().optional(),
      provider: o.enum(["assembly_ai_v3_streaming", "deepgram_streaming"]),
      providerConfig: o.record(o.string(), o.unknown()),
      platformApiUrl: o.string(),
      authToken: o.string()
    }),
    response: o.object({
      success: o.boolean(),
      error: o.string().optional(),
      data: o.object({
        id: o.string(),
        upload_token: o.string(),
        config: o.any().optional()
      }).optional()
    })
  },
  "recall-sdk-prepare-desktop-audio": {
    payload: o.object({}),
    response: o.object({
      success: o.boolean(),
      error: o.string().optional(),
      windowId: o.string().optional()
    })
  },
  "recall-sdk-start-recording": {
    payload: o.object({
      windowId: o.union([o.string(), o.number()]),
      uploadToken: o.string()
    }),
    response: o.object({
      success: o.boolean(),
      error: o.string().optional()
    })
  },
  "recall-sdk-stop-recording": {
    payload: o.object({
      windowId: o.union([o.string(), o.number()])
    }),
    response: o.object({
      success: o.boolean(),
      error: o.string().optional()
    })
  },
  "recall-sdk-pause-recording": {
    payload: o.object({
      windowId: o.union([o.string(), o.number()])
    }),
    response: o.object({
      success: o.boolean(),
      error: o.string().optional()
    })
  },
  "recall-sdk-resume-recording": {
    payload: o.object({
      windowId: o.union([o.string(), o.number()])
    }),
    response: o.object({
      success: o.boolean(),
      error: o.string().optional()
    })
  },
  "recall-sdk-upload-recording": {
    payload: o.object({
      windowId: o.union([o.string(), o.number()]),
      force: o.boolean().optional()
    }),
    response: o.object({
      success: o.boolean(),
      error: o.string().optional(),
      skipped: o.boolean().optional(),
      message: o.string().optional()
    })
  },
  "recall-sdk-get-cloud-upload-config": {
    payload: o.object({}),
    response: o.object({
      enabled: o.boolean()
    })
  },
  "recall-sdk-set-cloud-upload-config": {
    payload: o.object({
      enabled: o.boolean()
    }),
    response: o.object({
      success: o.boolean(),
      enabled: o.boolean()
    })
  },
  "recall-sdk-get-initialization-status": {
    payload: o.object({}),
    response: o.object({
      initialized: o.boolean(),
      initializing: o.boolean(),
      error: o.string().nullable(),
      platform: o.string(),
      logs: o.array(o.string())
    })
  },
  "recall-sdk-retry-initialization": {
    payload: o.object({
      apiUrl: o.string().optional()
    }),
    response: o.object({
      success: o.boolean(),
      error: o.string().nullable(),
      message: o.string().optional(),
      logs: o.array(o.string())
    })
  }
};
function h(t, e) {
  const s = Xt[t], n = (r, i) => {
    const l = s.parse(i);
    e(r, l);
  };
  R.on(t, n);
}
function O(t, e) {
  const s = Jt[t].payload, n = (r, i) => {
    const l = s.parse(i);
    return e(r, l);
  };
  R.handle(t, n);
}
async function Qt(t, e, s) {
  const n = j.basename(e);
  return await new Promise((r, i) => {
    let l = "";
    t.stdout.on("data", (c) => {
      l += c.toString();
    }), t.stderr.on("data", (c) => {
      $(`[${n}] stderr: ${c}`);
    }), t.on("close", (c) => {
      c !== 0 ? ($(`[${n}] process exited with code ${c}`), i(new Error(`Process exited with code ${c}`))) : r({ stdout: l });
    }), t.on("error", (c) => {
      $(`[${n}] process error: ${c}`), i(c);
    });
  });
}
async function Zt() {
  const t = Te("sw_vers", ["-productVersion"]), { stdout: e } = await Qt(t, "sw_vers"), s = Number.parseInt(e.split(".")[0] ?? "", 10);
  return { isSupported: !Number.isNaN(s) && s >= kt };
}
const es = j.join(
  // app.getAppPath(): root folder of the electron app
  // process.resourcesPath: the Resources folder in the app's package contents
  v ? u.getAppPath() : process.resourcesPath,
  "macExtraResources"
);
function ts(t) {
  return j.join(es, t);
}
class ss {
  events = new St();
  process = null;
  isRunning = !1;
  options;
  constructor(e = {}) {
    this.options = e;
  }
  on(e, s) {
    return this.events.on(e, s), this;
  }
  once(e, s) {
    return this.events.once(e, s), this;
  }
  off(e, s) {
    return this.events.off(e, s), this;
  }
  removeAllListeners(e) {
    return this.events.removeAllListeners(e), this;
  }
  emit(e, ...s) {
    return this.events.emit(e, ...s);
  }
  buildArguments() {
    const e = [];
    return this.options.sampleRate !== void 0 && e.push("--sample-rate", this.options.sampleRate.toString()), this.options.chunkDurationMs !== void 0 && e.push("--chunk-duration", (this.options.chunkDurationMs / 1e3).toString()), this.options.mute && e.push("--mute"), this.options.includeProcesses && this.options.includeProcesses.length > 0 && e.push("--include-processes", ...this.options.includeProcesses.map((s) => s.toString())), this.options.excludeProcesses && this.options.excludeProcesses.length > 0 && e.push("--exclude-processes", ...this.options.excludeProcesses.map((s) => s.toString())), e;
  }
  handleStderr(e) {
    const n = e.toString("utf8").split(`
`).filter((r) => r.trim());
    for (const r of n)
      try {
        const i = JSON.parse(r);
        (i.message_type === "debug" || i.message_type === "info") && this.emit("log", i.message_type, i.data), i.message_type === "stream_start" ? this.emit("start") : i.message_type === "stream_stop" ? this.emit("stop") : i.message_type === "error" && this.emit("error", new Error(i.data.message));
      } catch (i) {
        console.error("Error parsing log message:", i);
      }
  }
  start() {
    return new Promise((e, s) => {
      if (this.isRunning) {
        s(new Error("AudioTee is already running"));
        return;
      }
      const n = ts("audiotee"), r = this.buildArguments();
      this.process = vt(n, r), this.process.on("error", (i) => {
        this.isRunning = !1, this.emit("error", i), s(i);
      }), this.process.on("exit", (i) => {
        if (this.isRunning = !1, i !== 0 && i !== null) {
          const l = new Error(`AudioTee process exited with code ${i}`);
          this.emit("error", l);
        }
      }), this.process.stdout?.on("data", (i) => {
        this.emit("data", { data: i });
      }), this.process.stderr?.on("data", (i) => {
        this.handleStderr(i);
      }), this.isRunning = !0, e();
    });
  }
  stop() {
    return new Promise((e) => {
      if (!this.isRunning || !this.process) {
        e();
        return;
      }
      const s = setTimeout(() => {
        this.process && this.isRunning && this.process.kill("SIGKILL");
      }, 5e3);
      this.process.once("exit", () => {
        clearTimeout(s), this.isRunning = !1, this.process = null, e();
      }), this.process.kill("SIGTERM");
    });
  }
  isActive() {
    return this.isRunning;
  }
}
u.on("before-quit", () => Me());
let M = null;
function os(t, e) {
  Me(), M = new ss({
    sampleRate: e,
    chunkDurationMs: 50
    // 50ms chunks as recommended by AssemblyAI
  }), M.on("data", (s) => {
    t.sendToWebContents("mac-native-recorder-data", {
      source: "system",
      base64Data: s.data.toString("base64")
    });
  }), M.on("error", (s) => {
    console.error("Error from audio tee:", s);
  }), M.on("stop", () => {
    console.log("Audio tee stopped");
  }), M.on("start", () => {
    console.log("Audio tee started");
  }), M.on("log", (s, n) => {
    console.log("Audio tee log:", s, n);
  }), M.start();
}
function Me() {
  M?.stop().then(() => {
    M = null;
  });
}
const ns = [
  ["Google Chrome", "Google Chrome"],
  ["firefox", "Mozilla Firefox"],
  ["com.apple.WebKit", "Safari"],
  ["Arc", "Arc Browser"],
  ["Arc Browser", "Arc Browser"],
  // Alternative process name
  ["Arc.app", "Arc Browser"],
  // App bundle name
  ["Microsoft Edge", "Microsoft Edge"],
  ["zoom.us", "Zoom"],
  ["GoogleMeet", "Google Meet"],
  // TODO: need to test
  ["Slack", "Slack"],
  ["Teams", "Microsoft Teams"],
  ["RingCentral", "RingCentral"],
  // Lower priority apps
  ["Brave Browser", "Brave Browser"],
  ["Brave", "Brave Browser"],
  // Alternative process name
  ["Brave.app", "Brave Browser"],
  // App bundle name
  ["Opera", "Opera Browser"],
  ["Opera Browser", "Opera Browser"],
  // Alternative process name
  ["Opera.app", "Opera Browser"],
  // App bundle name
  ["Vivaldi", "Vivaldi Browser"],
  ["Vivaldi Browser", "Vivaldi Browser"],
  // Alternative process name
  ["Vivaldi.app", "Vivaldi Browser"],
  // App bundle name
  ["Comet", "Comet Browser"],
  ["Comet Browser", "Comet Browser"],
  // Alternative process name
  ["Comet.app", "Comet Browser"],
  // App bundle name
  ["Dia", "Dia Browser"],
  ["Dia Browser", "Dia Browser"],
  // Alternative process name
  ["Dia.app", "Dia Browser"],
  // App bundle name
  ["Fellou", "Fellou AI Browser"],
  ["Fellou AI", "Fellou AI Browser"],
  // Alternative process name
  ["Fellou.app", "Fellou AI Browser"],
  // App bundle name
  ["VoiceMemos", "Voice Memos"],
  ["FaceTime", "FaceTime"],
  // TODO: need to test
  ["Discord", "Discord"],
  // TODO: need to test
  ["QuickTimePlayer", "QuickTime Player"]
  // TODO: need to test
], rs = [
  ["company.thebrowser.browser.helper", "Arc Browser"],
  ["com.brave.Browser.helper", "Brave Browser"],
  ["com.microsoft.edgemac.helper", "Microsoft Edge"],
  ["com.operasoftware.Opera.helper", "Opera Browser"],
  ["com.vivaldi.Vivaldi.helper", "Vivaldi Browser"],
  ["com.google.Chrome.helper", "Google Chrome"],
  ["org.mozilla.firefox.helper", "Mozilla Firefox"],
  ["com.cometbrowser.Comet.helper", "Comet Browser"],
  ["com.diabrowser.Dia.helper", "Dia Browser"],
  ["com.fellou.browser.helper", "Fellou AI Browser"]
];
function is(t) {
  for (const [e, s] of ns)
    if (t.includes(e))
      return s;
  for (const [e, s] of rs)
    if (t.includes(e))
      return console.log(`[MicMonitor] DEBUG: Matched bundle ID: ${e} -> ${s}`), s;
  return null;
}
class P extends Ge {
  proc = null;
  // Ultra-aggressive frequency deduplication
  patternFrequencyCounter = /* @__PURE__ */ new Map();
  FREQUENCY_WINDOW_MS = 5e3;
  // 5 second window (ultra-aggressive)
  HIGH_FREQ_THRESHOLD = 1;
  // 1 line per 5 seconds (ultra-restrictive)
  // Ultra-aggressive batch processing
  lineBuffer = [];
  BATCH_SIZE = 100;
  // Much larger batch size (ultra-aggressive)
  BATCH_TIMEOUT_MS = 1e3;
  // Much longer timeout (ultra-aggressive)
  batchTimeout = null;
  // Ultra-aggressive global rate limiting
  lastProcessTime = 0;
  MIN_PROCESS_INTERVAL_MS = 2e3;
  // Minimum 2 seconds between processing batches
  // Pre-compiled regex patterns for better performance
  static SESSION_NAME_REGEX = /"session":\{[^}]*"name":"([A-Za-z0-9_. ]+)\(\d+\)".*?"input_running":\s*(true|false)/;
  static AVCAPTURE_USED_REGEX = /AVCaptureDevice was used for audio by "(.*?)"/;
  static AVCAPTURE_STOPPED_REGEX = /AVCaptureDevice was stopped being used for audio by "(.*?)"/;
  static BUNDLE_ID_REGEX = /BundleID\s*=\s*([A-Za-z0-9_.]+)/;
  matchRules = [
    {
      type: "mic-used",
      subsystem: "com.apple.coreaudio:as_server",
      matchSubstring: '\\"input_running\\":true',
      regex: P.SESSION_NAME_REGEX
    },
    {
      type: "mic-off",
      subsystem: "com.apple.coreaudio:as_server",
      matchSubstring: '\\"input_running\\":false',
      regex: P.SESSION_NAME_REGEX
    },
    {
      type: "mic-used",
      subsystem: "com.apple.audio.AVFAudio",
      matchSubstring: "AVCaptureDevice was used",
      regex: P.AVCAPTURE_USED_REGEX
    },
    {
      type: "mic-off",
      subsystem: "com.apple.audio.AVFAudio",
      matchSubstring: "AVCaptureDevice was stopped",
      regex: P.AVCAPTURE_STOPPED_REGEX
    },
    {
      type: "mic-used",
      subsystem: "com.apple.audio.ASDT",
      matchSubstring: "startStream: running state: 1"
    },
    {
      type: "mic-off",
      subsystem: "com.apple.audio.ASDT",
      matchSubstring: "stopStream: running state: 0"
    },
    // Firefox-specific rules for AUHAL subsystem
    {
      type: "mic-used",
      subsystem: "com.apple.coreaudio:AUHAL",
      matchSubstring: "connecting device"
    },
    {
      type: "mic-off",
      subsystem: "com.apple.coreaudio:AUHAL",
      matchSubstring: "nothing to teardown"
    },
    // Firefox AVCapture rules - only for specific patterns, not general coremedia
    {
      type: "mic-used",
      subsystem: "com.apple.coremedia",
      matchSubstring: "logging capture stack initiator"
    },
    // Bundle ID patterns for more accurate browser detection - only when actually using mic
    {
      type: "mic-used",
      matchSubstring: "BundleID",
      regex: P.BUNDLE_ID_REGEX
    },
    {
      type: "mic-off",
      matchSubstring: "BundleID",
      regex: P.BUNDLE_ID_REGEX
    }
  ];
  start() {
    if (this.proc) return;
    console.log("[MicMonitor] start() called");
    const s = ["stream", "--info", "--predicate", this.buildPredicate(), "--style", "default"], n = Te("log", s);
    this.proc = n, this.proc.stdout.on("data", (r) => {
      const i = r.toString();
      if (i.includes("Filtering the log data using") || i.includes("log stream"))
        return;
      const l = i.split(`
`);
      for (const c of l)
        c && c.length > 0 && this.lineBuffer.push(c);
      this.lineBuffer.length >= this.BATCH_SIZE ? this.processBatch() : this.batchTimeout || (this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, this.BATCH_TIMEOUT_MS));
    }), this.proc.stderr.on("data", (r) => {
      $("[MicMonitor stderr]", r.toString());
    }), this.proc.on("exit", (r) => {
      console.log(`[MicMonitor] exited with code ${r}`), this.proc === n && (this.proc = null);
    });
  }
  buildPredicate() {
    const e = [];
    for (const r of this.matchRules) {
      let i = `eventMessage CONTAINS "${r.matchSubstring}"`;
      r.subsystem && (i = `(subsystem CONTAINS "${r.subsystem.split(":")[0]}" AND ${i})`), e.push(`(${i})`);
    }
    return `(${e.join(" || ")} || (subsystem CONTAINS "com.apple.coremedia" AND eventMessage CONTAINS "logging capture stack initiator")) AND (process CONTAINS "audio" OR process CONTAINS "coreaudio" OR process CONTAINS "AVFAudio" OR process CONTAINS "ASDT" OR process CONTAINS "AUHAL") AND NOT (eventMessage CONTAINS "debug" OR eventMessage CONTAINS "DEBUG" OR eventMessage CONTAINS "info" OR eventMessage CONTAINS "INFO" OR eventMessage CONTAINS "display" OR eventMessage CONTAINS "screen" OR eventMessage CONTAINS "loopback" OR eventMessage CONTAINS "getDisplayMedia" OR eventMessage CONTAINS "DesktopCapture" OR eventMessage CONTAINS "ScreenCapture" OR eventMessage CONTAINS "system_audio" OR eventMessage CONTAINS "system-audio" OR eventMessage CONTAINS "displaySurface" OR eventMessage CONTAINS "monitor" OR eventMessage CONTAINS "window")`;
  }
  processBatch() {
    if (this.batchTimeout && (clearTimeout(this.batchTimeout), this.batchTimeout = null), this.lineBuffer.length === 0) return;
    const e = Date.now();
    if (e - this.lastProcessTime < this.MIN_PROCESS_INTERVAL_MS) {
      this.batchTimeout = setTimeout(() => this.processBatch(), this.MIN_PROCESS_INTERVAL_MS);
      return;
    }
    this.lastProcessTime = e;
    const s = this.lineBuffer.splice(0, this.BATCH_SIZE);
    for (const n of s)
      this.processLine(n, e);
    this.cleanOldFrequencyCounters(e);
  }
  processLine(e, s) {
    if (!(e.includes("input_running") || e.includes("AVCaptureDevice") || e.includes("startStream") || e.includes("stopStream") || e.includes("connecting device") || e.includes("nothing to teardown") || e.includes("logging capture stack initiator") || e.includes("BundleID")) || e.includes("display") || e.includes("screen") || e.includes("loopback") || e.includes("getDisplayMedia") || e.includes("DesktopCapture") || e.includes("ScreenCapture") || e.includes("system_audio") || e.includes("system-audio") || e.includes("displaySurface") || e.includes("monitor") || e.includes("window") || e.includes("terminated") || e.includes("exited") || e.includes("cleanup") || e.includes("dealloc") || e.includes("destroy") || e.includes("shutdown") || e.includes("quit") || e.includes("close") || e.includes("disconnect") || e.includes("unload") || e.includes("teardown") || e.includes("release") || e.includes("finalize") || e.includes("session ended") || e.includes("meeting ended") || e.includes("call ended") || e.includes("hang up") || e.includes("leave meeting") || e.includes("leave call") || e.includes("endInterruption") || e.includes("going inactive") || e.includes("Category = MediaPlayback") || e.includes("Recording = NO") || e.includes('input_running":false') || e.includes("Active = NO") || e.includes("requestForSharedOwnership") || e.includes("stop") || // Filter out lines with empty deviceUIDs ONLY when they're part of cleanup events
    // (when input_running is true but we have cleanup indicators)
    e.includes('input_running":true') && e.includes('"deviceUIDs":[]') && (e.includes("Recording = NO") || e.includes("Active = NO") || e.includes("endInterruption") || e.includes("going inactive") || e.includes("stopStream")))
      return;
    const n = this.extractPattern(e), r = this.patternFrequencyCounter.get(n);
    if (r) {
      if (r.count++, r.count > this.HIGH_FREQ_THRESHOLD && s - r.firstSeen < this.FREQUENCY_WINDOW_MS)
        return;
    } else
      this.patternFrequencyCounter.set(n, { count: 1, firstSeen: s });
    for (const i of this.matchRules) {
      const l = i.matchSubstring.replace(/\\"/g, '"');
      if (e.includes(l)) {
        let c = "";
        if (i.regex) {
          const f = i.regex.exec(e);
          f?.[1] && (i.regex === P.SESSION_NAME_REGEX ? (f[2] === "true" && i.type === "mic-used" || f[2] === "false" && i.type === "mic-off") && (c = f[1]) : c = f[1]);
        }
        if (!c) continue;
        const p = is(c);
        if (!p)
          break;
        if (i.matchSubstring === "BundleID" && (e.includes("endInterruption") || e.includes("going inactive") || e.includes('input_running":false') || e.includes("Active = NO") || e.includes("Category = MediaPlayback") || !(e.includes('"input_running":true') || e.includes("Recording = YES") && e.includes("Active = YES"))))
          continue;
        this.emit(i.type, { app: p, message: e });
        return;
      }
    }
  }
  extractPattern(e) {
    for (const s of this.matchRules) {
      const n = s.matchSubstring.replace(/\\"/g, '"');
      if (e.includes(n)) {
        let r = "";
        if (s.regex) {
          const c = s.regex.exec(e);
          c?.[1] && (r = c[1]);
        }
        const i = s.subsystem?.split(":")[0] || "generic", l = s.type === "mic-used" ? "used" : "off";
        return r ? `${l}_${i}_${r}` : `${l}_${i}_${n.replace(/[^a-zA-Z0-9]/g, "_")}`;
      }
    }
    return e.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/g, "T").replace(/\[\d+:\d+\]/g, "[P]").replace(/\(\d+\)/g, "(I)");
  }
  cleanOldFrequencyCounters(e) {
    for (const [s, n] of this.patternFrequencyCounter.entries())
      e - n.firstSeen > this.FREQUENCY_WINDOW_MS && this.patternFrequencyCounter.delete(s);
  }
  stop() {
    this.batchTimeout && (clearTimeout(this.batchTimeout), this.batchTimeout = null), this.proc && (this.proc.kill(), this.proc = null);
  }
}
const as = z.object({
  session: z.object({
    name: z.string()
  }),
  details: z.object({
    input_running: z.boolean(),
    output_running: z.boolean(),
    implicit_category: z.string()
  })
}), ls = {
  "Google Chrome": "Google Chrome",
  "Google Chrome He": "Google Chrome",
  "Google Chrome Helper": "Google Chrome",
  firefox: "Mozilla Firefox",
  "com.apple.WebKit": "Safari",
  "Browser Helper": "Arc",
  Arc: "Arc Browser",
  "Arc Browser": "Arc Browser",
  // Alternative process name
  "Arc.app": "Arc Browser",
  // App bundle name
  "Microsoft Edge": "Microsoft Edge",
  "zoom.us": "Zoom",
  GoogleMeet: "Google Meet",
  // TODO: need to test
  "Slack Helper": "Slack",
  Slack: "Slack",
  "Microsoft Teams": "Microsoft Teams",
  RingCentral: "RingCentral",
  // Lower priority apps
  "Brave Browser": "Brave Browser",
  Brave: "Brave Browser",
  // Alternative process name
  "Brave.app": "Brave Browser",
  // App bundle name
  Opera: "Opera Browser",
  "Opera Browser": "Opera Browser",
  // Alternative process name
  "Opera.app": "Opera Browser",
  // App bundle name
  Vivaldi: "Vivaldi Browser",
  "Vivaldi Browser": "Vivaldi Browser",
  // Alternative process name
  "Vivaldi.app": "Vivaldi Browser",
  // App bundle name
  Comet: "Comet Browser",
  "Comet Browser": "Comet Browser",
  // Alternative process name
  "Comet.app": "Comet Browser",
  // App bundle name
  Dia: "Dia Browser",
  "Dia Browser": "Dia Browser",
  // Alternative process name
  "Dia.app": "Dia Browser",
  // App bundle name
  Fellou: "Fellou AI Browser",
  "Fellou AI": "Fellou AI Browser",
  // Alternative process name
  "Fellou.app": "Fellou AI Browser",
  // App bundle name
  VoiceMemos: "Voice Memos",
  FaceTime: "FaceTime",
  // TODO: need to test
  Discord: "Discord",
  // TODO: need to test
  QuickTimePlayer: "QuickTime Player"
  // TODO: need to test
};
class cs extends Ge {
  proc = null;
  emitTimer = null;
  start() {
    if (this.proc) return;
    console.log("[MicMonitor] start() called");
    const s = Te("log", [
      "stream",
      "--info",
      "--predicate",
      'subsystem=="com.apple.coreaudio"',
      "--process",
      "audiomxd",
      "--style",
      "compact"
    ]);
    this.proc = s, this.proc.stdout.on("data", (n) => {
      const r = n.toString().split(`
`).filter(Boolean);
      for (const i of r)
        this.processLine(i);
    }), this.proc.stderr.on("data", (n) => {
      $("[MicMonitor stderr]", n.toString());
    }), this.proc.on("exit", (n) => {
      console.log(`[MicMonitor] exited with code ${n}`), this.proc === s && (this.proc = null);
    });
  }
  processLine(e) {
    if (!e.includes("input_running")) return;
    const s = e.match(/(\{.*\})$/);
    if (!s) return;
    const n = as.safeParse(JSON.parse(s?.[1] ?? ""));
    if (!n.success)
      return;
    console.log(`[MicMonitor] DEBUG: matched line: ${e}`);
    const r = n.data.session.name.trim().replace(/\(\d+\)$/, ""), i = ls[r];
    if (!i)
      return;
    const { implicit_category: l, input_running: c } = n.data.details;
    c && (l === "Record" || l === "PlayAndRecord") ? this.debounceEmit("mic-used", { app: i }) : !c && l === "" && this.debounceEmit("mic-off", { app: i });
  }
  /**
   * Debounce the emit of an event to avoid rapid duplicate events per app
   * @param event - The event to emit
   * @param payload - The payload to emit
   * @param delay - The delay in milliseconds to debounce the emit
   */
  debounceEmit(e, s, n = 1e3) {
    this.emitTimer && clearTimeout(this.emitTimer), this.emitTimer = setTimeout(() => {
      this.emit(e, s), this.emitTimer = null;
    }, n);
  }
  stop() {
    this.proc && (this.proc.kill(), this.proc = null);
  }
}
let N = null;
u.on("before-quit", () => lt());
function ds(t) {
  N || B && (t === "v1" ? N = new P() : N = new cs(), N.start(), N.on("mic-used", (e) => {
    a.sendToWebContents("unhide-window", { reason: "mic_detected" }), a.sendToWebContents("mic-used", e);
  }), N.on("mic-off", (e) => {
    a.sendToWebContents("mic-off", e);
  }));
}
function lt() {
  N && (N.stop(), N = null);
}
let A = !1, X = null, de = !1, G = null, W = !1, V = [];
function He() {
  const t = {
    initialized: A,
    initializing: W,
    error: G,
    platform: S ? "windows" : process.platform
  };
  Ae.getAllWindows().forEach((e) => {
    try {
      e.webContents.send("recall-sdk-status-changed", t);
    } catch {
    }
  });
}
function us(t) {
  console.log("[RecallSDK] setRecallApiKey is deprecated - tokens from backend");
}
function ps(t) {
  de = t;
}
async function Ve(t) {
  return new Promise((e) => setTimeout(e, t));
}
function d(t, e = "info") {
  const n = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${t}`;
  V.push(n), e === "error" ? console.error(t) : console.log(t), hs(t, e);
}
function hs(t, e) {
  try {
    const { BrowserWindow: s } = Ye("electron");
    s.getAllWindows().forEach((n) => {
      n.isDestroyed() || n.webContents.send("recall-sdk-init-log", {
        message: t,
        level: e,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  } catch {
  }
}
async function ct(t, e) {
  if (A) {
    d("[RecallSDK] Already initialized, skipping");
    return;
  }
  if (W) {
    d("[RecallSDK] Initialization already in progress, waiting...");
    return;
  }
  W = !0, V = [], d(`[RecallSDK] Starting initialization with apiUrl: ${t}`), d(`[RecallSDK] Platform: ${S ? "Windows" : process.platform}`);
  try {
    if (d(`[RecallSDK] RecallAiSdk type: ${typeof b}`), d(`[RecallSDK] RecallAiSdk is null/undefined: ${b == null}`), b) {
      d(`[RecallSDK] RecallAiSdk.init type: ${typeof b.init}`), d(`[RecallSDK] RecallAiSdk.init exists: ${!!b.init}`);
      const i = Object.keys(b);
      d(`[RecallSDK] RecallAiSdk available methods (${i.length}): ${i.join(", ")}`), [
        "init",
        "prepareDesktopAudioRecording",
        "startRecording",
        "stopRecording"
      ].forEach((c) => {
        d(`[RecallSDK] Has ${c}: ${typeof b[c]}`);
      });
    } else {
      d("[RecallSDK] ❌ RecallAiSdk is null or undefined!", "error"), d("[RecallSDK] This suggests the package is not correctly installed or imported", "error"), W = !1, G = "RecallAiSdk module is null or undefined";
      return;
    }
  } catch (i) {
    d(`[RecallSDK] Error during diagnostics: ${i}`, "error");
  }
  const s = S ? 3 : 1, n = 2e3;
  d(
    `[RecallSDK] Configuring initialization for ${S ? "Windows (no permissions needed)" : "macOS/Linux (with permissions)"}`
  );
  const r = S ? [
    // Windows: No permissions needed
    {
      name: "Windows (no permissions)",
      config: {
        apiUrl: t,
        acquirePermissionsOnStartup: [],
        restartOnError: !0
      }
    }
  ] : [
    // macOS/Linux: Try with permissions first, then fallback
    {
      name: "with permissions",
      config: {
        apiUrl: t,
        acquirePermissionsOnStartup: [
          "accessibility",
          "screen-capture",
          "microphone"
        ],
        restartOnError: !0
      }
    },
    {
      name: "without permissions (fallback)",
      config: {
        apiUrl: t,
        acquirePermissionsOnStartup: [],
        restartOnError: !0
      }
    }
  ];
  for (const { name: i, config: l } of r) {
    d(`[RecallSDK] Trying initialization ${i}...`);
    for (let c = 1; c <= s; c++)
      try {
        c > 1 && (d(`[RecallSDK] Retry attempt ${c}/${s} (${i})...`), await Ve(n)), d("[RecallSDK] Calling RecallAiSdk.init()..."), d(`[RecallSDK] Config: ${JSON.stringify(l)}`);
        try {
          const p = b.init(l);
          d(`[RecallSDK] Init promise created: ${typeof p}`), d(`[RecallSDK] Is promise: ${p instanceof Promise}`);
          const f = await p;
          d(`[RecallSDK] Init result: ${JSON.stringify(f)}`), d("[RecallSDK] RecallAiSdk.init() completed successfully");
        } catch (p) {
          throw d("[RecallSDK] Exception during init() call", "error"), p;
        }
        S && (d("[RecallSDK] Windows detected, waiting for SDK to stabilize..."), await Ve(1e3)), A = !0, W = !1, G = null, fs(), d(`[RecallSDK] ✅ Successfully initialized and ready (${i})`), He();
        return;
      } catch (p) {
        const f = p?.message || String(p) || "Unknown error";
        G = f, d(
          `[RecallSDK] ❌ Failed to initialize ${i} (attempt ${c}/${s})`,
          "error"
        ), d(`[RecallSDK] Error type: ${p?.constructor?.name || typeof p}`, "error"), d(`[RecallSDK] Error message: ${f}`, "error");
        try {
          d(`[RecallSDK] Error toString(): ${p}`, "error");
        } catch {
          d("[RecallSDK] Could not convert error to string", "error");
        }
        try {
          const m = p;
          if (m && typeof m == "object") {
            const C = Object.keys(m);
            d(`[RecallSDK] Error keys: ${C.join(", ")}`, "error"), C.forEach((E) => {
              try {
                const k = m[E];
                d(`[RecallSDK] Error.${E}: ${JSON.stringify(k)}`, "error");
              } catch {
                d(`[RecallSDK] Error.${E}: [not serializable]`, "error");
              }
            });
          }
        } catch {
          d("[RecallSDK] Could not inspect error object", "error");
        }
        p?.stack && d(`[RecallSDK] Stack trace: ${p.stack}`, "error"), c === s && d(`[RecallSDK] All retry attempts failed for ${i}`, "error");
      }
  }
  W = !1, d("[RecallSDK] ❌ All initialization configurations failed", "error"), d(`[RecallSDK] Last error: ${G}`, "error"), d("[RecallSDK] The app will continue but recording features won't work", "error"), d("[RecallSDK] Please check:", "error"), He(), S ? (d("[RecallSDK] Windows-specific troubleshooting:", "error"), d("[RecallSDK]   1. @recallai/desktop-sdk package is installed correctly", "error"), d("[RecallSDK]   2. Native modules are built for your architecture (x64/arm64)", "error"), d("[RecallSDK]   3. Visual C++ Redistributable is installed", "error"), d("[RecallSDK]   4. Windows Defender or antivirus is not blocking the SDK", "error"), d("[RecallSDK]   5. Try running: pnpm install @recallai/desktop-sdk --force", "error")) : (d(
    "[RecallSDK]   1. Required permissions (accessibility, screen-capture, microphone)",
    "error"
  ), d("[RecallSDK]   2. @recallai/desktop-sdk package is installed correctly", "error"), d(
    "[RecallSDK]   3. System requirements are met (macOS 14.2+ for audio-only on Apple Silicon)",
    "error"
  ));
}
function gs() {
  R.handle(
    "recall-sdk-create-upload",
    async (t, { sessionId: e, provider: s, providerConfig: n, platformApiUrl: r, authToken: i }) => {
      try {
        const c = `${r || process.env.PLATFORM_API_URL || "http://localhost:8787"}/desktop/recall/create-upload-token`, p = await fetch(c, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${i}`
          },
          body: JSON.stringify({
            sessionId: e,
            provider: s || "deepgram_streaming",
            providerConfig: n || {},
            enableRealtimeTranscript: !0,
            enableVideoFrames: !1
          })
        });
        if (!p.ok) {
          const m = await p.text();
          throw p.status === 401 ? new Error("Authentication failed. Please ensure you are logged in.") : new Error(`Backend API error: ${p.status} ${m}`);
        }
        const f = await p.json();
        return {
          success: !0,
          data: {
            upload_token: f.uploadToken,
            id: f.botId,
            config: f.config
          }
        };
      } catch (l) {
        return { success: !1, error: l.message };
      }
    }
  ), R.handle("recall-sdk-prepare-desktop-audio", async () => {
    try {
      if (!A)
        throw new Error("Recall SDK not initialized. Please restart the application.");
      return { success: !0, windowId: await b.prepareDesktopAudioRecording() };
    } catch (t) {
      return { success: !1, error: t.message };
    }
  }), R.handle("recall-sdk-start-recording", async (t, { windowId: e, uploadToken: s }) => {
    try {
      if (!A)
        throw new Error("Recall SDK not initialized. Please restart the application.");
      return await b.startRecording({ windowId: e, uploadToken: s }), { success: !0 };
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), R.handle("recall-sdk-stop-recording", async (t, { windowId: e }) => {
    try {
      if (!A)
        throw new Error("Recall SDK not initialized. Please restart the application.");
      return await b.stopRecording({ windowId: e }), { success: !0 };
    } catch (s) {
      return { success: !1, error: s.message };
    }
  }), R.handle("recall-sdk-pause-recording", async (t, { windowId: e }) => {
    try {
      if (!A)
        throw new Error("Recall SDK not initialized. Please restart the application.");
      return await b.pauseRecording({ windowId: e }), { success: !0 };
    } catch (s) {
      return { success: !1, error: s.message };
    }
  }), R.handle("recall-sdk-resume-recording", async (t, { windowId: e }) => {
    try {
      if (!A)
        throw new Error("Recall SDK not initialized. Please restart the application.");
      return await b.resumeRecording({ windowId: e }), { success: !0 };
    } catch (s) {
      return { success: !1, error: s.message };
    }
  }), R.handle("recall-sdk-upload-recording", async (t, { windowId: e, force: s = !1 }) => {
    if (!de && !s)
      return {
        success: !0,
        skipped: !0,
        message: "Cloud upload disabled"
      };
    try {
      if (!A)
        throw new Error("Recall SDK not initialized. Please restart the application.");
      return await b.uploadRecording({ windowId: e }), { success: !0, skipped: !1 };
    } catch (n) {
      return { success: !1, error: n.message };
    }
  }), R.handle("recall-sdk-get-cloud-upload-config", async () => ({ enabled: de })), R.handle("recall-sdk-set-cloud-upload-config", async (t, { enabled: e }) => (ps(e), { success: !0, enabled: de })), R.handle("recall-sdk-get-initialization-status", async () => ({
    initialized: A,
    initializing: W,
    error: G,
    platform: S ? "windows" : process.platform,
    logs: V
  })), R.handle("recall-sdk-retry-initialization", async (t, { apiUrl: e }) => {
    try {
      return d("[RecallSDK] Manual retry initialization requested"), A ? {
        success: !0,
        error: null,
        message: "SDK already initialized",
        logs: V
      } : W ? {
        success: !1,
        error: "Initialization already in progress",
        logs: V
      } : (A = !1, W = !1, await ct(e || "https://us-west-2.recall.ai"), {
        success: A,
        error: G,
        logs: V
      });
    } catch (s) {
      return {
        success: !1,
        error: s.message,
        logs: V
      };
    }
  });
}
function fs() {
  const { BrowserWindow: t } = Ye("electron"), e = (s, n) => {
    t.getAllWindows().forEach((r) => {
      r.isDestroyed() || r.webContents.send(s, n);
    });
  };
  b.addEventListener("meeting-detected", (s) => {
    e("recall-sdk-event", {
      type: "meeting-detected",
      data: s
    });
  }), b.addEventListener("recording-ended", (s) => {
    e("recall-sdk-event", {
      type: "recording-ended",
      data: s
    });
  }), b.addEventListener("upload-progress", (s) => {
    e("recall-sdk-event", {
      type: "upload-progress",
      data: s
    });
  }), b.addEventListener("sdk-state-change", (s) => {
    e("recall-sdk-event", {
      type: "sdk-state-change",
      data: s
    });
  }), b.addEventListener("realtime-event", (s) => {
    const n = Date.now();
    if ((s.event === "transcript.data" || s.event === "transcript.partial_data") && console.log(`[RecallSDK] Received event type: ${s.event}`), s.event === "transcript.provider_data")
      try {
        const m = s.data.data?.data?.payload?.channel?.alternatives?.[0]?.words?.[0]?.speaker;
        m !== void 0 && (X = m);
      } catch (r) {
        console.warn("[RecallSDK] Failed to extract speaker ID:", r);
      }
    if (s.event === "transcript.data" || s.event === "transcript.partial_data") {
      const r = Date.now(), i = s.data, l = i.data, p = (l?.words || []).map((g) => g.text).join(" "), m = l?.participant?.name, C = i.source, E = m && m !== "Host" && m !== "Guest" ? m : X !== null && X !== -1 ? `Speaker ${X}` : "Unknown Speaker", k = Date.now(), L = k - r, x = s.event === "transcript.partial_data";
      console.log(
        `[RecallSDK Transcript${x ? " Partial" : ""}] ${E}: "${p}" | Source: ${C} | SpeakerID: ${X} | Received: ${new Date(n).toISOString()} | Processing: ${L}ms`
      ), e("recall-sdk-event", {
        type: "transcript",
        data: {
          text: p,
          speaker: E,
          speakerId: X,
          source: C,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          partialResult: x,
          _timing: {
            receivedAt: n,
            broadcastAt: k,
            processingTime: L
          }
        }
      });
    }
    s.event !== "transcript.data" && s.event !== "transcript.partial_data" && s.event !== "transcript.provider_data" && e("recall-sdk-event", {
      type: "realtime-event",
      data: s
    });
  });
}
function ms() {
  A && (b.shutdown(), A = !1);
}
async function ws() {
  try {
    return a.setContentProtection(!0), await ys();
  } catch (t) {
    if (B)
      throw Ze(), t;
    return await vs();
  } finally {
    a.restoreUndetectability();
  }
}
async function bs() {
  const t = (process.env.DISPLAY || ":0").split(".")[0], e = [`${t}.1`, `${t}.0`], s = await import("node:fs"), n = await import("node:path"), r = "/app/test-results";
  try {
    s.mkdirSync(r, { recursive: !0 });
  } catch {
  }
  const i = [];
  for (const g of e)
    try {
      const T = g.replace(/[:]/g, ""), y = n.join(r, `test-image-${performance.now()}-${T}.png`);
      Le(`DISPLAY=${g} xwd -root | convert xwd:- png:${y}`, { stdio: "ignore" });
      const I = s.readFileSync(y);
      console.log(
        `[Screenshot] Saved root capture for ${g} -> ${y} (${I.length} bytes)`
      ), i.push({ data: I, path: y });
    } catch (T) {
      console.log(`[Screenshot] root capture failed for ${g}:`, T);
    }
  if (console.log("[Screenshot] Root capture:", JSON.stringify(i.map((g) => g.path))), i.length > 0)
    try {
      const g = n.join(r, "root-capture-combined.png"), T = i.map((y) => y.path).join(" ");
      if (i.length > 1) {
        Le(`convert ${T} +append ${g}`, { stdio: "ignore" });
        const y = s.readFileSync(g);
        return console.log(
          `[Screenshot] Saved combined root capture -> ${g} (${y.length} bytes)`
        ), { data: y, contentType: "image/png" };
      } else {
        const y = i[0];
        if (!y) throw new Error("No captures available after root capture phase");
        return { data: y.data, contentType: "image/png" };
      }
    } catch (g) {
      console.log("[Screenshot] failed to create combined root capture:", g);
      const T = i[0];
      if (!T) throw g;
      return { data: T.data, contentType: "image/png" };
    }
  const l = D.getAllDisplays(), c = Math.max(...l.map((g) => g.bounds.width)), p = Math.max(...l.map((g) => g.bounds.height)), f = await pe.getSources({
    types: ["screen"],
    thumbnailSize: { width: c, height: p }
  }), m = l.map((g, T) => f.find((I) => I.display_id === g.id.toString()) ?? f[T] ?? f[0]).filter(Boolean);
  if (m.length === 0)
    throw new Error("Unable to capture screenshot: no screen sources found in Linux test mode");
  if (m.length === 1 && m[0])
    return { data: m[0].thumbnail.toPNG(), contentType: "image/png" };
  const C = a.getTargetDisplay();
  console.log("[Screenshot] targetDisplay=", C.id);
  const E = l.length > 0 ? l[0] : void 0, k = l.find((g) => g.id !== C.id) ?? E;
  if (!k)
    throw new Error("Unable to capture screenshot: no displays available");
  console.log("[Screenshot] altDisplay=", k.id, k.bounds);
  const L = f.length > 0 ? f[0] : void 0, x = f.find((g) => g.display_id === k.id.toString()) ?? L;
  if (!x)
    throw new Error("Unable to capture screenshot: alternate screen source not found");
  try {
    const g = await import("node:fs"), T = await import("node:path"), y = "/app/test-results";
    try {
      g.mkdirSync(y, { recursive: !0 });
    } catch {
    }
    const I = `alt-display-${k.id}.png`, Q = T.join(y, I), oe = x.thumbnail.toPNG();
    g.writeFileSync(Q, oe), console.log(`Saved alt display screenshot to ${Q} (${oe.length} bytes)`);
  } catch (g) {
    console.log(`Failed to write alt display screenshot: ${g}`);
  }
  return { data: x.thumbnail.toPNG(), contentType: "image/png" };
}
async function ys() {
  if (Ce && process.env.PLAYWRIGHT_ENV === "test")
    return bs();
  const t = a.getTargetDisplay(), e = await pe.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: t.bounds.width,
      height: t.bounds.height
    }
  }), s = e.find((r) => r.display_id === t.id.toString()) ?? e[0];
  if (!s) {
    const r = {
      display: { id: t.id },
      sources: e.map((i) => ({ id: i.id, name: i.name }))
    };
    throw new Error(
      `Unable to capture screenshot: no display source found; details: ${JSON.stringify(r)}`
    );
  }
  return { data: s.thumbnail.toPNG(), contentType: "image/png" };
}
async function vs() {
  return {
    // this will just use the default display
    data: await Dt({ format: "png" }),
    contentType: "image/png"
  };
}
let dt = v;
const J = /* @__PURE__ */ new Set();
function Ss(t) {
  if (J.has(t)) {
    console.warn(`Shortcut already registered: ${t}`);
    return;
  }
  J.add(t), ge();
}
function Ds(t) {
  if (!J.has(t)) {
    console.warn(`Shortcut not registered: ${t}`);
    return;
  }
  J.delete(t), ge();
}
function Rs() {
  dt = !0, ge();
}
function As() {
  J.clear(), ge();
}
function ge() {
  ie.unregisterAll();
  for (const t of J)
    ie.register(t, () => {
      a.sendToWebContents("global-shortcut-triggered", { accelerator: t });
    }) || $(`Failed to register global shortcut: ${t}`);
  (dt || ot.DEVTOOLS_ENABLED) && (ie.register("CommandOrControl+Alt+R", () => {
    a.getCurrentWindow().reload(), a.getDashboardWindow().reload();
  }), ie.register("CommandOrControl+Alt+I", () => {
    a.getDashboardWindow().isFocused() ? (a.getDashboardWindow().toggleDevTools(), a.getCurrentWindow().closeDevTools()) : (a.getCurrentWindow().toggleDevTools(), a.getDashboardWindow().closeDevTools());
  }));
}
const ks = v ? `dev-${$e()}` : $e();
function Ts() {
  h("quit-app", () => {
    u.quit();
  }), h("restart-window", () => {
    a.createOrRecreateWindows();
  }), h("check-for-update", () => {
    H.checkForUpdates();
  }), h("install-update", () => {
    st();
  }), h("get-updater-state", () => {
    a.sendToWebContents("updater-state", tt());
  }), O("request-has-onboarded", async () => ({ hasOnboarded: Qe() })), O("check-mic-permission", async () => {
    if (Ce)
      return !0;
    try {
      return ye.getMediaAccessStatus("microphone") === "granted";
    } catch (t) {
      return $("Media permission error:", t), !1;
    }
  }), O("request-media-permission", async (t, e) => {
    if (process.platform === "darwin") {
      if (e === "screen")
        try {
          return await pe.getSources({ types: ["screen"] }), !0;
        } catch {
          return !1;
        }
      try {
        const s = ye.getMediaAccessStatus(e);
        return s === "not-determined" ? await ye.askForMediaAccess(e) : s === "granted";
      } catch (s) {
        return $("Media permission error:", s), !1;
      }
    }
    return !0;
  }), h("finish-onboarding", () => {
    _t();
  }), h("reset-onboarding", () => {
    Ze();
  }), O("get-auto-launch-enabled", async () => ({ enabled: u.getLoginItemSettings().openAtLogin })), O("set-platform-access-token", (t, { accessToken: e }) => {
    Ft(e);
  }), O("set-recall-api-key", (t, { apiKey: e }) => {
    e && us();
  }), h("set-auto-launch-enabled", (t, { enabled: e }) => {
    Je(e);
  }), h("register-global-shortcut", (t, { accelerator: e }) => {
    Ss(e);
  }), h("unregister-global-shortcut", (t, { accelerator: e }) => {
    Ds(e);
  }), h("enable-dev-shortcuts", () => {
    Rs();
  }), h("reset-global-shortcuts", () => {
    As();
  }), h("set-ignore-mouse-events", (t, { ignore: e }) => {
    a.getCurrentWindow().isIpcEventFromWindow(t) && a.getCurrentWindow().setIgnoreMouseEvents(e);
  }), h("resize-window", (t, { width: e, height: s, duration: n }) => {
    a.getCurrentWindow().resizeWindow(e, s, n);
  }), h("focus-window", () => {
    a.getCurrentWindow().focus();
  }), h("unfocus-window", () => {
    a.getCurrentWindow().blur();
  }), O("capture-screenshot", async () => {
    const { contentType: t, data: e } = await ws();
    return { contentType: t, data: e };
  }), O("get-login-protocol-state", () => ({ state: ks })), h("get-available-displays", () => {
    const t = it();
    a.sendToWebContents("available-displays", { displays: t });
  }), h("get-invisible", () => {
    a.sendToWebContents("invisible-changed", {
      invisible: he()
    });
  }), h(
    "move-window-to-display",
    (t, { displayId: e, preservePosition: s, cursorScreenX: n, cursorScreenY: r }) => {
      const i = at(e);
      i && a.setTargetDisplay(i, {
        preservePosition: s,
        cursorScreenX: n,
        cursorScreenY: r
      });
    }
  ), h("show-display-overlays", () => {
    ae.showOverlays();
  }), h("hide-display-overlays", () => {
    console.log("[IPC] hide-display-overlays called"), ae.hideOverlays();
  }), h("highlight-display", (t, { displayId: e }) => {
    ae.highlightDisplay(e);
  }), h("unhighlight-display", (t, { displayId: e }) => {
    ae.unhighlightDisplay(e);
  }), h("login-user", (t, { userEmail: e }) => {
    Ct(e);
  }), h("logout-user", (t) => {
    Et();
  }), h("broadcast-to-all-windows", (t, e) => {
    a.sendToWebContents("broadcast-to-all-windows", e);
  }), h("set-dashboard-visibility", (t, { visible: e }) => {
    if (!e) {
      a.getDashboardWindow().setVisibility(!1);
      return;
    }
    (Ht().page === "login" || ot.DASHBOARD_ACTIVITY) && a.getDashboardWindow().setVisibility(!0);
  }), h("set-dashboard-state", (t, { state: e }) => {
    Vt(e);
  }), h("get-dashboard-window-state", (t) => {
    rt();
  }), h("maximize-dashboard-window", () => {
    a.getDashboardWindow().maximize();
  }), h("minimize-dashboard-window", () => {
    a.getDashboardWindow().minimize();
  }), B && (O("mac-check-macos-version", async () => {
    const { isSupported: t } = await Zt();
    return { isSupported: t };
  }), h("mac-open-system-settings", (t, { section: e }) => {
    e === "privacy > microphone" && De.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
    ), e === "privacy > screen-recording" && De.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    );
  }), h("mac-enable-native-recorder", (t, { sampleRate: e }) => {
    os(a.getCurrentWindow(), e);
  }), h("mac-disable-native-recorder", () => {
    Me();
  }), h("mac-set-mic-monitor-enabled", (t, { enabled: e, version: s }) => {
    e ? ds(s) : lt();
  }));
}
function Cs() {
  const t = () => {
    const e = a.getTargetDisplay();
    D.getAllDisplays().some((i) => i.id === e.id) || (a.setTargetDisplay(D.getPrimaryDisplay()), a.sendToWebContents("recenter-movable-windows", null));
    const r = it();
    a.sendToWebContents("available-displays", { displays: r });
  };
  D.on("display-added", t), D.on("display-removed", t), D.on("display-metrics-changed", t);
}
function Es() {
  v && process.env.PLAYWRIGHT_ENV !== "test" || ke.handle("app", async (t) => await (async () => {
    const { host: n, pathname: r } = new URL(t.url);
    if (n !== "renderer" || r.includes("..")) return null;
    const i = j.join(j.resolve(se, "../renderer"), r);
    return ut.fetch(Rt(i).toString());
  })() || new Response("bad", {
    status: 400,
    headers: { "content-type": "text/html" }
  }));
}
let Z = null;
function _s(t) {
  Z = t;
}
function Is() {
  if (console.log("[DeepLink] Setting up protocol handlers (before ready)"), console.log("[DeepLink] Platform:", process.platform), console.log("[DeepLink] Development mode:", v), console.log("[DeepLink] Scheme:", U || "(not set)"), console.log("[DeepLink] Initial argv:", process.argv), U)
    if (S && v) {
      const t = process.argv[1];
      if (process.defaultApp && process.argv.length >= 2 && t) {
        const e = j.resolve(t);
        console.log(`[DeepLink] Registering protocol '${U}' in Windows dev mode`), console.log(`[DeepLink] Electron path: ${process.execPath}`), console.log(`[DeepLink] Main script: ${e}`), u.setAsDefaultProtocolClient(U, process.execPath, [e]);
      } else
        console.warn(
          "[DeepLink] Failed to register protocol in Windows dev mode: missing main script"
        );
    } else v || (console.log(`[DeepLink] Registering protocol '${U}' in production mode`), u.setAsDefaultProtocolClient(U));
  else
    console.warn("[DeepLink] SCHEME not configured, protocol registration skipped");
  u.on("second-instance", (t, e) => {
    console.log("[DeepLink] Second instance detected, commandLine:", e), a.sendToWebContents("app-focus", { showDashboard: !0 }), Ke(e);
  }), u.on("open-url", (t, e) => {
    console.log("[DeepLink] Received open-url event:", e), _s(e);
  }), Ke(process.argv);
}
function Os() {
  console.log("[DeepLink] Completing protocol setup (after ready)"), xe.on("request", (t) => {
    console.log("[DeepLink] Received request via electronAppUniversalProtocolClient:", t), a.handleDockIcon(), a.sendToWebContents("unhide-window", { reason: "deep_link" });
    const e = a.getCurrentWindow();
    e instanceof le && e.show(), Re(t);
  }), xe.initialize({
    protocol: U,
    mode: v ? "development" : "production"
  }), u.on("activate", () => {
    a.handleDockIcon(), a.sendToWebContents("app-focus", { showDashboard: !0 });
  }), B && Ms(), a.getDashboardWindow().onceDidFinishLoad(() => {
    Z && (console.log("[DeepLink] Processing delayed deeplink:", Z), Re(Z), Z = null);
  }), ke.handle(nt, Lt);
}
function Ke(t) {
  console.log("[DeepLink] Parsing argv:", t);
  const e = t.find((s) => s.startsWith(`${U}://`));
  e ? (console.log("[DeepLink] Found deeplink URL in argv:", e), Re(e)) : console.log("[DeepLink] No deeplink URL found in argv");
}
function Re(t) {
  const e = new URL(t), s = e.hostname, n = Object.fromEntries(e.searchParams);
  a.sendToWebContents("protocol-data", { route: s, params: n });
}
function Ms() {
  let t = 0;
  u.on("browser-window-focus", () => {
    t === 0 && a.sendToWebContents("app-focus", { showDashboard: !1 });
  }), u.on("browser-window-blur", () => {
    t++, setTimeout(() => {
      t--;
    }, 300);
  });
}
async function Ps() {
  const t = u.getVersion(), e = K, n = `${process.env.PLATFORM_API_URL || "http://localhost:8787"}/desktop/check`;
  try {
    const r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        appName: e,
        appVersion: t
      })
    });
    return r.ok ? (await r.json()).supported !== !1 : (console.error("[VersionCheck] Failed to check version support:", r.statusText), !0);
  } catch (r) {
    return console.error("[VersionCheck] Error checking version support:", r), !0;
  }
}
function Ns() {
  const t = Be.buildFromTemplate([
    // override Cmd+H and Cmd+Q to both just hide the app
    {
      role: "appMenu",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        {
          label: `Hide ${K}`,
          accelerator: "Cmd+H",
          click: () => {
            a.getDashboardWindow().setVisibility(!1), a.sendToWebContents("hide-window", { reason: "native_close_requested" });
          }
        },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        {
          label: `Quit ${K}`,
          accelerator: "Cmd+Q",
          click: () => {
            a.fakeQuit();
          }
        }
      ]
    },
    // override Cmd+W to just close the dashboard window
    {
      role: "fileMenu",
      submenu: [
        {
          label: "Close Window",
          accelerator: "Cmd+W",
          click: () => {
            a.getDashboardWindow().setVisibility(!1);
          }
        }
      ]
    },
    // preserve Cmd+C, Cmd+V, etc.
    { role: "editMenu" }
  ]);
  Be.setApplicationMenu(t);
}
function Ws() {
  ee.defaultSession.setDisplayMediaRequestHandler(
    (t, e) => {
      pe.getSources({ types: ["screen"] }).then((s) => {
        const n = D.getAllDisplays();
        for (const l of n)
          if (l.internal) {
            const c = s.find(
              (p) => p.display_id === String(l.id)
            );
            if (c) {
              e({ video: c, audio: "loopback" });
              return;
            }
          }
        const r = D.getPrimaryDisplay(), i = s.find(
          (l) => l.display_id === String(r.id)
        );
        if (i) {
          e({ video: i, audio: "loopback" });
          return;
        }
        e({ video: s[0], audio: "loopback" });
      }).catch(() => {
        e({});
      });
    },
    // always use our custom handler
    { useSystemPicker: !1 }
  );
}
v && (u.commandLine.appendSwitch("allow-insecure-localhost"), u.on("certificate-error", (t, e, s, n, r, i) => {
  if (s.startsWith(new URL("https://desktop.v2.interviewcoder.co").origin)) {
    t.preventDefault(), i(!0);
    return;
  }
  i(!1);
}));
B && u.dock?.hide();
if (process.env.PLAYWRIGHT_ENV === "test") {
  Ce && (u.commandLine.appendSwitch("no-sandbox"), u.commandLine.appendSwitch("disable-dev-shm-usage"), u.commandLine.appendSwitch("disable-gpu")), u.commandLine.appendSwitch("use-fake-ui-for-media-stream"), u.commandLine.appendSwitch("use-fake-device-for-media-stream");
  const t = process.env.TEST_AUDIO_FILE;
  t && u.commandLine.appendSwitch("use-file-for-fake-audio-capture", t);
}
console.log("[Main] Setting up protocol handlers (before ready)...");
Is();
if (S) {
  console.log("[Main] Requesting single instance lock for Windows...");
  const t = u.requestSingleInstanceLock();
  console.log("[Main] Got single instance lock:", t), t || (console.log("[Main] Another instance is already running, quitting..."), u.quit(), process.exit(0)), console.log("[Main] Single instance lock acquired successfully");
}
const Bs = !v || process.env.PLAYWRIGHT_ENV === "test";
Bs && ke.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: !0,
      secure: !0,
      supportFetchAPI: !0
    }
  }
]);
async function $s() {
  if (console.log("[Main] Starting application..."), S && u.disableHardwareAcceleration(), await u.whenReady(), console.log("[Main] Checking version support..."), !await Ps()) {
    console.log("[Main] Version not supported, exiting..."), u.quit();
    return;
  }
  console.log("[Main] Version supported ✓"), v && ee.defaultSession.setCertificateVerifyProc((e, s) => {
    const { hostname: n } = e;
    if (!n) {
      s(-3);
      return;
    }
    if (n === new URL("https://desktop.v2.interviewcoder.co").hostname) {
      s(0);
      return;
    }
    s(-3);
  }), ht.setAppUserModelId(`com.${Xe}`), console.log("[Main] Setting up application..."), Ns(), Ws(), Es(), zt(), console.log("[Main] Creating windows..."), a.createOrRecreateWindows(), console.log("[Main] Windows created ✓"), console.log("[Main] Setting up handlers..."), Ts(), Pt(), Cs(), Os(), console.log("[Main] 🎬 Initializing Recall.ai SDK..."), gs();
  try {
    await ct("https://us-west-2.recall.ai"), console.log("[Main] ✅ Recall.ai SDK ready");
  } catch (e) {
    console.warn("[Main] ⚠️ Recall.ai SDK initialization failed"), console.warn("[Main] Error:", e), console.warn("[Main] Will continue without Recall SDK (V1 audio-only mode will work)");
  }
  console.log("[Main] Application startup complete ✓");
}
u.on("before-quit", () => {
  console.log("[Main] App quitting, shutting down Recall SDK..."), ms();
});
console.log("[Main] Initializing main process...");
$s().catch((t) => {
  console.error("[Main] Fatal error during startup:", t), process.exit(1);
});
//# sourceMappingURL=index.js.map
