import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { CardData, PersonaFormData } from "@shared/types";
import { BrowserWindow, Menu, Tray, app, dialog, ipcMain, nativeImage, net, protocol, shell } from "electron";
import { autoUpdater } from "electron-updater";
import path, { join } from "path";
import icon from "../../resources/icon.png?asset";
import blob from "./lib/store/blob";
import secret from "./lib/store/secret";
import setting from "./lib/store/setting";
import sqlite from "./lib/store/sqlite";
import { cardsRootPath, personasRootPath } from "./lib/utils";
import { XFetchConfig, xfetch } from "./lib/xfetch";

let window: any;
// let loadingWindow: any;
let isQuiting = false;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "agf",
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      supportFetchAPI: false
    }
  }
]);
app.enableSandbox();

app.whenReady().then(async () => {
  // Load react devtools in development if REACT_DEVTOOLS is set to true
  if (is.dev && process.env["REACT_DEVTOOLS"] === "true") {
    const { REACT_DEVELOPER_TOOLS, default: installExtension } = await import("electron-devtools-assembler");
    await installExtension(REACT_DEVELOPER_TOOLS);
  }
  electronApp.setAppUserModelId("gf.anime");

  // Set the autoUpdater config path to the dev-app-update.yml in development
  // This allows us to test the autoUpdater with releases from another repo
  if (is.dev) {
    autoUpdater.updateConfigPath = path.join(process.cwd(), "dev-app-update.yml");
  }

  // Close to tray functionalities
  // https://stackoverflow.com/questions/37828758/electron-js-how-to-minimize-close-window-to-system-tray-and-restore-window-back
  const tray = new Tray(nativeImage.createFromPath(icon));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App      ",
      click: () => {
        window.show();
      }
    },
    {
      label: "Quit",
      click: () => {
        isQuiting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip("anime.gf");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    window.show();
  });
  app.on("before-quit", () => {
    isQuiting = true;
  });

  app.on("second-instance", () => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });

  // Disable navigation for security purposes
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-navigate", (event, _navigationUrl) => {
      event.preventDefault();
    });
  });

  /**
   * An electron protocol that handles requests from the renderer process to agf:///host/path
   * https://www.electronjs.org/docs/latest/api/protocol
   * Currently only supports the "cards" host agf:///cards/path
   *
   * The renderer process cannot access the filesystem.
   * This is a problem when you want to display images stored on disk.
   *
   * You could serialize an image through electron IPC but this is slow.
   *
   * You should use this protocol to display images instead.
   *
   * Note that requests made through fetch are disabled.
   * So fetch(agf:///cards/whatever/path) will be rejected
   * Instead use <img src="agf:///host/path"
   *
   * @example
   * Example usage in renderer:
   * <img src="agf:///cards/some_char/avatar.png"/>
   * <img src="agf:///cards/some_other_char/banner.png"/>
   *
   */
  protocol.handle("agf", (req) => {
    const { host, pathname } = new URL(req.url);
    if (host === "cards") {
      const resolved = path.resolve(path.join(cardsRootPath, pathname));
      // Ensure that only resources inside userData/blob/cards are accessible
      if (!resolved.startsWith(cardsRootPath)) {
        return new Response(
          `The requested path is unsafe.
      Path given"${pathname}
      Resolved to${resolved}
      Resolved path is outside of the allowed directory: ${cardsRootPath}"`,
          { status: 400 }
        );
      }
      return net.fetch(path.join("file://", resolved));
    }

    if (host === "personas") {
      const resolved = path.resolve(path.join(personasRootPath, pathname));

      if (!resolved.startsWith(personasRootPath)) {
        return new Response(
          `The requested path is unsafe.
      Path given"${pathname}
      Resolved to${resolved}
      Resolved path is outside of the allowed directory: ${personasRootPath}"`,
          { status: 400 }
        );
      }
      return net.fetch(path.join("file://", resolved));
    }

    return new Response(`Host "${host}" is unsupported.`, {
      status: 400,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  });

  await sqlite.init();
  await blob.init();
  await secret.init();
  await setting.init();

  ipcMain.handle("sqlite.run", async (_, query: string, params: [] = []) => {
    return sqlite.run(query, params);
  });
  ipcMain.handle("sqlite.all", async (_, query: string, params: [] = []) => {
    return sqlite.all(query, params);
  });
  ipcMain.handle("sqlite.get", async (_, query: string, params: [] = []) => {
    return sqlite.get(query, params);
  });
  ipcMain.handle("sqlite.runAsTransaction", async (_, queries: string[], params: [][]) => {
    return sqlite.runAsTransaction(queries, params);
  });

  ipcMain.handle("blob.image.get", async (_, path: string) => {
    return await blob.image.get(path);
  });

  ipcMain.handle("blob.cards.get", async (_, card: string) => {
    return await blob.cards.get(card);
  });

  ipcMain.handle(
    "blob.cards.create",
    async (_, cardData: CardData, bannerURI: string | null, avatarURI: string | null) => {
      return await blob.cards.create(cardData, bannerURI, avatarURI);
    }
  );

  ipcMain.handle(
    "blob.cards.update",
    async (_, cardID: number, cardData: CardData, bannerURI: string | null, avatarURI: string | null) => {
      return await blob.cards.update(cardID, cardData, bannerURI, avatarURI);
    }
  );

  ipcMain.handle("blob.cards.del", async (_, cardID: number) => {
    return await blob.cards.del(cardID);
  });

  ipcMain.handle("blob.cards.exportToZip", async (_, card: string) => {
    return await blob.cards.exportToZip(card);
  });

  ipcMain.handle("blob.cards.importFromZip", async (_, zip: string) => {
    return await blob.cards.importFromZip(zip);
  });

  ipcMain.handle("blob.personas.get", async (_, persona: string) => {
    return await blob.personas.get(persona);
  });
  ipcMain.handle("blob.personas.post", async (_, data: PersonaFormData) => {
    return await blob.personas.post(data);
  });

  ipcMain.handle("blob.personas.put", async (_, id: number, data: PersonaFormData) => {
    return await blob.personas.put(id, data);
  });

  ipcMain.handle("secret.get", async (_, k: string) => {
    return await secret.get(k);
  });

  ipcMain.handle("secret.set", async (_, k: string, v: string) => {
    return await secret.set(k, v);
  });

  ipcMain.handle(
    "xfetch.post",
    async (_, url: string, body?: object, headers?: Record<string, string>, config?: XFetchConfig) => {
      return await xfetch.post(url, body, headers, config);
    }
  );

  ipcMain.handle("xfetch.get", async (_, url: string, headers?: Record<string, string>, config?: XFetchConfig) => {
    return await xfetch.get(url, headers, config);
  });

  ipcMain.handle("xfetch.abort", async (_, uuid: string) => {
    return await xfetch.abort(uuid);
  });

  ipcMain.handle("utils.openURL", async (_, url: string) => {
    return await shell.openExternal(url);
  });

  ipcMain.handle("setting.get", async () => {
    return await setting.get();
  });

  ipcMain.handle("setting.set", async (_, settings: any) => {
    return await setting.set(settings);
  });

  // Open or close DevTools using F12 in development
  // Ignore Cmd/Ctrl + R in production.
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("activate", function () {
    // For macOS, re-create a window in the app when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  // Check for updates every 15 minutes
  setInterval(
    () => {
      autoUpdater.checkForUpdatesAndNotify();
    },
    1000 * 60 * 15
  );
  autoUpdater.on("update-downloaded", (e) => {
    const { version } = e;
    const dialogOpts: Electron.MessageBoxOptions = {
      type: "info",
      buttons: ["Restart", "Later"],
      title: "Application Update",
      message: `anime.gf version ${version} has been downloaded.`,
      detail: "Restart the application to apply the update."
    };

    dialog.showMessageBox(dialogOpts).then((val) => {
      if (val.response === 0) {
        isQuiting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on("error", (error) => {
    console.error("There was a problem updating the application");
    console.error(error);
  });

  createWindow();
});

function createWindow(): void {
  window = new BrowserWindow({
    title: "anime.gf",
    icon: icon,
    width: 900,
    height: 670,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      spellcheck: false,
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      webSecurity: true
    }
  });

  window.on("ready-to-show", () => {
    // if (loadingWindow) loadingWindow.close();
    window.show();
  });

  window.on("close", async (e) => {
    if (!isQuiting) {
      e.preventDefault();
      const settingsRes = await setting.get();
      if (settingsRes.kind === "ok" && settingsRes.value?.advanced?.closeToTray) {
        window.hide();
        return;
      } else {
        app.quit();
        return false;
      }
    }
    app.quit();
    return false;
  });

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Load vite dev server in development or static files in production
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// function createLoadingWindow() {
//   loadingWindow = new BrowserWindow({
//     width: 400,
//     height: 300,
//     frame: false,
//     transparent: true,
//     alwaysOnTop: true
//   });
//   if (is.dev) {
//     loadingWindow.loadURL(join(process.env["ELECTRON_RENDERER_URL"] || "", "loading.html"));
//   } else {
//     loadingWindow.loadFile(join(__dirname, "../renderer/loading.html"));
//   }

//   loadingWindow.on("closed", () => (loadingWindow = null));
// }
