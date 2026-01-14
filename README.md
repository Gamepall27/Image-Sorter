
Image Sorter is a cross-platform desktop app (Electron) that lets you review and sort locally stored images and videos offline. The app only accesses folders you explicitly select. No files are modified until you confirm the delete action.

<img width="2559" height="1439" alt="image" src="https://github.com/user-attachments/assets/badb1bda-b09a-4b1f-b39b-409a9e1fb547" />

## Features

- **Folder selection & import**: Choose one or more folders and load media into the overview.
- **Chronological view**: Media is shown by date and can be filtered.
- **Review and compare mode**: Quickly go through individual media and compare similar files.
- **Mark (Keep/Delete)**: Mark files as keep or delete with just a few clicks.
- **Similar & duplicate media**: Similar images are grouped; duplicates are shown separately.
- **Safe deletion**: Files are moved to the trash/recycle bin first and can be restored.
- **Offline & local**: All decisions are saved locally and can be resumed later.

## Installation (Release)

Download the installer for your operating system from the Releases page and install the app:

- **Windows**: NSIS installer **or** portable EXE (both included in the release assets)
- **macOS**: `.dmg` installer
- **Linux**: `.AppImage`

> Note: File names may vary depending on the release version and platform.

## Installation (Build locally)

Requirements:
- Node.js (recommended: latest LTS version)
- npm

Steps:

```bash
npm install
npm run build
