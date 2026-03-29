/**
 * preload.js – Electron context bridge
 * Exposes a safe, minimal steamAPI to the renderer process.
 * Nothing from Node.js / Electron internals leaks into the game.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("steamAPI", {
  /** Returns { steamId, name, level } or null when running outside Steam */
  getPlayerInfo: () => ipcRenderer.invoke("steam:getPlayerInfo"),

  /**
   * Returns a hex-encoded auth session ticket string.
   * Used to link a Steam identity to a blockchain wallet:
   *   1. Frontend requests ticket
   *   2. Backend verifies ticket with Steam Web API
   *   3. Backend signs wallet-link message → user signs with MetaMask
   */
  getAuthTicket: () => ipcRenderer.invoke("steam:getAuthTicket"),

  /** Unlock a Steam achievement by its API name string */
  unlockAchievement: (id) => ipcRenderer.invoke("steam:unlockAchievement", id),

  /** Set Steam Rich Presence (shown in friends list) */
  setRichPresence: (key, value) => ipcRenderer.invoke("steam:setRichPresence", key, value),

  /**
   * Submit to a leaderboard
   * @param {string} name   – leaderboard name (e.g. "SurvivalDays")
   * @param {number} score  – integer score
   */
  submitLeaderboard: (name, score) => ipcRenderer.invoke("steam:submitLeaderboard", { name, score }),

  /**
   * Fetch top entries from a leaderboard
   * @returns {Array<{ steamId, score, rank }>}
   */
  getLeaderboard: (name, range) => ipcRenderer.invoke("steam:getLeaderboard", { name, range }),

  isOverlayEnabled: () => ipcRenderer.invoke("steam:isOverlayEnabled"),
});
