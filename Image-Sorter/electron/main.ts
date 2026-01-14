import { app, BrowserWindow, dialog, ipcMain, protocol, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'

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

let win: BrowserWindow | null

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic'])
const videoExtensions = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v'])

const hashFile = async (filePath: string) => {
  const buffer = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

const scanFolder = async (folder: string) => {
  const results: Array<{
    id: string
    name: string
    path: string
    fileUrl: string
    size: number
    modifiedAt: number
    type: 'image' | 'video'
    folder: string
    autoFlag?: string
    hash?: string
  }> = []

  const entries = await fs.readdir(folder, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await scanFolder(entryPath)))
      continue
    }
    if (!entry.isFile()) continue

    const ext = path.extname(entry.name).toLowerCase()
    const isImage = imageExtensions.has(ext)
    const isVideo = videoExtensions.has(ext)

    if (!isImage && !isVideo) continue

    const stats = await fs.stat(entryPath)
    const autoFlag = entry.name.toLowerCase().includes('screenshot')
      ? 'Screenshot'
      : stats.size < 200 * 1024
        ? 'Sehr klein'
        : undefined

    const hash = isImage ? await hashFile(entryPath) : undefined

    results.push({
      id: entry.name,
      name: entry.name,
      path: entryPath,
      fileUrl: `media://${encodeURIComponent(entryPath)}`,
      size: stats.size,
      modifiedAt: stats.mtimeMs,
      type: isImage ? 'image' : 'video',
      folder,
      autoFlag,
      hash,
    })
  }

  return results
}

const registerMediaProtocol = () => {
  protocol.registerFileProtocol('media', (request, callback) => {
    const url = request.url.replace('media://', '')
    const filePath = decodeURIComponent(url)
    callback({ path: filePath })
  })
}

const createWindow = () => {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.handle('pick-folders', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections'],
  })

  if (result.canceled) {
    return { folders: [], items: [] }
  }

  const folders = result.filePaths
  const items = (
    await Promise.all(
      folders.map(async (folder) => {
        return scanFolder(folder)
      }),
    )
  ).flat()

  return { folders, items }
})

ipcMain.handle('move-to-trash', async (_event, paths: string[]) => {
  const trashed: string[] = []
  const failed: string[] = []

  for (const filePath of paths) {
    try {
      await shell.trashItem(filePath)
      trashed.push(filePath)
    } catch {
      failed.push(filePath)
    }
  }

  return { trashed, failed }
})

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

app.whenReady().then(() => {
  registerMediaProtocol()
  createWindow()
})
