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
  hash?: string
  dHash?: string
}

type Decision = 'keep' | 'delete'

type Filters = {
  range: 'all' | 'year' | 'month'
  type: 'all' | 'images' | 'videos' | 'screenshots'
  size: 'all' | 'small' | 'medium' | 'large'
  flagged: 'all' | 'flagged'
}

type SortMode = 'date-desc' | 'date-asc' | 'name-asc' | 'size-desc'

type GroupMode = 'none' | 'folder'

type LayoutMode = 'grid' | 'list'

type TabMode = 'all' | 'duplicates' | 'similar'

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

const hammingDistance = (a: string, b: string) => {
  const maxLen = Math.max(a.length, b.length)
  const aBits = BigInt(`0x${a.padStart(maxLen, '0')}`)
  const bBits = BigInt(`0x${b.padStart(maxLen, '0')}`)
  let x = aBits ^ bBits
  let count = 0
  while (x > 0n) {
    count += Number(x & 1n)
    x >>= 1n
  }
  return count
}

function App() {
  const [folders, setFolders] = useState<string[]>([])
  const [items, setItems] = useState<MediaItem[]>([])
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [activeIndex, setActiveIndex] = useState(0)
  const [trashed, setTrashed] = useState<MediaItem[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('date-desc')
  const [groupMode, setGroupMode] = useState<GroupMode>('none')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [tabMode, setTabMode] = useState<TabMode>('all')

  const duplicateHashes = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((item) => {
      if (item.hash) {
        counts.set(item.hash, (counts.get(item.hash) ?? 0) + 1)
      }
    })
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([hash]) => hash))
  }, [items])

  const duplicateItems = useMemo(
    () => items.filter((item) => (item.hash ? duplicateHashes.has(item.hash) : false)),
    [items, duplicateHashes],
  )

  const similarGroups = useMemo(() => {
    const imageItems = items.filter((item) => item.dHash)
    const buckets = new Map<string, MediaItem[]>()
    imageItems.forEach((item) => {
      const key = item.dHash?.slice(0, 4) ?? 'misc'
      const group = buckets.get(key) ?? []
      group.push(item)
      buckets.set(key, group)
    })
    const groups: Array<{ base: MediaItem; matches: Array<{ item: MediaItem; score: number }> }> = []
    const threshold = 10
    buckets.forEach((bucket) => {
      for (let i = 0; i < bucket.length; i += 1) {
        const base = bucket[i]
        if (!base.dHash) continue
        const matches: Array<{ item: MediaItem; score: number }> = []
        for (let j = i + 1; j < bucket.length; j += 1) {
          const candidate = bucket[j]
          if (!candidate.dHash) continue
          const distance = hammingDistance(base.dHash, candidate.dHash)
          if (distance <= threshold) {
            const score = Math.round((1 - distance / 64) * 100)
            matches.push({ item: candidate, score })
          }
        }
        if (matches.length > 0) {
          groups.push({ base, matches })
        }
      }
    })
    return groups.sort((a, b) => b.matches.length - a.matches.length)
  }, [items])

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
      .filter((item) =>
        filters.flagged === 'flagged'
          ? Boolean(item.autoFlag) ||
            (item.hash ? duplicateHashes.has(item.hash) : false) ||
            Boolean(item.dHash)
          : true,
      )
  }, [items, filters, duplicateHashes])

  const sortedItems = useMemo(() => {
    const list = [...filteredItems]
    list.sort((a, b) => {
      const aDuplicate = a.hash ? duplicateHashes.has(a.hash) : false
      const bDuplicate = b.hash ? duplicateHashes.has(b.hash) : false

      if (aDuplicate !== bDuplicate) {
        return aDuplicate ? -1 : 1
      }

      switch (sortMode) {
        case 'date-asc':
          return a.modifiedAt - b.modifiedAt
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'size-desc':
          return b.size - a.size
        case 'date-desc':
        default:
          return b.modifiedAt - a.modifiedAt
      }
    })
    return list
  }, [filteredItems, sortMode, duplicateHashes])

  const groupedItems = useMemo(() => {
    if (groupMode === 'folder') {
      const map = new Map<string, MediaItem[]>()
      sortedItems.forEach((item) => {
        const group = map.get(item.folder) ?? []
        group.push(item)
        map.set(item.folder, group)
      })
      return Array.from(map.entries()).map(([title, list]) => ({ title, items: list }))
    }
    return [{ title: 'Alle Medien', items: sortedItems }]
  }, [sortedItems, groupMode])

  const visibleItems = useMemo(() => {
    if (tabMode === 'duplicates') {
      return duplicateItems
    }
    return sortedItems
  }, [tabMode, duplicateItems, sortedItems])

  useEffect(() => {
    if (activeIndex >= visibleItems.length) {
      setActiveIndex(0)
    }
  }, [visibleItems, activeIndex])

  const activeItem = visibleItems[activeIndex]

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
        setActiveIndex((prev) => Math.min(prev + 1, visibleItems.length - 1))
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeItem, visibleItems.length])

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
      return merged
    })
  }

  const toggleDecision = (item: MediaItem, decision: Decision) => {
    setDecisions((prev) => ({ ...prev, [item.path]: decision }))
  }

  const keepCount = Object.values(decisions).filter((value) => value === 'keep').length
  const deleteCount = Object.values(decisions).filter((value) => value === 'delete').length
  const flaggedCount = items.filter(
    (item) =>
      item.autoFlag ||
      (item.hash ? duplicateHashes.has(item.hash) : false) ||
      Boolean(item.dHash),
  ).length

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
    setShowDeleteModal(false)
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
              <select
                value={filters.range}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, range: event.target.value as Filters['range'] }))
                }
              >
                <option value="year">Letzte 12 Monate</option>
                <option value="month">Letzte 30 Tage</option>
                <option value="all">Alle</option>
              </select>
            </label>
            <label>
              Dateityp
              <select
                value={filters.type}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, type: event.target.value as Filters['type'] }))
                }
              >
                <option value="all">Alle Medien</option>
                <option value="images">Fotos</option>
                <option value="videos">Videos</option>
                <option value="screenshots">Screenshots</option>
              </select>
            </label>
            <label>
              Dateigröße
              <select
                value={filters.size}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, size: event.target.value as Filters['size'] }))
                }
              >
                <option value="all">Alle Größen</option>
                <option value="small">&lt; 1 MB</option>
                <option value="medium">1 - 10 MB</option>
                <option value="large">&gt; 10 MB</option>
              </select>
            </label>
            <label>
              Automatische Hinweise
              <select
                value={filters.flagged}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, flagged: event.target.value as Filters['flagged'] }))
                }
              >
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
            <button className="primary" onClick={() => setShowDeleteModal(true)}>
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

        <section className="review-mode">
          <div className="panel">
            <div className="panel-header">
              <h2>Review-Modus</h2>
              <span>{activeItem ? `Bild ${activeIndex + 1} von ${visibleItems.length}` : 'Keine Auswahl'}</span>
            </div>
            {activeItem ? (
              <div className="review-content">
                <div className="review-preview">
                  {activeItem.type === 'image' ? (
                    <button
                      type="button"
                      className="preview-button"
                      onClick={() => setShowPreviewModal(true)}
                    >
                      <img src={activeItem.fileUrl} alt={activeItem.name} loading="lazy" decoding="async" />
                    </button>
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

        <section className="media-grid">
          <div className="media-grid-header">
            <h2>Chronologische Vorschau</h2>
            <div className="tab-controls">
              <button className={`tab-button ${tabMode === 'all' ? 'active' : ''}`} onClick={() => setTabMode('all')}>
                Alle Medien
              </button>
              <button
                className={`tab-button ${tabMode === 'duplicates' ? 'active' : ''}`}
                onClick={() => setTabMode('duplicates')}
              >
                Duplikate ({duplicateItems.length})
              </button>
              <button
                className={`tab-button ${tabMode === 'similar' ? 'active' : ''}`}
                onClick={() => setTabMode('similar')}
              >
                Ähnliche ({similarGroups.length})
              </button>
            </div>
            {tabMode === 'all' ? (
              <div className="grid-controls">
                <label className="control">
                  Sortierung
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                    <option value="date-desc">Datum (neu zuerst)</option>
                    <option value="date-asc">Datum (alt zuerst)</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="size-desc">Größe (groß zuerst)</option>
                  </select>
                </label>
                <label className="control">
                  Gruppierung
                  <select value={groupMode} onChange={(event) => setGroupMode(event.target.value as GroupMode)}>
                    <option value="none">Keine</option>
                    <option value="folder">Ordner</option>
                  </select>
                </label>
                <label className="control">
                  Layout
                  <select value={layoutMode} onChange={(event) => setLayoutMode(event.target.value as LayoutMode)}>
                    <option value="grid">Raster</option>
                    <option value="list">Liste</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>
          {tabMode === 'similar' ? (
            <div className="similar-list">
              {similarGroups.length === 0 ? (
                <div className="empty-state">
                  <p>Keine ähnlichen Bilder gefunden.</p>
                </div>
              ) : (
                similarGroups.map((group) => (
                  <div key={group.base.path} className="similar-group">
                    <div className="similar-base">
                      <img src={group.base.fileUrl} alt={group.base.name} loading="lazy" decoding="async" />
                      <div>
                        <h3>{group.base.name}</h3>
                        <p>{formatDate(group.base.modifiedAt)}</p>
                      </div>
                    </div>
                    <div className="similar-matches">
                      {group.matches.map((match) => (
                        <div key={match.item.path} className="similar-card">
                          <img src={match.item.fileUrl} alt={match.item.name} loading="lazy" decoding="async" />
                          <div>
                            <h4>{match.item.name}</h4>
                            <p>Ähnlichkeit: {match.score}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="empty-state">
              <p>Keine Medien gefunden. Wähle einen Ordner aus, um die Vorschau zu starten.</p>
            </div>
          ) : (
            <div className="grouped-grid">
              {(tabMode === 'duplicates' ? [{ title: 'Duplikate', items: duplicateItems }] : groupedItems).map(
                (group) => (
                  <div key={group.title} className="group-section">
                    {groupMode !== 'none' ? <h3>{group.title}</h3> : null}
                    <div className={`grid ${layoutMode}`}>
                      {group.items.map((item) => {
                        const isDuplicate = item.hash ? duplicateHashes.has(item.hash) : false
                        const badgeLabel = isDuplicate ? 'Duplikat' : item.autoFlag

                        return (
                          <article key={item.path} className="media-card">
                            <div className="thumb">
                              {item.type === 'image' ? (
                                <img src={item.fileUrl} alt={item.name} loading="lazy" decoding="async" />
                              ) : (
                                <video src={item.fileUrl} preload="metadata" muted />
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
                                {badgeLabel ? <span className="badge badge-flagged">{badgeLabel}</span> : null}
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
                        )
                      })}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
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
            <button className="primary" onClick={() => setShowDeleteModal(true)}>
              Auswahl prüfen
            </button>
          </div>
        </footer>
      </div>

      {showDeleteModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Lösch-Auswahl prüfen</h2>
                <p>{deleteCandidates.length} Dateien · {formatBytes(deleteSize)} insgesamt</p>
              </div>
              <button className="ghost" onClick={() => setShowDeleteModal(false)}>
                Schließen
              </button>
            </div>
            {deleteCandidates.length === 0 ? (
              <p className="empty-state">Es sind aktuell keine Dateien zum Löschen markiert.</p>
            ) : (
              <div className="modal-grid">
                {deleteCandidates.map((item) => (
                  <div key={item.path} className="modal-card">
                    <div className="modal-thumb">
                      {item.type === 'image' ? (
                        <img src={item.fileUrl} alt={item.name} />
                      ) : (
                        <video src={item.fileUrl} preload="metadata" muted />
                      )}
                    </div>
                    <div>
                      <h4>{item.name}</h4>
                      <p>{formatDate(item.modifiedAt)}</p>
                      <span>{formatBytes(item.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="ghost" onClick={() => setShowDeleteModal(false)}>
                Abbrechen
              </button>
              <button className="primary" disabled={deleteCandidates.length === 0} onClick={handleMoveToTrash}>
                Auswahl löschen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPreviewModal && activeItem?.type === 'image' ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal preview-modal">
            <div className="modal-header">
              <div>
                <h2>{activeItem.name}</h2>
                <p>Vollansicht</p>
              </div>
              <button className="ghost" onClick={() => setShowPreviewModal(false)}>
                Schließen
              </button>
            </div>
            <div className="preview-content">
              <img src={activeItem.fileUrl} alt={activeItem.name} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
