import './App.css'

const mediaItems = [
  {
    id: 'IMG_1241.JPG',
    date: '12. Sep 2023 · 18:42',
    size: '4,2 MB',
    type: 'Foto',
    badge: 'Scharf',
    status: 'Behalten',
  },
  {
    id: 'IMG_1242.JPG',
    date: '12. Sep 2023 · 18:43',
    size: '4,1 MB',
    type: 'Foto',
    badge: 'Sehr ähnlich',
    status: 'Prüfen',
  },
  {
    id: 'VID_5081.MP4',
    date: '13. Sep 2023 · 09:15',
    size: '38 MB',
    type: 'Video (12s)',
    badge: 'Kurzvideo',
    status: 'Löschen',
  },
  {
    id: 'Screenshot_2023-09-14.png',
    date: '14. Sep 2023 · 21:01',
    size: '820 KB',
    type: 'Screenshot',
    badge: 'Screenshot',
    status: 'Prüfen',
  },
  {
    id: 'IMG_1250.JPG',
    date: '15. Sep 2023 · 07:32',
    size: '3,8 MB',
    type: 'Foto',
    badge: 'Unscharf',
    status: 'Prüfen',
  },
  {
    id: 'IMG_1251.JPG',
    date: '15. Sep 2023 · 07:35',
    size: '3,9 MB',
    type: 'Foto',
    badge: 'Doppelt',
    status: 'Löschen',
  },
]

const similarGroup = [
  { name: 'IMG_1242.JPG', note: 'Hauptmotiv scharf' },
  { name: 'IMG_1243.JPG', note: 'leicht verwackelt' },
  { name: 'IMG_1244.JPG', note: 'Gegenlicht' },
]

function App() {
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
          <button className="primary">Ordner hinzufügen</button>
          <ul className="folder-list">
            <li>~/Bilder/Reisen</li>
            <li>~/Videos/2023</li>
            <li>~/Downloads</li>
          </ul>
        </div>

        <div className="section">
          <p className="section-title">Filter</p>
          <div className="filter-group">
            <label>
              Zeitraum
              <select>
                <option>Letzte 12 Monate</option>
                <option>Letzte 30 Tage</option>
                <option>Benutzerdefiniert</option>
              </select>
            </label>
            <label>
              Dateityp
              <select>
                <option>Alle Medien</option>
                <option>Fotos</option>
                <option>Videos</option>
                <option>Screenshots</option>
              </select>
            </label>
            <label>
              Dateigröße
              <select>
                <option>Alle Größen</option>
                <option>&lt; 1 MB</option>
                <option>1 - 10 MB</option>
                <option>&gt; 10 MB</option>
              </select>
            </label>
            <label>
              Ähnlichkeit
              <select>
                <option>Alle</option>
                <option>Sehr ähnlich / Duplikate</option>
                <option>Unscharf / klein</option>
              </select>
            </label>
          </div>
        </div>

        <div className="section stats">
          <p className="section-title">Statistiken</p>
          <div className="stat">
            <span>Medien gesamt</span>
            <strong>1.248</strong>
          </div>
          <div className="stat">
            <span>Markiert behalten</span>
            <strong>820</strong>
          </div>
          <div className="stat">
            <span>Markiert löschen</span>
            <strong>114</strong>
          </div>
          <div className="stat">
            <span>Pot. unnötig</span>
            <strong>96</strong>
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
            <button className="primary">Auswahl prüfen</button>
          </div>
        </header>

        <section className="overview">
          <div className="overview-card">
            <p>Automatisch markiert</p>
            <h3>Sehr kleine, unscharfe oder kurze Medien</h3>
            <span>Diese Dateien werden nur vorgeschlagen, nie automatisch gelöscht.</span>
          </div>
          <div className="overview-card highlight">
            <p>Papierkorb</p>
            <h3>0 Dateien im Papierkorb</h3>
            <span>Gelöschte Dateien bleiben wiederherstellbar.</span>
          </div>
          <div className="overview-card">
            <p>Freigabe-Schätzung</p>
            <h3>3,8 GB möglich</h3>
            <span>Basierend auf der aktuellen Lösch-Markierung.</span>
          </div>
        </section>

        <section className="media-grid">
          <div className="media-grid-header">
            <h2>Chronologische Vorschau</h2>
            <div className="grid-controls">
              <button className="ghost">Sortierung: Datum</button>
              <button className="ghost">Gruppieren: Ähnlichkeit</button>
              <button className="ghost">Layout: Raster</button>
            </div>
          </div>
          <div className="grid">
            {mediaItems.map((item) => (
              <article key={item.id} className="media-card">
                <div className="thumb">
                  <span className="thumb-type">{item.type}</span>
                </div>
                <div className="media-info">
                  <div>
                    <h3>{item.id}</h3>
                    <p>{item.date}</p>
                  </div>
                  <div className="meta">
                    <span>{item.size}</span>
                    <span className={`badge badge-${item.badge.toLowerCase().replace(/\s/g, '-')}`}>
                      {item.badge}
                    </span>
                  </div>
                </div>
                <div className="media-actions">
                  <button className="keep">Behalten</button>
                  <button className="discard">Löschen</button>
                </div>
                <span className={`status status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="review-mode">
          <div className="panel">
            <div className="panel-header">
              <h2>Review-Modus</h2>
              <span>Bild 42 von 1248</span>
            </div>
            <div className="review-content">
              <div className="review-preview">Großansicht</div>
              <div className="review-details">
                <h3>IMG_1242.JPG</h3>
                <ul>
                  <li>Aufnahme: 12. Sep 2023 · 18:43</li>
                  <li>Größe: 4,1 MB · 4032 × 3024</li>
                  <li>Hinweise: sehr ähnlich, leicht verwackelt</li>
                  <li>Aktion: prüfen</li>
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
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Vergleichsmodus</h2>
              <span>Gruppe 6 · Sehr ähnlich</span>
            </div>
            <div className="compare-grid">
              {similarGroup.map((item) => (
                <div key={item.name} className="compare-card">
                  <div className="compare-thumb">Vorschau</div>
                  <div>
                    <h4>{item.name}</h4>
                    <p>{item.note}</p>
                    <div className="compare-actions">
                      <button className="keep">Behalten</button>
                      <button className="discard">Löschen</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="footer">
          <div>
            <h3>Zusammenfassung vor dem Löschen</h3>
            <p>
              114 Dateien markiert · 3,8 GB Speicherfreigabe · 0 Dateien im Papierkorb
            </p>
          </div>
          <div className="actions">
            <button className="ghost">Zusammenfassung anzeigen</button>
            <button className="primary">In Papierkorb verschieben</button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
