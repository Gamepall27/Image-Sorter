/// <reference types="vite/client" />

type MediaType = 'image' | 'video'

type MediaItem = {
  id: string
  name: string
  path: string
  fileUrl: string
  size: number
  modifiedAt: number
  type: MediaType
  folder: string
  autoFlag?: string
  hash?: string
  dHash?: string
}

type MediaPickResult = {
  folders: string[]
  items: MediaItem[]
}

type TrashResult = {
  trashed: string[]
  failed: string[]
}

declare global {
  interface Window {
    mediaApi?: {
      pickFolders: () => Promise<MediaPickResult>
      moveToTrash: (paths: string[]) => Promise<TrashResult>
    }
  }
}
