/**
 * Axiom Wilds – Electron Main Process
 *
 * Wraps the Vite web-app in a desktop window and integrates
 * with the Steamworks SDK for:
 *  • Steam authentication (ticket-based wallet linking)
 *  • Achievement unlocking (mapped to on-chain NFT badges)
 *  • Leaderboard submissions (daysSurvived ranking)
 *  • Rich Presence ("Playing – Day 7 in the Dark Forest")
 *  • Steam Overlay support
 */

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const isDev = process.env.ELECTRON_DEV === "1";

// Steam App ID – use 480 (Spacewar) during development; replace with real ID post-Greenlight
const STEAM_APP_ID = parseInt(process.env.STEAM_APP_ID || "480");

// ── Steam SDK initialisation ──────────────────────────────────────────────────

let steam = null;

function initSteam() {
  try {
    steam = require("steamworks.js");
    steam.init(STEAM_APP_ID);
    console.log("[Steam] Initialised. SteamID:", steam.localplayer.getSteamId().toString());
    return true;
  } catch (e) {
    console.warn("[Steam] Not available (running outside Steam):", e.message);
    return false;
  }
}

// ── Window factory ────────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  1024,
    minHeight: 640,
    title: "Axiom Wilds",
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload:          path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false   // needed for steamworks.js native module
    },
    // Hide default menu bar – game uses in-game UI
    autoHideMenuBar: true
  });

  if (isDev) {
    // Dev: load Vite dev server
    const DEV_PORT = process.env.VITE_PORT || 5173;
    mainWindow.loadURL(`http://localhost:${DEV_PORT}`);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // Production: load built static files
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => { mainWindow = null; });

  // Open external links in OS browser instead of Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  initSteam();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (steam) steam.deinit();
  if (process.platform !== "darwin") app.quit();
});

// ── IPC: Steam API bridge ─────────────────────────────────────────────────────
// Renderer calls window.steamAPI.* which routes through preload.js → ipcMain

ipcMain.handle("steam:getPlayerInfo", () => {
  if (!steam) return null;
  try {
    return {
      steamId:     steam.localplayer.getSteamId().toString(),
      name:        steam.localplayer.getName(),
      level:       steam.localplayer.getLevel(),
      avatarSmall: steam.localplayer.getSmallAvatarBytes()
    };
  } catch { return null; }
});

ipcMain.handle("steam:getAuthTicket", async () => {
  if (!steam) return null;
  try {
    const ticket = await steam.auth.getSessionTicket();
    return { ticket: ticket.getBytes().toString("hex") };
  } catch (e) {
    console.error("[Steam] Auth ticket error:", e);
    return null;
  }
});

ipcMain.handle("steam:unlockAchievement", (_, achievementId) => {
  if (!steam) return false;
  try {
    steam.achievement.activate(achievementId);
    steam.stats.storeStats();
    console.log(`[Steam] Achievement unlocked: ${achievementId}`);
    return true;
  } catch (e) {
    console.error("[Steam] Achievement error:", e);
    return false;
  }
});

ipcMain.handle("steam:setRichPresence", (_, key, value) => {
  if (!steam) return false;
  try {
    steam.localplayer.setRichPresence(key, value);
    return true;
  } catch { return false; }
});

ipcMain.handle("steam:submitLeaderboard", async (_, { name, score }) => {
  if (!steam) return false;
  try {
    const board = await steam.leaderboard.findOrCreate(name, "Descending", "Global");
    await steam.leaderboard.uploadScore(board, score, "KeepBest");
    return true;
  } catch (e) {
    console.error("[Steam] Leaderboard error:", e);
    return false;
  }
});

ipcMain.handle("steam:getLeaderboard", async (_, { name, range }) => {
  if (!steam) return [];
  try {
    const board   = await steam.leaderboard.find(name);
    const entries = await steam.leaderboard.getScores(board, range || 100);
    return entries.map(e => ({
      steamId: e.steamId.toString(),
      score:   e.score,
      rank:    e.globalRank
    }));
  } catch { return []; }
});

ipcMain.handle("steam:isOverlayEnabled", () => {
  if (!steam) return false;
  try { return steam.overlay.isEnabled(); } catch { return false; }
});
