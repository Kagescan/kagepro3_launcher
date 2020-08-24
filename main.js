const {app, BrowserWindow, session} = require('electron')
const path = require('path');
const url = require('url');

// HELPERS -------
// isDev -> Running in dev mode will add a shortcut key to open web console.
global.isDev = process.argv.includes("isDev");
// escapeRegex -> All of these should be escaped: \ ^ $ * + ? . ( ) | { } [ ]
const escapeRegex = (string) => {string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};


// MAIN ----------
function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 300,
    minHeight: 600,
    icon: "favicon.ico",
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false, // -> true = not able to use require()
        enableRemoteModule: true // TODO: use an alternative on future versions.

    }
  })
  if (process.platform !== 'darwin'){
    mainWindow.removeMenu();
  }
  mainWindow.webContents.openDevTools()

  // Security STUFF
  session.defaultSession.webRequest.onBeforeRequest(
    function(details, callback) {
      const dirname_url = url.pathToFileURL(__dirname).href;
      const dirname_regex = escapeRegex(dirname_url)
      const validUrl =
        RegExp(dirname_regex).test(details.url) ||
        /^https?:\/\/([^\/]+\.)?kagescan\.legtux\.org\//.test(details.url) ||
        /^https?:\/\/([^\/]+\.)?raw.githubusercontent.com\/LoganTann\//.test(details.url);

      if (!validUrl) {
        console.error(`
         The request to the website ${details.url} have been blocked by the program,
         because it isn't registered to the Allow-List for security reasons.
         Talking about it, this error shouldn't be triggered : please contact
         the developer.`)
      }
      callback( {cancel: !validUrl});
    },
    {urls: ["<all_urls>"]},
    ["blocking"]
  );

  app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      //const parsedUrl = new url.URL(navigationUrl);
      //if (parsedUrl.origin !== 'https://example.com') {
      event.preventDefault();
      // TODO: make an allowlist for pages navigation
      //}
    });
    contents.on('new-window', async (event, navigationUrl) => {
      event.preventDefault()
      // To open with the external browser, include electron's shell module.
      //await shell.openExternal(navigationUrl)
    });
  });
  // target="_blank"
  mainWindow.loadFile('launcher.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})


/*
https://stackoverflow.com/questions/46102851/electron-download-a-file-to-a-specific-location


ipcRenderer.send("download", {
    url: "URL is here",
    properties: {directory: "Directory is here"}
});

In the main.js, your code would look something like this:

const {app, BrowserWindow, ipcMain} = require("electron");
const {download} = require("electron-dl");
let window;
app.on("ready", () => {
    window = new BrowserWindow({
        width: someWidth,
        height: someHeight
    });
    window.loadURL(`file://${__dirname}/index.html`);
    ipcMain.on("download", (event, info) => {
        download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
            .then(dl => window.webContents.send("download complete", dl.getSavePath()));
    });
});

The "download complete" listener is in the renderer.js, and would look like:

const {ipcRenderer} = require("electron");
ipcRenderer.on("download complete", (event, file) => {
    console.log(file); // Full file path
});

If you want to track your download's progress:

In main.js:

ipcMain.on("download", (event, info) => {
    info.properties.onProgress = status => window.webContents.send("download progress", status);
    download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
        .then(dl => window.webContents.send("download complete", dl.getSavePath()));
});

In renderer.js:

ipcRenderer.on("download progress", (event, progress) => {
    console.log(progress); // Progress in fraction, between 0 and 1
    const progressInPercentages = progress * 100; // With decimal point and a bunch of numbers
    const cleanProgressInPercentages = Math.floor(progress * 100); // Without decimal point
});
*/
