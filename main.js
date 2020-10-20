const {app, BrowserWindow, session, ipcMain, webContents, shell } = require('electron')
const path = require('path');
const url = require('url');
const fs = require('fs');
const {download} = require('electron-dl');
const crypto = require('crypto');

// HELPERS -------
// isDev -> Running in dev mode will add a shortcut key to open web console.
global.isDev = process.argv.includes("isDev");
// escapeRegex -> All of these should be escaped: \ ^ $ * + ? . ( ) | { } [ ]
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function formatBytes(bytes, decimals = 2) {
  // https://stackoverflow.com/a/18650828
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
        nodeIntegration: false,
        contextIsolation: true,
        worldSafeExecuteJavaScript: true,
        enableRemoteModule: false,
        sandbox: true,
        disableBlinkFeatures: "Auxclick",
        preload: path.join(__dirname, 'preload.js')
    }
  })

  if (process.platform !== 'darwin'){
    mainWindow.removeMenu();
  }

  if (global.isDev) {
    ipcMain.on("toggleDevTools", ()=>{
      mainWindow.webContents.openDevTools();
    });
    // if dev, open on startup
    mainWindow.webContents.openDevTools();
  }
  mainWindow.webContents.on("devtools-opened", ()=>{
    mainWindow.webContents.send("devtools-opened");
  });

  // Security STUFF
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},
    // will get every http requests, but not file:///
    function(details, callback) {
      const dirname_url = url.pathToFileURL(__dirname).href;
      const dirname_regex = escapeRegex(dirname_url);
      const validUrl =
        ( //RegExp(dirname_regex).test(details.url) ||
          /^https?:\/\/([^\/]+\.)?kagescan\.legtux\.org\/fangame\//.test(details.url) ||
          /^https?:\/\/([^\/]+\.)?kagescan\.fr\/fangame\//.test(details.url) ||
          /^https?:\/\/([^\/]+\.)?raw.githubusercontent.com\/LoganTann\//.test(details.url)
        ) && (!details.url.includes("../"));
      if (!validUrl) {
        mainWindow.webContents.send("alert",
          `The launcher attempted to fetch ${details.url}, but this url don't match the allowlist. This request have been blocked for security reasons. Talking about it, this error shouldn't be triggered : please contact the developer.`
        );
      }
      callback( {cancel: !validUrl});
    },
    {urls: ["<all_urls>"]},
    ["blocking"]
  );

  // Window.open opens only on the default browser.
  mainWindow.webContents.on("new-window", function(event, url) {
    event.preventDefault();
    if (url.startsWith("https://")) {
      shell.openExternal(url);
    }
  });

  ipcMain.on("getVersion", ()=>{
    mainWindow.webContents.send("getVersion-reply", process.env.npm_package_version);
  });

  mainWindow.loadFile('launcher.html');



  //////////////////////////////
  async function test_download_file(file_path) {
    const url = `https://raw.githubusercontent.com/LoganTann/kagepro2/production/${file_path}`;
    const oldPath = file_path + '.old';
    try {
      if (url.includes("..")) {
        throw "SECURITY ERROR : the url " + url + " contains prohibited characters : '..' ";
      }
      if (fs.existsSync(file_path))  {
        fs.rename(file_path, oldPath, function(err) {
            if (err) throw(`cannot rename ${file_path} to ${oldPath} : ${err}`)
        });
      }
      const reply = await download(mainWindow, url, {
        directory: path.join(__dirname, path.dirname(file_path)),
        filename: path.basename(file_path),
        onCancel: (status) => {console.error(status);},
        onProgress: (status) => {
          mainWindow.webContents.send("updateDownloadMessage", {
            type: "fileProgress",
            content: (status.percent * 100).toFixed(2)
          });
          mainWindow.webContents.send("updateDownloadMessage", {
            type: "fileTitle",
            content: `${file_path} (${formatBytes(status.transferredBytes)}/${formatBytes(status.totalBytes)})`
          });
        }
      });
      if (fs.existsSync(file_path) && fs.existsSync(oldPath))  {
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
      mainWindow.webContents.send("updateDownloadMessage", {
        type: "fileTitle",
        content: `${file_path} (Error ?!)`
      });
      console.error(`Got an error while downloading the file ${file_path} : ${e}`);
      return false;
    }
  };
  ipcMain.on("checkFiles", async (e, hashList)=>{
    const queue = {
      "code": [],
      "assets": [],
      "musics": [], //  Thoses are large files and takes
      "videos": [], // around the half of the assets's size
      "totalSize": 0,
      "formatedSize": "0 MB"
    }
    for (const item of hashList) {
      if (item.length !== 3) {
        continue;
      }

      const [file_name, file_hash, file_size] = item;
      const file_path = path.join(__dirname, file_name);
      const isThisFileNeedToBeDownloaded = false;
      let type_of_edition = "insertion";
      if (fs.existsSync(file_path)) {
        const local_hash = await checksumFile(file_path);
        if (local_hash == file_hash) {
          // Logic is simple: don't download if the file exists and hash is same
          continue;
        } else {
          type_of_edition = "edition";
        }
      }

      let type_of_file = "code";
      if (file_name.includes("assets/")) {
        if (file_name.includes("music/")) {
          type_of_file = "musics";
        } else if (file_name.includes("videos/")) {
          type_of_file = "videos";
        } else {
          type_of_file = "assets";
        }
      }
      queue[type_of_file].push( {url: file_name, editType: type_of_edition, fileSize: file_size});
      queue.totalSize += file_size;
    }
    queue.formatedSize = formatBytes(queue.totalSize);
    mainWindow.webContents.send("checkFiles-reply", queue);
    return queue;
  });

  function checksumFile(path) {
    /* Given the file [path], this will return the hash (sha1) of this file. */
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(path);
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => {
        const file_hash = hash.digest('hex');
        resolve(file_hash);
      });
    });
  }

  ipcMain.on("sendIsDev", ()=>{ // question ?
    if (global.isDev) {
      mainWindow.webContents.send("sendIsDev-reply"); // answer !
    }
  });

  ipcMain.on("startDownload", async (event, download_list) => {
    const nbr_of_types = Object.keys(download_list).length - 2;
    // ->> 2 = formatedSize + totalSize should be ignored
    let current_type_index = 1;
    for (const download_category in download_list) {
      if (!Array.isArray(download_list[download_category])) {
        continue;
      }
      mainWindow.webContents.send("updateDownloadMessage", {
        type: "categoryTitle",
        content: `Downloading ${download_category} (${current_type_index}/${nbr_of_types})`
      });
      mainWindow.webContents.send("updateDownloadMessage", {
        type: "categoryProgress",
        content: 0
      });
      const total_items_in_that_category = download_list[download_category].length;
      let items_of_this_category_dld = 1;
      for (const download_item of download_list[download_category]) {
        const url = download_item.url;
        const fileSize = download_item.fileSize;
        const props = {};
        mainWindow.webContents.send("updateDownloadMessage", {
          type: "fileTitle",
          content: `${url} (0 Bytes/${formatBytes(fileSize)})`
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
