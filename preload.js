const {contextBridge, ipcRenderer} = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld( "api", {
  send: (channel, data) => {
    // whitelist channels
    const validChannels = [
      "toggleDevTools", "sendIsDev", "checkFiles", "getVersion", "startDownload"
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.log(`${channel} is not registered...`);
    }
  },
  receive: (channel, func) => {
    const validChannels = [
      "devtools-opened", "sendIsDev-reply", "checkFiles-reply", "getVersion-reply",
      "updateDownloadMessage", "downloadFinished", "alert"
    ];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    } else {
      console.log(`${channel} is not registered...`);
    }
  }
});
