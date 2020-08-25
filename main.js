const {app, BrowserWindow, session, ipcMain, webContents } = require('electron')
const path = require('path');
const url = require('url');
const fs = require('fs');
const {download} = require('electron-dl');

// HELPERS -------
// isDev -> Running in dev mode will add a shortcut key to open web console.
global.isDev = process.argv.includes("isDev");
// escapeRegex -> All of these should be escaped: \ ^ $ * + ? . ( ) | { } [ ]
const escapeRegex = (string) => {string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};

function formatBytes(bytes, decimals = 2) {
  // TODO: Remove the duplication
  // duplicated from updater.js https://stackoverflow.com/a/18650828
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

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
        enableRemoteModule: true, // TODO: use an alternative on future versions.
        preload: path.join(__dirname, 'preload.js')
    }
  })

  if (process.platform !== 'darwin'){
    mainWindow.removeMenu();
  }
  if (global.isDev) {
    mainWindow.webContents.openDevTools();
  }

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



  //////////////////////////////
  async function test_download_file(file_path) {
    const url = `https://raw.githubusercontent.com/LoganTann/kagepro2/production/${file_path}`;
    const oldPath = file_path + '.old';
    try {
      if (fs.existsSync(file_path))  {
        fs.rename(file_path, oldPath, function(err) {
            if (err) throw(`cannot rename ${file_path} to ${oldPath} : ${err}`)
        });
      }
      const reply = await download(mainWindow, url, {
        directory: path.join(__dirname, path.dirname(file_path)),
        onCancel: (status) => {console.error(status);},
        onProgress: (status) => {
          if (status.totalBytes > 1000000) {
            // no need to update if it's instant
            mainWindow.webContents.send("updateDownloadMessage", {
              type: "fileProgress",
              content: (status.percent * 100).toFixed(2)
            });
          }
          mainWindow.webContents.send("updateDownloadMessage", {
            type: "fileTitle",
            content: `${file_path} (${formatBytes(status.transferredBytes)}/${formatBytes(status.totalBytes)})`
          });
        }
      });
      if (fs.existsSync(oldPath) && fs.existsSync(path))  {
        fs.unlinkSync(oldPath);
      }
      return reply;
    } catch (e) {
      if (fs.existsSync(file_path) && fs.existsSync(oldPath))  {
        fs.unlinkSync(file_path);
        fs.rename(oldPath, file_path, function(err) {
            if (err) console.error(`cannot rename ${oldPath} to ${file_path} : ${err}`);
        });
      }
      console.error(`Got an error while downloading the file ${file_path} : ${e}`);
      return false;
    }
  }
  ipcMain.on("startDownload", async (event, download_list) => {
    const nbr_of_types = Object.keys(download_list).length - 1;
    let current_type_index = 1;
    for (const download_type in download_list) {
      if (!Array.isArray(download_list[download_type])) {
        continue;
      }
      mainWindow.webContents.send("updateDownloadMessage", {
        type: "categoryTitle",
        content: `Downloading ${download_type} (${current_type_index}/${nbr_of_types})`
      });
      mainWindow.webContents.send("updateDownloadMessage", {
        type: "categoryProgress",
        content: 0
      });
      const total_items_in_that_category = download_list[download_type].length;
      let items_of_this_category_dld = 1;
      for (const download_item of download_list[download_type]) {
        const url = download_item.url;
        const props = {};
        mainWindow.webContents.send("updateDownloadMessage", {
          type: "fileTitle",
          content: `${url} ...`
        });
        mainWindow.webContents.send("updateDownloadMessage", {
          type: "categoryProgress",
          content: (100 * items_of_this_category_dld/total_items_in_that_category).toFixed(2)
        });
        mainWindow.webContents.send("updateDownloadMessage", {
          type: "fileProgress",
          content: 0
        });
        // Well, making async kind of sync function
        const result = await test_download_file(url);
        items_of_this_category_dld++;
      }
      current_type_index++;
    }
    mainWindow.webContents.send("downloadFinished");
  });
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
