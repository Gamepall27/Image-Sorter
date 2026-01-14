import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const imageExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.tiff',
  '.heic',
])

const videoExtensions = new Set([
  '.mp4',
  '.mov',
  '.mkv',
  '.webm',
  '.avi',
  '.m4v',
])

let win: BrowserWindow | null

type MediaItem = {
  id: string
  name: string
  path: string
  extension: string
  type: 'image' | 'video'
  sizeBytes: number
  modifiedAt: number
}

async function scanDirectory(directory: string, items: MediaItem[]) {
  const entries = await fs.readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await scanDirectory(entryPath, items)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const extension = path.extname(entry.name).toLowerCase()
    const isImage = imageExtensions.has(extension)
    const isVideo = videoExtensions.has(extension)

    if (!isImage && !isVideo) {
      continue
    }

    const stats = await fs.stat(entryPath)

    items.push({
      id: entryPath,
      name: entry.name,
      path: entryPath,
      extension,
      type: isImage ? 'image' : 'video',
      sizeBytes: stats.size,
      modifiedAt: stats.mtimeMs,
    })
  }
}

async function scanMediaFolders(folders: string[]) {
  const items: MediaItem[] = []

  for (const folder of folders) {
    await scanDirectory(folder, items)
  }

  return items
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  ipcMain.handle('select-folders', async () => {
    if (!win) {
      return []
    }

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'multiSelections'],
    })

    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('scan-folders', async (_event, folders: string[]) => {
    return scanMediaFolders(folders)
  })

  ipcMain.handle('trash-items', async (_event, paths: string[]) => {
    const results = await Promise.all(
      paths.map(async (itemPath) => {
        try {
          await shell.trashItem(itemPath)
          return { path: itemPath, ok: true }
        } catch (error) {
          return { path: itemPath, ok: false, error: (error as Error).message }
        }
      }),
    )

    return results
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
