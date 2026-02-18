const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;

const isDev = !app.isPackaged;

function waitForReactServer() {
  const DEV_URL = 'http://localhost:3000';
  const INTERVAL = 400;
  const MAX_ATTEMPTS = 150;

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryConnect = () => {
      attempts += 1;
      const req = http.get(DEV_URL, (res) => {
        req.destroy();
        resolve();
      });
      req.on('error', () => {
        req.destroy();
        if (attempts >= MAX_ATTEMPTS) {
          reject(new Error('React dev server did not become ready in time. Ensure npm run dev:react is running on port 3000.'));
          return;
        }
        setTimeout(tryConnect, INTERVAL);
      });
    };

    tryConnect();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff'
  });

  const buildIndexPath = path.join(app.getAppPath(), 'build', 'index.html');

  const loadBuild = () => {
    if (!fs.existsSync(buildIndexPath)) {
      console.error('build/index.html introuvable :', buildIndexPath);
      mainWindow.loadURL('data:text/plain,Erreur : build/index.html introuvable. Exécutez "npm run build" d\'abord.');
      return;
    }
    const fileUrl = `file://${buildIndexPath}`;
    mainWindow.loadURL(fileUrl).catch((err) => {
      console.error('Erreur de chargement du build :', err);
      mainWindow.loadURL('data:text/plain,Erreur de chargement de l\'interface. Vérifiez le build.');
    });
  };

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    loadBuild();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (isDev) {
    try {
      await waitForReactServer();
    } catch (err) {
      console.error(err.message);
      app.quit();
      return;
    }
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Gestionnaire pour sauvegarder le PDF
ipcMain.handle('save-pdf', async (event, pdfData, defaultFilename) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Enregistrer le devis',
    defaultPath: defaultFilename || 'devis.pdf',
    filters: [
      { name: 'PDF', extensions: ['pdf'] }
    ]
  });

  if (!canceled && filePath) {
    try {
      const buffer = Buffer.from(pdfData);
      fs.writeFileSync(filePath, buffer);
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});
