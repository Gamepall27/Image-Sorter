import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'image-sorter-state'

type ReviewStatus = 'keep' | 'delete' | 'review'

type MediaFlags = {
  isScreenshot: boolean
  isSmall: boolean
  isShortVideo: boolean
}

type MediaItemWithMeta = MediaItem & {
  flags: MediaFlags
}

type StoredState = {
  folders: string[]
  statuses: Record<string, ReviewStatus>
  trashed: string[]
}

const DATE_FILTERS = [
  { value: 'all', label: 'Alle Zeiten' },
  { value: 'last30', label: 'Letzte 30 Tage' },
  { value: 'last12', label: 'Letzte 12 Monate' },
]

const TYPE_FILTERS = [
  { value: 'all', label: 'Alle Medien' },
  { value: 'image', label: 'Fotos' },
  { value: 'video', label: 'Videos' },
  { value: 'screenshot', label: 'Screenshots' },
]

const SIZE_FILTERS = [
  { value: 'all', label: 'Alle Größen' },
  { value: 'small', label: '< 1 MB' },
  { value: 'medium', label: '1 - 10 MB' },
  { value: 'large', label: '> 10 MB' },
]

const FLAG_FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'auto', label: 'Automatisch markiert' },
  { value: 'small', label: 'Sehr klein' },
  { value: 'short', label: 'Kurzvideo' },
  { value: 'screenshot', label: 'Screenshot' },
]

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const computeFlags = (item: MediaItem): MediaFlags => {
  const lowercaseName = item.name.toLowerCase()
  const isScreenshot = lowercaseName.includes('screenshot') || lowercaseName.includes('screen')
  const isSmall = item.sizeBytes < 200 * 1024
  const isShortVideo = item.type === 'video' && item.sizeBytes < 2 * 1024 * 1024

  return { isScreenshot, isSmall, isShortVideo }
}

const getBadge = (item: MediaItemWithMeta) => {
  if (item.flags.isScreenshot) {
    return 'Screenshot'
  }
  if (item.flags.isShortVideo) {
    return 'Kurzvideo'
  }
  if (item.flags.isSmall) {
    return 'Sehr klein'
  }
  return 'OK'
}

const loadState = (): StoredState => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { folders: [], statuses: {}, trashed: [] }
  }

  try {
    const parsed = JSON.parse(stored) as StoredState
    return {
      folders: parsed.folders ?? [],
      statuses: parsed.statuses ?? {},
      trashed: parsed.trashed ?? [],
    }
  } catch {
    return { folders: [], statuses: {}, trashed: [] }
  }
}

function App() {
  const [folders, setFolders] = useState<string[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItemWithMeta[]>([])
  const [statuses, setStatuses] = useState<Record<string, ReviewStatus>>({})
  const [trashed, setTrashed] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [flagFilter, setFlagFilter] = useState('all')
  const [errorMessage, setErrorMessage] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    const stored = loadState()
    setFolders(stored.folders)
    setStatuses(stored.statuses)
    setTrashed(stored.trashed)
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ folders, statuses, trashed } satisfies StoredState),
    )
  }, [folders, statuses, trashed])

  const refreshMedia = useCallback(
    async (foldersToScan: string[]) => {
      if (!window.mediaAPI) {
        setErrorMessage('Die Medien-API ist nicht verfügbar. Bitte im Desktop-Modus starten.')
        return
      }

      setIsScanning(true)
      setErrorMessage('')
      try {
        const scanned = await window.mediaAPI.scanFolders(foldersToScan)
        const enriched = scanned.map((item) => ({
          ...item,
          flags: computeFlags(item),
        }))
        const unique = new Map(enriched.map((item) => [item.path, item]))
        setMediaItems(Array.from(unique.values()).sort((a, b) => b.modifiedAt - a.modifiedAt))
      } catch (error) {
        setErrorMessage(`Fehler beim Einlesen: ${(error as Error).message}`)
      } finally {
        setIsScanning(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (folders.length > 0) {
      void refreshMedia(folders)
    }
  }, [folders, refreshMedia])

  const handleAddFolders = async () => {
    if (!window.mediaAPI) {
      setErrorMessage('Die Medien-API ist nicht verfügbar. Bitte im Desktop-Modus starten.')
      return
    }

    const selected = await window.mediaAPI.selectFolders()
    if (selected.length === 0) {
      return
    }

    const nextFolders = Array.from(new Set([...folders, ...selected]))
    setFolders(nextFolders)
    await refreshMedia(nextFolders)
  }

  const filteredItems = useMemo(() => {
    const now = Date.now()
    const cutoff30 = now - 30 * 24 * 60 * 60 * 1000
    const cutoff12 = now - 365 * 24 * 60 * 60 * 1000

    return mediaItems.filter((item) => {
      if (dateFilter === 'last30' && item.modifiedAt < cutoff30) {
        return false
      }
      if (dateFilter === 'last12' && item.modifiedAt < cutoff12) {
        return false
      }
      if (typeFilter === 'image' && item.type !== 'image') {
        return false
      }
      if (typeFilter === 'video' && item.type !== 'video') {
        return false
      }
      if (typeFilter === 'screenshot' && !item.flags.isScreenshot) {
        return false
      }
      if (sizeFilter === 'small' && item.sizeBytes >= 1024 * 1024) {
        return false
      }
      if (sizeFilter === 'medium' && (item.sizeBytes < 1024 * 1024 || item.sizeBytes > 10 * 1024 * 1024)) {
        return false
      }
      if (sizeFilter === 'large' && item.sizeBytes <= 10 * 1024 * 1024) {
        return false
      }
      if (flagFilter === 'auto' && !(item.flags.isScreenshot || item.flags.isSmall || item.flags.isShortVideo)) {
        return false
      }
      if (flagFilter === 'small' && !item.flags.isSmall) {
        return false
      }
      if (flagFilter === 'short' && !item.flags.isShortVideo) {
        return false
      }
      if (flagFilter === 'screenshot' && !item.flags.isScreenshot) {
        return false
      }
      return true
    })
  }, [dateFilter, flagFilter, mediaItems, sizeFilter, typeFilter])

  const selectedIndex = useMemo(() => {
    if (!selectedId) {
      return 0
    }
    const index = filteredItems.findIndex((item) => item.path === selectedId)
    return index >= 0 ? index : 0
  }, [filteredItems, selectedId])

  const activeItem = filteredItems[selectedIndex] ?? null

  const updateStatus = (itemPath: string, status: ReviewStatus) => {
    setStatuses((prev) => ({ ...prev, [itemPath]: status }))
  }

  const handleTrash = async () => {
    if (!window.mediaAPI) {
      setErrorMessage('Die Medien-API ist nicht verfügbar. Bitte im Desktop-Modus starten.')
      return
    }

    const toDelete = Object.entries(statuses)
      .filter(([, status]) => status === 'delete')
      .map(([path]) => path)

    if (toDelete.length === 0) {
      setErrorMessage('Keine Dateien zum Löschen markiert.')
      return
    }

    const results = await window.mediaAPI.trashItems(toDelete)
    const failed = results.filter((result) => !result.ok)
    if (failed.length > 0) {
      setErrorMessage(`Einige Dateien konnten nicht verschoben werden (${failed.length}).`)
    }

    const successful = results.filter((result) => result.ok).map((result) => result.path)
    if (successful.length > 0) {
      setTrashed((prev) => Array.from(new Set([...prev, ...successful])))
      setMediaItems((prev) => prev.filter((item) => !successful.includes(item.path)))
      setStatuses((prev) => {
        const next = { ...prev }
        for (const itemPath of successful) {
          delete next[itemPath]
        }
        return next
      })
      setSelectedId(null)
    }
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!activeItem) {
        return
      }
      if (event.key.toLowerCase() === 'k') {
        updateStatus(activeItem.path, 'keep')
      }
      if (event.key.toLowerCase() === 'l') {
        updateStatus(activeItem.path, 'delete')
      }
      if (event.key === 'ArrowRight') {
        setSelectedId(filteredItems[Math.min(selectedIndex + 1, filteredItems.length - 1)]?.path ?? null)
      }
      if (event.key === 'ArrowLeft') {
        setSelectedId(filteredItems[Math.max(selectedIndex - 1, 0)]?.path ?? null)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeItem, filteredItems, selectedIndex])

  const keepCount = Object.values(statuses).filter((status) => status === 'keep').length
  const deleteCount = Object.values(statuses).filter((status) => status === 'delete').length
  const autoFlaggedCount = mediaItems.filter(
    (item) => item.flags.isScreenshot || item.flags.isSmall || item.flags.isShortVideo,
  ).length
  const deleteSize = mediaItems
    .filter((item) => statuses[item.path] === 'delete')
    .reduce((sum, item) => sum + item.sizeBytes, 0)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">IS</div>
          <div>
            <p className="brand-title">Image Sorter</p>
            <p className="brand-subtitle">Offline Media Review</p>
          </div>
        </div>

        <div className="section">
          <p className="section-title">Ordner</p>
          <button className="primary" onClick={handleAddFolders} disabled={isScanning}>
            {isScanning ? 'Lade Medien…' : 'Ordner hinzufügen'}
          </button>
          {folders.length === 0 ? (
            <p className="muted">Noch keine Ordner ausgewählt.</p>
          ) : (
            <ul className="folder-list">
              {folders.map((folder) => (
                <li key={folder}>{folder}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="section">
          <p className="section-title">Filter</p>
          <div className="filter-group">
            <label>
              Zeitraum
              <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                {DATE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dateityp
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {TYPE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dateigröße
              <select value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)}>
                {SIZE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Automatische Hinweise
              <select value={flagFilter} onChange={(event) => setFlagFilter(event.target.value)}>
                {FLAG_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="section stats">
          <p className="section-title">Statistiken</p>
          <div className="stat">
            <span>Medien gesamt</span>
            <strong>{mediaItems.length}</strong>
          </div>
          <div className="stat">
            <span>Markiert behalten</span>
            <strong>{keepCount}</strong>
          </div>
          <div className="stat">
            <span>Markiert löschen</span>
            <strong>{deleteCount}</strong>
          </div>
          <div className="stat">
            <span>Pot. unnötig</span>
            <strong>{autoFlaggedCount}</strong>
          </div>
        </div>

        {errorMessage ? <p className="error">{errorMessage}</p> : null}
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <h1>Medienübersicht</h1>
            <p>Chronologische Ansicht · Offline · Keine Dateien verändert</p>
          </div>
          <div className="actions">
            <button className="ghost">Review-Modus</button>
            <button className="ghost">Vergleichsmodus</button>
            <button className="primary" onClick={handleTrash}>
              Ausgewählte löschen
            </button>
          </div>
        </header>

        <section className="overview">
          <div className="overview-card">
            <p>Automatisch markiert</p>
            <h3>Sehr kleine oder kurze Medien</h3>
            <span>Heuristik basiert auf Dateigröße und Dateinamen.</span>
          </div>
          <div className="overview-card highlight">
            <p>Papierkorb</p>
            <h3>{trashed.length} Dateien im Papierkorb</h3>
            <span>Gelöschte Dateien bleiben wiederherstellbar.</span>
          </div>
          <div className="overview-card">
            <p>Freigabe-Schätzung</p>
            <h3>{formatBytes(deleteSize)} möglich</h3>
            <span>Basierend auf der aktuellen Lösch-Markierung.</span>
          </div>
        </section>

        <section className="media-grid">
          <div className="media-grid-header">
            <h2>Chronologische Vorschau</h2>
            <div className="grid-controls">
              <button className="ghost">Sortierung: Datum</button>
              <button className="ghost" disabled>
                Gruppieren: Ähnlichkeit (bald)
              </button>
              <button className="ghost">Layout: Raster</button>
            </div>
          </div>
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <h3>Keine Medien gefunden</h3>
              <p>Bitte Ordner hinzufügen oder Filter anpassen.</p>
            </div>
          ) : (
            <div className="grid">
              {filteredItems.map((item) => {
                const status = statuses[item.path] ?? 'review'
                return (
                  <article
                    key={item.path}
                    className={`media-card ${selectedId === item.path ? 'selected' : ''}`}
                    onClick={() => setSelectedId(item.path)}
                  >
                    <div className="thumb">
                      <span className="thumb-type">{item.type === 'image' ? 'Foto' : 'Video'}</span>
                    </div>
                    <div className="media-info">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{formatDate(item.modifiedAt)}</p>
                      </div>
                      <div className="meta">
                        <span>{formatBytes(item.sizeBytes)}</span>
                        <span className={`badge badge-${getBadge(item).toLowerCase().replace(/\s/g, '-')}`}>
                          {getBadge(item)}
                        </span>
                      </div>
                    </div>
                    <div className="media-actions">
                      <button
                        className="keep"
                        onClick={(event) => {
                          event.stopPropagation()
                          updateStatus(item.path, 'keep')
                        }}
                      >
                        Behalten
                      </button>
                      <button
                        className="discard"
                        onClick={(event) => {
                          event.stopPropagation()
                          updateStatus(item.path, 'delete')
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                    <span className={`status status-${status}`}>{status === 'review' ? 'Prüfen' : status === 'keep' ? 'Behalten' : 'Löschen'}</span>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="review-mode">
          <div className="panel">
            <div className="panel-header">
              <h2>Review-Modus</h2>
              <span>
                {filteredItems.length === 0
                  ? 'Keine Auswahl'
                  : `Datei ${selectedIndex + 1} von ${filteredItems.length}`}
              </span>
            </div>
            {activeItem ? (
              <div className="review-content">
                <div className="review-preview">Vorschau</div>
                <div className="review-details">
                  <h3>{activeItem.name}</h3>
                  <ul>
                    <li>Aufnahme: {formatDate(activeItem.modifiedAt)}</li>
                    <li>
                      Größe: {formatBytes(activeItem.sizeBytes)} · Typ:{' '}
                      {activeItem.type === 'image' ? 'Foto' : 'Video'}
                    </li>
                    <li>
                      Hinweise:{' '}
                      {activeItem.flags.isScreenshot
                        ? 'Screenshot'
                        : activeItem.flags.isShortVideo
                          ? 'Kurzvideo'
                          : activeItem.flags.isSmall
                            ? 'Sehr klein'
                            : 'Keine Hinweise'}
                    </li>
                    <li>Aktion: {statuses[activeItem.path] ?? 'prüfen'}</li>
                  </ul>
                  <div className="shortcut-list">
                    <div>
                      <kbd>K</kbd> behalten
                    </div>
                    <div>
                      <kbd>L</kbd> löschen
                    </div>
                    <div>
                      <kbd>→</kbd> nächstes
                    </div>
                    <div>
                      <kbd>←</kbd> zurück
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>Wähle eine Datei aus der Übersicht.</p>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Vergleichsmodus</h2>
              <span>Ähnlichkeitserkennung folgt später</span>
            </div>
            <div className="empty-state">
              <p>
                Aktuell ist die Ähnlichkeitserkennung deaktiviert. Du kannst dennoch manuell markieren
                und filtern.
              </p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div>
            <h3>Zusammenfassung vor dem Löschen</h3>
            <p>
              {deleteCount} Dateien markiert · {formatBytes(deleteSize)} Speicherfreigabe · {trashed.length}{' '}
              Dateien im Papierkorb
            </p>
          </div>
          <div className="actions">
            <button className="ghost">Zusammenfassung anzeigen</button>
            <button className="primary" onClick={handleTrash}>
              In Papierkorb verschieben
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
