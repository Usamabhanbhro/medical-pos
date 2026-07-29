const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe bridge for renderer -> main IPC invokes
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, (event, ...args) => listener(...args)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
