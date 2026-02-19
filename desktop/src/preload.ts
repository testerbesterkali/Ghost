import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ghostAgent', {
    getTrackingStatus: () => ipcRenderer.invoke('get-tracking-status'),
    startTracking: () => ipcRenderer.invoke('start-tracking'),
    stopTracking: () => ipcRenderer.invoke('stop-tracking'),
    getStats: () => ipcRenderer.invoke('get-stats'),
    onTrackingStatus: (callback: (status: boolean) => void) => {
        ipcRenderer.on('tracking-status', (_event, status) => callback(status));
    },
});
