const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Initialize electron-store for settings persistence
const store = new Store();

// Keep a global reference of the window object
let mainWindow;
let penpotBackendProcess = null;

// Development mode detection
const isDev = process.env.NODE_ENV === 'development';

// PenPot configuration
const PENPOT_CONFIG = {
  frontend: {
    dev: 'http://localhost:3449',
    prod: path.join(__dirname, '../resources/penpot-frontend/index.html')
  },
  backend: {
    dev: 'http://localhost:6060',
    prod: 'http://localhost:6060' // Will run local backend in production too
  }
};

function createWindow() {
  // Get window state from store
  const windowState = store.get('windowState', {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined,
    maximized: false
  });

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev // Disable web security in dev mode for CORS
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false, // Don't show until ready
    icon: getAppIcon()
  });

  // Restore maximized state
  if (windowState.maximized) {
    mainWindow.maximize();
  }

  // Load PenPot application
  const startUrl = isDev ? PENPOT_CONFIG.frontend.dev : `file://${PENPOT_CONFIG.frontend.prod}`;
  
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load PenPot:', err);
    // Show error dialog
    dialog.showErrorBox('Failed to Load PenPot', 
      'Could not load the PenPot application. Please check if the development server is running.');
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus the window
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Save window state on close
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    
    store.set('windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: isMaximized
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow navigation within the app
    if (parsedUrl.origin !== PENPOT_CONFIG.frontend.dev && 
        !navigationUrl.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

function getAppIcon() {
  // Return appropriate icon path based on platform
  const iconName = process.platform === 'win32' ? 'icon.ico' : 
                   process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
  return path.join(__dirname, '../assets', iconName);
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-project');
          }
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'PenPot Files', extensions: ['penpot'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('menu-action', 'open-project', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu-action', 'save-project');
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              filters: [
                { name: 'PenPot Files', extensions: ['penpot'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-action', 'save-as-project', result.filePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            {
              label: 'Export as PNG',
              click: () => {
                mainWindow.webContents.send('menu-action', 'export-png');
              }
            },
            {
              label: 'Export as SVG',
              click: () => {
                mainWindow.webContents.send('menu-action', 'export-svg');
              }
            }
          ]
        },
        { type: 'separator' },
        process.platform === 'darwin' ? 
          { role: 'close' } : 
          { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About PenPot Desktop',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About PenPot Desktop',
              message: 'PenPot Desktop',
              detail: `Version: ${app.getVersion()}\nProfessional offline design tool based on PenPot\n\nBuilt with Electron ${process.versions.electron}`
            });
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();
  
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

// IPC handlers for desktop-specific functionality
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    await fs.promises.writeFile(filePath, data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle app updates (for future implementation)
ipcMain.handle('check-for-updates', () => {
  // TODO: Implement auto-updater
  return { hasUpdate: false };
});

console.log('PenPot Desktop starting...');
console.log('Development mode:', isDev);
console.log('Electron version:', process.versions.electron);