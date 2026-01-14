/// <reference types="vite/client" />

type MediaItem = {
  id: string
  name: string
  path: string
  extension: string
  type: 'image' | 'video'
  sizeBytes: number
  modifiedAt: number
}

type TrashResult = { path: string; ok: boolean; error?: string }

declare global {
  interface Window {
    mediaAPI?: {
      selectFolders: () => Promise<string[]>
      scanFolders: (folders: string[]) => Promise<MediaItem[]>
      trashItems: (paths: string[]) => Promise<TrashResult[]>
    }
  }
}
