// main.js
const { app, BrowserWindow, session, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const electronIsDev = require('electron-is-dev');

// Determine whether we're running in development mode.
// Priority: NODE_ENV=development or ELECTRON_DEV=true, otherwise fall back to electron-is-dev.
function isDevelopment() {
  // Consider production when NODE_ENV=production or when the app is packaged.
  const isProdFlag = process.env.NODE_ENV === 'production' || app.isPackaged;
  if (isProdFlag) return false;

  // Otherwise honor explicit ELECTRON_DEV or electron-is-dev fallback.
  return process.env.ELECTRON_DEV === 'true' || electronIsDev || process.env.NODE_ENV === 'development';
}


function createWindow(openBrowserTools = false, splash) {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false, // Keep hidden until loaded
  backgroundColor: '#ffffff', // Use light background to match app and avoid black flash
    titleBarStyle: 'hidden', // Hide the default title bar
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDevelopment() // Disable web security in production for file:// protocol
    }
  });
  

  // Add close confirmation dialog
  mainWindow.on('close', async (e) => {
    // Only show dialog if window is not already being force-closed and there's no active error dialog
    if (!mainWindow.isDestroyed() && !mainWindow.forceClose && !mainWindow.hasNetworkError) {
      e.preventDefault();
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 1,
        cancelId: 1,
        title: 'Confirm Exit',
        message: 'Are you sure you want to quit the Application?',
        detail: 'Any unsaved work will be lost.'
      });
      if (result.response === 0) {
        // User chose Yes
        mainWindow.forceClose = true;
        mainWindow.close();
      }
      // If No, do nothing (window stays open)
    }
  });

  let url;
  if (isDevelopment()) {
    // Development: load from Vite dev server
    url = 'http://localhost:5173';
  } else {
    // Packaged app: load the built renderer from the resources directory
    // When packaged, renderer build will be placed under resources/renderer/build
  const indexPath = path.join(process.resourcesPath, 'frontend', 'build', 'index.html');
    url = `file://${indexPath}`;
  }
  if (openBrowserTools) {
    url += '#/admin-browser';
  }
  
  // Load the URL normally first
  mainWindow.loadURL(url);

  // Debug: log cookies after loading URL (to see if backend cookie was set)
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const cookies = await session.defaultSession.cookies.get({});
      console.log('[DEBUG] cookies after did-finish-load:', cookies);
    } catch (err) {
      console.error('[DEBUG] error reading cookies:', err);
    }
  });
  
  // Force a refresh after the initial load to get fresh content
  mainWindow.webContents.on('did-finish-load', () => {
    // Only reload once on startup
    if (!mainWindow.hasLoadedFresh) {
      mainWindow.hasLoadedFresh = true;
      
      // Short delay before reload to ensure everything is ready
      setTimeout(() => {
        mainWindow.webContents.reload();
      }, 100);
    }
  });

  // Timeout logic
  let loadTimeout = setTimeout(() => {
    if (splash && !splash.isDestroyed()) splash.destroy();
    mainWindow.hasNetworkError = true; // Set the network error flag
    dialog.showErrorBox(
      'Network Error',
      'Unable to load the website.\nPlease check your internet connection or contact your administrator.'
    );
    app.quit();
  }, 60000); // 60 seconds

  // Show main window only after content is loaded
  mainWindow.webContents.on('did-finish-load', () => {
    clearTimeout(loadTimeout);
    
    // If this is the second load (after our forced refresh), show the window
    if (mainWindow.hasLoadedFresh) {
      if (splash && !splash.isDestroyed()) splash.destroy();
      mainWindow.show();
      
      if (isDevelopment()) {
        mainWindow.webContents.openDevTools();
      }
    }
  });

  // If page fails to load, show error and quit
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    clearTimeout(loadTimeout);
    if (splash && !splash.isDestroyed()) splash.destroy();
    mainWindow.hasNetworkError = true; // Set the network error flag
    dialog.showErrorBox(
      'Network Error',
      'Failed to load the website.\nPlease check your internet connection or contact your administrator.'
    );
    app.quit();
  });
}

app.whenReady().then(async () => {
  // Debug: log user data path and any existing cookies at startup
  try {
    console.log('[DEBUG] Electron userData path:', app.getPath('userData'));
    const existingCookies = await session.defaultSession.cookies.get({});
    console.log('[DEBUG] cookies at startup:', existingCookies);
  } catch (err) {
    console.error('[DEBUG] error reading cookies at startup:', err);
  }
  // Show improved splash screen while app is starting
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: false,
    show: true,
  backgroundColor: '#ffffff',
    webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: path.join(__dirname, 'preload.js')
    }
  });
  

  splash.loadFile(path.join(__dirname, 'splash.html'));


  // Wait for splash to be ready before creating main window
  splash.once('ready-to-show', () => {
    setTimeout(() => {
      createWindow(false, splash);
      // Splash will be closed after main window loads
    }, 800); // Longer delay to ensure splash is fully visible
  });
});



// Window control IPC handlers
ipcMain.handle('minimize-window', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    if (focusedWindow.isMaximized()) {
      focusedWindow.unmaximize();
    } else {
      focusedWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(false);
  }
});