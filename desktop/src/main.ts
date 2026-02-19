import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import { WindowTracker } from './trackers/window-tracker';
import { EventTransmitter } from './transport/transmitter';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let windowTracker: WindowTracker | null = null;
let transmitter: EventTransmitter | null = null;
let isTracking = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 600,
        resizable: false,
        frame: false,
        transparent: true,
        vibrancy: 'dark',
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
    });

    mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));
    mainWindow.on('close', (e) => {
        e.preventDefault();
        mainWindow?.hide();
    });
}

function createTray() {
    const icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwQAADsEBuJFr7QAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC44OIiH/wAAAHBJREFUOE9j/P//PwMlgIkSzUMHjBYwMDAcYGBg2E+hXv/g3v8/YBcwMzPvR8H/GBgY/mP4AGyA4H+G/0j4P7oB/8kxQPA/yX4gxwsYFoCcjOIFSpwMthIZMANuXHj/38GBYQEDxTECNwDCAw4AAN4tYKcXlZ4AAAAASUVORK5CYII='
    );
    tray = new Tray(icon);
    tray.setToolTip('Ghost Desktop Agent');

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Dashboard', click: () => mainWindow?.show() },
        { type: 'separator' },
        {
            label: 'Start Tracking',
            click: () => startTracking(),
            enabled: !isTracking,
        },
        {
            label: 'Stop Tracking',
            click: () => stopTracking(),
            enabled: isTracking,
        },
        { type: 'separator' },
        { label: 'Quit', click: () => { stopTracking(); app.exit(); } },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow?.show());
}

function startTracking() {
    if (isTracking) return;
    isTracking = true;

    transmitter = new EventTransmitter();
    windowTracker = new WindowTracker(transmitter);
    windowTracker.start();

    mainWindow?.webContents.send('tracking-status', true);
    createTray(); // Rebuild tray menu to update enabled state
}

function stopTracking() {
    if (!isTracking) return;
    isTracking = false;

    windowTracker?.stop();
    windowTracker = null;
    transmitter = null;

    mainWindow?.webContents.send('tracking-status', false);
    createTray();
}

// IPC handlers
ipcMain.handle('get-tracking-status', () => isTracking);
ipcMain.handle('start-tracking', () => { startTracking(); return true; });
ipcMain.handle('stop-tracking', () => { stopTracking(); return true; });
ipcMain.handle('get-stats', () => windowTracker?.getStats() || { events: 0, apps: [], uptime: 0 });

app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
        else mainWindow?.show();
    });
});

app.on('window-all-closed', (e: Event) => {
    e.preventDefault(); // Keep running in tray
});
