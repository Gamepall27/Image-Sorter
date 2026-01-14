import { app, BrowserWindow, dialog, ipcMain, protocol, shell, nativeImage } from 'electron'
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

const computeDHash = async (filePath: string) => {
  try {
    const image = nativeImage.createFromPath(filePath).resize({ width: 9, height: 8 })
    if (image.isEmpty()) return undefined
    const bitmap = image.toBitmap()
    const pixels: number[] = []
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const idx = (y * 9 + x) * 4
        const r = bitmap[idx]
        const g = bitmap[idx + 1]
        const b = bitmap[idx + 2]
        pixels.push(Math.round(r * 0.299 + g * 0.587 + b * 0.114))
      }
    }
    let bits = ''
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const left = pixels[y * 9 + x]
        const right = pixels[y * 9 + x + 1]
        bits += left > right ? '1' : '0'
      }
    }
    return parseInt(bits, 2).toString(16).padStart(16, '0')
  } catch {
    return undefined
  }
}

type MediaItem = {
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
  dHash?: string
}

const collectMediaFiles = async (folder: string, root: string): Promise<Array<{ path: string; folder: string }>> => {
  const results: Array<{ path: string; folder: string }> = []
  const entries = await fs.readdir(folder, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(folder, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await collectMediaFiles(entryPath, root)))
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!imageExtensions.has(ext) && !videoExtensions.has(ext)) continue
    results.push({ path: entryPath, folder: root })
  }
  return results
}

const buildMediaItem = async (entryPath: string, folder: string): Promise<MediaItem | null> => {
  const ext = path.extname(entryPath).toLowerCase()
  const isImage = imageExtensions.has(ext)
  const isVideo = videoExtensions.has(ext)

  if (!isImage && !isVideo) return null

  const stats = await fs.stat(entryPath)
  const autoFlag = entryPath.toLowerCase().includes('screenshot')
    ? 'Screenshot'
    : stats.size < 200 * 1024
      ? 'Sehr klein'
      : undefined

  const hash = isImage ? await hashFile(entryPath) : undefined
  const dHash = isImage ? await computeDHash(entryPath) : undefined

  return {
    id: path.basename(entryPath),
    name: path.basename(entryPath),
    path: entryPath,
    fileUrl: `media://${encodeURIComponent(entryPath)}`,
    size: stats.size,
    modifiedAt: stats.mtimeMs,
    type: isImage ? 'image' : 'video',
    folder,
    autoFlag,
    hash,
    dHash,
  }
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

ipcMain.handle('pick-folders', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections'],
  })

  if (result.canceled) {
    return { folders: [], items: [] }
  }

  const folders = result.filePaths
  const fileEntries = (
    await Promise.all(
      folders.map(async (folder) => {
        return collectMediaFiles(folder, folder)
      }),
    )
  ).flat()
  const total = fileEntries.length
  let loaded = 0
  const items: MediaItem[] = []

  if (total === 0) {
    event.sender.send('scan-progress', { loaded: 0, total: 0 })
    return { folders, items }
  }

  event.sender.send('scan-progress', { loaded: 0, total })

  let index = 0
  const concurrency = Math.min(4, total)
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < fileEntries.length) {
      const current = fileEntries[index]
      index += 1
      const built = await buildMediaItem(current.path, current.folder)
      if (built) {
        items.push(built)
      }
      loaded += 1
      event.sender.send('scan-progress', { loaded, total })
    }
  })

  await Promise.all(workers)

  return { folders, items }
})

ipcMain.handle('move-to-trash', async (event, paths: string[]) => {
  const trashed: string[] = []
  const failed: string[] = []
  const total = paths.length
  let processed = 0

  if (total === 0) {
    event.sender.send('trash-progress', { processed: 0, total: 0 })
    return { trashed, failed }
  }

  event.sender.send('trash-progress', { processed, total })

  for (const filePath of paths) {
    try {
      await shell.trashItem(filePath)
      trashed.push(filePath)
    } catch {
      failed.push(filePath)
    }
    processed += 1
    event.sender.send('trash-progress', { processed, total })
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
