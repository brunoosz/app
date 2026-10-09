const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 380,
    minHeight: 600,
    title: "Investa",
    backgroundColor: "#0b1929",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "Investa",
      submenu: [
        { label: "Sobre o Investa", role: "about" },
        { type: "separator" },
        { label: "Sair", accelerator: "CmdOrCtrl+Q", role: "quit" },
      ],
    },
    {
      label: "Editar",
      submenu: [
        { label: "Desfazer", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "Refazer", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
        { type: "separator" },
        { label: "Recortar", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Copiar", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Colar", accelerator: "CmdOrCtrl+V", role: "paste" },
        { label: "Selecionar Tudo", accelerator: "CmdOrCtrl+A", role: "selectAll" },
      ],
    },
    {
      label: "Visualizar",
      submenu: [
        { label: "Recarregar", accelerator: "CmdOrCtrl+R", role: "reload" },
        { label: "Tela Cheia", accelerator: "F11", role: "togglefullscreen" },
        { type: "separator" },
        { label: "Aumentar Zoom", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
        { label: "Diminuir Zoom", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
        { label: "Zoom Padrao", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
