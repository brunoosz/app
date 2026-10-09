const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("investa", {
  platform: process.platform,
  isElectron: true,
});
