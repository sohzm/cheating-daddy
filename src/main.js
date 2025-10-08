const path = require("path");
const { app, BrowserWindow } = require("electron");
const isDev = !!process.env.ELECTRON_START_URL || process.env.NODE_ENV === "development";
function createWindow() {
  // If main.js is located in src/, preload.js should be in the same folder (src/preload.js).
  // If your project layout differs, adjust the path below.
  const preloadPath = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // When packaged, load the built renderer files
    const indexPath = path.join(__dirname, "renderer", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }
  mainWindow.on("closed", () => {
    // dereference
  });
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});