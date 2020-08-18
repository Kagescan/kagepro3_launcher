const {app, BrowserWindow} = require('electron')
const path = require('path')

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 300,
    minHeight: 600,
    icon: "favicon.ico",
    webPreferences: {
        nodeIntegration: true
    }
  })

  if (process.platform !== 'darwin')
    mainWindow.removeMenu();

  mainWindow.loadFile('launcher.html');
}
app.whenReady().then(() => {
  var { net } = require('electron');
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
