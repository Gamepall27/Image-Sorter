import { useEffect, useMemo, useState } from 'react'
import './App.css'

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
}

type Decision = 'keep' | 'delete'

type Filters = {
  range: 'all' | 'year' | 'month'
  type: 'all' | 'images' | 'videos' | 'screenshots'
  size: 'all' | 'small' | 'medium' | 'large'
  flagged: 'all' | 'flagged'
}

const STORAGE_KEY = 'image-sorter-decisions'

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
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

const defaultFilters: Filters = {
  range: 'year',
  type: 'all',
  size: 'all',
  flagged: 'all',
}

function App() {
  const [folders, setFolders] = useState<string[]>([])
  const [items, setItems] = useState<MediaItem[]>([])
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [activeIndex, setActiveIndex] = useState(0)
  const [trashed, setTrashed] = useState<MediaItem[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setDecisions(JSON.parse(stored) as Record<string, Decision>)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions))
  }, [decisions])

  const filteredItems = useMemo(() => {
    const now = Date.now()
    const rangeCutoff =
      filters.range === 'month'
        ? now - 1000 * 60 * 60 * 24 * 30
        : filters.range === 'year'
          ? now - 1000 * 60 * 60 * 24 * 365
          : 0

    return items
      .filter((item) => (rangeCutoff ? item.modifiedAt >= rangeCutoff : true))
      .filter((item) => {
        if (filters.type === 'images') return item.type === 'image'
        if (filters.type === 'videos') return item.type === 'video'
        if (filters.type === 'screenshots') return item.autoFlag === 'Screenshot'
        return true
      })
      .filter((item) => {
        if (filters.size === 'small') return item.size < 1024 * 1024
        if (filters.size === 'medium') return item.size >= 1024 * 1024 && item.size <= 10 * 1024 * 1024
        if (filters.size === 'large') return item.size > 10 * 1024 * 1024
        return true
      })
      .filter((item) => (filters.flagged === 'flagged' ? Boolean(item.autoFlag) : true))
  }, [items, filters])

  useEffect(() => {
    if (activeIndex >= filteredItems.length) {
      setActiveIndex(0)
    }
  }, [filteredItems, activeIndex])

  const activeItem = filteredItems[activeIndex]

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeItem) return
      if (event.key.toLowerCase() === 'k') {
        setDecisions((prev) => ({ ...prev, [activeItem.path]: 'keep' }))
      }
      if (event.key.toLowerCase() === 'l') {
        setDecisions((prev) => ({ ...prev, [activeItem.path]: 'delete' }))
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeItem, filteredItems.length])

  const handleAddFolders = async () => {
    if (!window.mediaApi) return
    const result = await window.mediaApi.pickFolders()
    if (!result) return

    setFolders((prev) => Array.from(new Set([...prev, ...result.folders])))
    setItems((prev) => {
      const existing = new Set(prev.map((item) => item.path))
      const merged = [...prev]
      result.items.forEach((item) => {
        if (!existing.has(item.path)) {
          merged.push(item)
        }
      })
      return merged.sort((a, b) => b.modifiedAt - a.modifiedAt)
    })
  }

  const toggleDecision = (item: MediaItem, decision: Decision) => {
    setDecisions((prev) => ({ ...prev, [item.path]: decision }))
  }

  const keepCount = Object.values(decisions).filter((value) => value === 'keep').length
  const deleteCount = Object.values(decisions).filter((value) => value === 'delete').length
  const flaggedCount = items.filter((item) => item.autoFlag).length

  const deleteCandidates = items.filter((item) => decisions[item.path] === 'delete')
  const deleteSize = deleteCandidates.reduce((total, item) => total + item.size, 0)

  const handleMoveToTrash = async () => {
    if (!window.mediaApi || deleteCandidates.length === 0) return
    const result = await window.mediaApi.moveToTrash(deleteCandidates.map((item) => item.path))
    if (!result) return

    setTrashed((prev) => [...prev, ...deleteCandidates.filter((item) => result.trashed.includes(item.path))])
    setItems((prev) => prev.filter((item) => !result.trashed.includes(item.path)))
    setDecisions((prev) => {
      const next = { ...prev }
      result.trashed.forEach((path) => {
        delete next[path]
      })
      return next
    })
  }

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
          <button className="primary" onClick={handleAddFolders}>
            Ordner hinzufügen
          </button>
          <ul className="folder-list">
            {folders.length === 0 ? <li>Keine Ordner ausgewählt</li> : null}
            {folders.map((folder) => (
              <li key={folder}>{folder}</li>
            ))}
          </ul>
        </div>

        <div className="section">
          <p className="section-title">Filter</p>
          <div className="filter-group">
            <label>
              Zeitraum
              <select value={filters.range} onChange={(event) => setFilters((prev) => ({ ...prev, range: event.target.value as Filters['range'] }))}>
                <option value="year">Letzte 12 Monate</option>
                <option value="month">Letzte 30 Tage</option>
                <option value="all">Alle</option>
              </select>
            </label>
            <label>
              Dateityp
              <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value as Filters['type'] }))}>
                <option value="all">Alle Medien</option>
                <option value="images">Fotos</option>
                <option value="videos">Videos</option>
                <option value="screenshots">Screenshots</option>
              </select>
            </label>
            <label>
              Dateigröße
              <select value={filters.size} onChange={(event) => setFilters((prev) => ({ ...prev, size: event.target.value as Filters['size'] }))}>
                <option value="all">Alle Größen</option>
                <option value="small">&lt; 1 MB</option>
                <option value="medium">1 - 10 MB</option>
                <option value="large">&gt; 10 MB</option>
              </select>
            </label>
            <label>
              Automatische Hinweise
              <select value={filters.flagged} onChange={(event) => setFilters((prev) => ({ ...prev, flagged: event.target.value as Filters['flagged'] }))}>
                <option value="all">Alle</option>
                <option value="flagged">Nur markierte Hinweise</option>
              </select>
            </label>
          </div>
        </div>

        <div className="section stats">
          <p className="section-title">Statistiken</p>
          <div className="stat">
            <span>Medien gesamt</span>
            <strong>{items.length}</strong>
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
            <strong>{flaggedCount}</strong>
          </div>
        </div>
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
            <button className="primary" onClick={handleMoveToTrash}>
              Auswahl prüfen
            </button>
          </div>
        </header>

        <section className="overview">
          <div className="overview-card">
            <p>Automatisch markiert</p>
            <h3>Screenshots &amp; sehr kleine Dateien</h3>
            <span>Diese Dateien werden nur vorgeschlagen, nie automatisch gelöscht.</span>
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
              <button className="ghost">Gruppieren: Ordner</button>
              <button className="ghost">Layout: Raster</button>
            </div>
          </div>
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              <p>Keine Medien gefunden. Wähle einen Ordner aus, um die Vorschau zu starten.</p>
            </div>
          ) : (
            <div className="grid">
              {filteredItems.map((item) => (
                <article key={item.path} className="media-card">
                  <div className="thumb">
                    {item.type === 'image' ? (
                      <img src={item.fileUrl} alt={item.name} />
                    ) : (
                      <video src={item.fileUrl} muted />
                    )}
                    <span className="thumb-type">{item.type === 'image' ? 'Foto' : 'Video'}</span>
                  </div>
                  <div className="media-info">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{formatDate(item.modifiedAt)}</p>
                    </div>
                    <div className="meta">
                      <span>{formatBytes(item.size)}</span>
                      {item.autoFlag ? <span className="badge badge-flagged">{item.autoFlag}</span> : null}
                    </div>
                  </div>
                  <div className="media-actions">
                    <button className="keep" onClick={() => toggleDecision(item, 'keep')}>
                      Behalten
                    </button>
                    <button className="discard" onClick={() => toggleDecision(item, 'delete')}>
                      Löschen
                    </button>
                  </div>
                  {decisions[item.path] ? (
                    <span className={`status status-${decisions[item.path]}`}>{decisions[item.path]}</span>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="review-mode">
          <div className="panel">
            <div className="panel-header">
              <h2>Review-Modus</h2>
              <span>
                {activeItem ? `Bild ${activeIndex + 1} von ${filteredItems.length}` : 'Keine Auswahl'}
              </span>
            </div>
            {activeItem ? (
              <div className="review-content">
                <div className="review-preview">
                  {activeItem.type === 'image' ? (
                    <img src={activeItem.fileUrl} alt={activeItem.name} />
                  ) : (
                    <video src={activeItem.fileUrl} controls />
                  )}
                </div>
                <div className="review-details">
                  <h3>{activeItem.name}</h3>
                  <ul>
                    <li>Aufnahme: {formatDate(activeItem.modifiedAt)}</li>
                    <li>Größe: {formatBytes(activeItem.size)}</li>
                    <li>Ordner: {activeItem.folder}</li>
                    <li>Hinweis: {activeItem.autoFlag ?? 'keiner'}</li>
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
              <p className="empty-state">Wähle einen Ordner, um den Review-Modus zu starten.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Vergleichsmodus</h2>
              <span>Ähnlichkeitserkennung folgt</span>
            </div>
            <div className="compare-grid empty">
              <p>Der Vergleichsmodus wird aktiviert, sobald ähnliche Medien erkannt werden.</p>
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
            <button className="primary" onClick={handleMoveToTrash}>
              In Papierkorb verschieben
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
