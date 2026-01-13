import './App.css'

const mediaItems = [
  {
    id: 'IMG_3921',
    name: 'IMG_3921.jpg',
    type: 'Foto',
    date: '21.07.2024 · 14:32',
    size: '3.4 MB',
    status: 'Behalten',
    tags: ['Ähnlich (3)', 'Reise'],
    hint: 'Gute Schärfe',
  },
  {
    id: 'VID_1044',
    name: 'VID_1044.mp4',
    type: 'Video',
    date: '21.07.2024 · 14:35',
    size: '42.7 MB',
    status: 'Prüfen',
    tags: ['Kurzvideo', 'Stabil'],
    hint: '4 Sek. Clip',
  },
  {
    id: 'IMG_3922',
    name: 'IMG_3922.jpg',
    type: 'Foto',
    date: '21.07.2024 · 14:36',
    size: '3.1 MB',
    status: 'Löschen',
    tags: ['Doppelt', 'Unscharf'],
    hint: 'Unscharf erkannt',
  },
  {
    id: 'SCR_2024',
    name: 'Screenshot_2024-07-21.png',
    type: 'Screenshot',
    date: '21.07.2024 · 15:02',
    size: '1.1 MB',
    status: 'Prüfen',
    tags: ['Screenshot', 'UI'],
    hint: 'Als Screenshot erkannt',
  },
  {
    id: 'IMG_3923',
    name: 'IMG_3923.jpg',
    type: 'Foto',
    date: '22.07.2024 · 09:18',
    size: '2.9 MB',
    status: 'Behalten',
    tags: ['Serie'],
    hint: 'Hohe Qualität',
  },
  {
    id: 'VID_1048',
    name: 'VID_1048.mov',
    type: 'Video',
    date: '22.07.2024 · 09:21',
    size: '124 MB',
    status: 'Prüfen',
    tags: ['Ähnlich (2)', 'Lang'],
    hint: 'Ungewöhnlich groß',
  },
]

const comparisonSet = [
  {
    id: 'A',
    label: 'Variante A',
    detail: 'Schärfer, bessere Farben',
  },
  {
    id: 'B',
    label: 'Variante B',
    detail: 'Leicht verwackelt',
  },
  {
    id: 'C',
    label: 'Variante C',
    detail: 'Zu dunkel',
  },
]

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Image Sorter • Offline Medien-Review</p>
          <h1>Medien schnell sichten, vergleichen und sortieren</h1>
          <p className="subtitle">
            Arbeitet vollständig offline. Zugriff nur auf ausgewählte Ordner. Dateien werden nicht verändert,
            bis du sie bestätigst.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="primary">Ordner auswählen</button>
          <button className="ghost">Letzte Sitzung fortsetzen</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <section>
            <h2>Filter &amp; Suche</h2>
            <div className="filter-group">
              <label>
                Zeitraum
                <div className="chip-row">
                  <button className="chip active">Letzte 30 Tage</button>
                  <button className="chip">2024</button>
                  <button className="chip">Benutzerdefiniert</button>
                </div>
              </label>
              <label>
                Dateityp
                <div className="chip-row">
                  <button className="chip active">Fotos</button>
                  <button className="chip">Videos</button>
                  <button className="chip">Screenshots</button>
                </div>
              </label>
              <label>
                Dateigröße
                <div className="chip-row">
                  <button className="chip">&lt; 2 MB</button>
                  <button className="chip">2–50 MB</button>
                  <button className="chip">&gt; 50 MB</button>
                </div>
              </label>
              <label>
                Ähnlich / Doppelt
                <div className="chip-row">
                  <button className="chip">Doppelte anzeigen</button>
                  <button className="chip active">Sehr ähnlich</button>
                </div>
              </label>
            </div>
          </section>

          <section>
            <h2>Auto-Markierungen</h2>
            <ul className="checklist">
              <li>✅ Screenshots erkannt</li>
              <li>✅ Sehr kurze Videos</li>
              <li>✅ Extrem kleine Dateien</li>
              <li>✅ Unscharfe Bilder</li>
            </ul>
          </section>

          <section>
            <h2>Statistiken</h2>
            <div className="stats">
              <div>
                <p className="stat-value">1.248</p>
                <p className="stat-label">Medien gefunden</p>
              </div>
              <div>
                <p className="stat-value">186</p>
                <p className="stat-label">Zum Löschen markiert</p>
              </div>
              <div>
                <p className="stat-value">32.4 GB</p>
                <p className="stat-label">Potentiell frei</p>
              </div>
            </div>
          </section>

          <section>
            <h2>Tastaturkürzel</h2>
            <ul className="shortcuts">
              <li>
                <span>Behalten</span>
                <kbd>K</kbd>
              </li>
              <li>
                <span>Löschen</span>
                <kbd>D</kbd>
              </li>
              <li>
                <span>Nächstes Medium</span>
                <kbd>→</kbd>
              </li>
              <li>
                <span>Vergleichsmodus</span>
                <kbd>C</kbd>
              </li>
            </ul>
          </section>
        </aside>

        <main className="content">
          <section className="toolbar">
            <div>
              <h2>Chronologische Übersicht</h2>
              <p>Sortiert nach Datum • 3 Ordner aktiv</p>
            </div>
            <div className="toolbar-actions">
              <button className="ghost">Review-Modus</button>
              <button className="ghost">Vergleichsmodus</button>
              <button className="primary">Papierkorb prüfen</button>
            </div>
          </section>

          <section className="grid">
            {mediaItems.map((item) => (
              <article key={item.id} className="card">
                <div className="thumbnail">
                  <span>{item.type}</span>
                </div>
                <div className="card-body">
                  <div>
                    <h3>{item.name}</h3>
                    <p className="meta">
                      {item.date} • {item.size}
                    </p>
                  </div>
                  <div className="status-row">
                    <span className={`status ${item.status.toLowerCase()}`}>{item.status}</span>
                    <div className="tag-row">
                      {item.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="hint">{item.hint}</p>
                  <div className="card-actions">
                    <button className="keep">Behalten</button>
                    <button className="discard">Löschen</button>
                    <button className="ghost">Details</button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="review">
            <div className="review-header">
              <div>
                <h2>Review-Modus</h2>
                <p>Gehe Bild für Bild durch und markiere schnell.</p>
              </div>
              <div className="review-actions">
                <button className="keep">Behalten</button>
                <button className="discard">Löschen</button>
                <button className="ghost">Überspringen</button>
              </div>
            </div>
            <div className="review-panel">
              <div className="review-preview">Vorschau</div>
              <div className="review-info">
                <h3>IMG_3922.jpg</h3>
                <p>
                  Automatisch markiert als <strong>unscharf</strong>. Erstellt am 21.07.2024, 14:36.
                </p>
                <div className="review-metrics">
                  <div>
                    <p className="metric">5.2 MP</p>
                    <p className="metric-label">Auflösung</p>
                  </div>
                  <div>
                    <p className="metric">1/3 ähnlich</p>
                    <p className="metric-label">Vergleichsgruppe</p>
                  </div>
                  <div>
                    <p className="metric">Lokal</p>
                    <p className="metric-label">Speicherort</p>
                  </div>
                </div>
                <div className="review-footer">
                  <span className="soft-warning">Wird in Papierkorb verschoben</span>
                  <button className="ghost">Zur Gruppe</button>
                </div>
              </div>
            </div>
          </section>

          <section className="comparison">
            <div className="comparison-header">
              <div>
                <h2>Vergleichsmodus</h2>
                <p>Ähnliche Aufnahmen nebeneinander bewerten.</p>
              </div>
              <div className="comparison-actions">
                <button className="ghost">Alle behalten</button>
                <button className="discard">Schwächste löschen</button>
              </div>
            </div>
            <div className="comparison-grid">
              {comparisonSet.map((item) => (
                <article key={item.id} className="comparison-card">
                  <div className="comparison-thumb">{item.label}</div>
                  <div>
                    <h3>{item.label}</h3>
                    <p className="meta">{item.detail}</p>
                    <div className="card-actions">
                      <button className="keep">Behalten</button>
                      <button className="discard">Löschen</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="summary">
            <div>
              <h2>Zusammenfassung vor dem Löschen</h2>
              <p>
                Markierte Dateien werden zuerst in den Papierkorb verschoben. Du kannst sie jederzeit
                wiederherstellen.
              </p>
            </div>
            <div className="summary-box">
              <div>
                <p className="stat-value">186 Dateien</p>
                <p className="stat-label">werden gelöscht</p>
              </div>
              <div>
                <p className="stat-value">32.4 GB</p>
                <p className="stat-label">werden freigegeben</p>
              </div>
              <button className="primary">Löschen bestätigen</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
