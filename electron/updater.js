const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

module.exports = { checkForUpdate, downloadAndInstall };

function checkForUpdate(mainWindow) {
  if (!mainWindow) return;
  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'jspgamer0503-coder',
    repo: 'Okara-Hub'
  });
  autoUpdater.checkForUpdates();
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info);
  });
  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update-not-available');
  });
}

function downloadAndInstall() {
  autoUpdater.downloadUpdate();
  autoUpdater.on('download-progress', (progress) => {
    const win = require('electron').BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.send('download-progress', progress);
  });
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });
}
