import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [segments, setSegments] = useState([])
  const [activeSegment, setActiveSegment] = useState(null)
  const [annotation, setAnnotation] = useState("")
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('dark')
  const [isSaved, setIsSaved] = useState(false)
  
  const API_URL = "http://127.0.0.1:8000"
  const audioRef = useRef(null)

  // Gestion du thème
  useEffect(() => {
    // Applique le thème au niveau de la racine HTML pour activer les variables CSS correspondantes
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  /**
   * Bascule l'état du thème entre "dark" et "light".
   */
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Récupération initiale des données au chargement du composant
  useEffect(() => {
    fetchSegments()
  }, [])

  /**
   * Récupère la liste des segments à annoter depuis le Backend FastAPI.
   * Met à jour l'état `segments` avec les données reçues.
   */
  const fetchSegments = async () => {
    try {
      const response = await fetch(`${API_URL}/segments`)
      const data = await response.json()
      setSegments(data.segments)
      setLoading(false)
    } catch (error) {
      console.error("Erreur lors de la récupération des segments:", error)
      setLoading(false)
    }
  }

  /**
   * Gère la sélection d'un segment dans la liste latérale.
   * Charge le texte existant et force le rechargement du lecteur audio.
   * 
   * @param {Object} seg - L'objet segment sélectionné.
   */
  const handleSelectSegment = (seg) => {
    setActiveSegment(seg)
    setAnnotation(seg.annotated_text || "")
    setIsSaved(false)
    // Délai nécessaire pour laisser le DOM mettre à jour la source audio avant de jouer
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load()
        audioRef.current.play().catch(e => console.log("Lecture auto bloquée par le navigateur", e))
      }
    }, 50)
  }

  /**
   * Envoie l'annotation saisie par l'utilisateur au backend pour sauvegarde.
   * Si la requête réussit, met à jour l'interface visuellement.
   */
  const handleSubmit = async () => {
    if (!activeSegment) return
    
    try {
      const response = await fetch(`${API_URL}/annotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: activeSegment.video_id,
          segment_id: activeSegment.segment_id,
          annotated_text: annotation,
          annotator_name: "Linguiste BantuVoice"
        })
      })
      
      if (response.ok) {
        setIsSaved(true)
        // Rafraîchir la liste discrètement
        fetchSegments()
        // Mettre à jour l'état actif visuellement
        setActiveSegment({...activeSegment, annotated_text: annotation, status: "annotated"})
        
        // Retirer le statut de succès après 2 secondes
        setTimeout(() => setIsSaved(false), 2000)
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
    }
  }

  /**
   * Écoute les événements clavier sur le champ de texte.
   * Déclenche la sauvegarde automatique si Ctrl + Entrée sont pressés.
   * 
   * @param {Event} e - L'événement clavier React.
   */
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      // Annule le comportement par défaut (retour à la ligne) et sauvegarde
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-titles">
          <h1>BantuVoice</h1>
          <p>Plateforme Scientifique d'Annotation (CSGR-IA)</p>
        </div>
        <button onClick={toggleTheme} className="theme-toggle" title="Basculer le thème">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h2>Connexion au serveur en cours...</h2>
        </div>
      ) : (
        <div className="dashboard">
          {/* PANNEAU DE GAUCHE */}
          <div className="segment-list">
            <h2>
              Liste des Segments
              <span className="segment-count">{segments.length} extraits</span>
            </h2>
            
            {segments.length === 0 ? (
              <div className="empty-state" style={{marginTop: '2rem'}}>
                <div className="empty-state-icon">📭</div>
                <p>Aucun segment détecté.<br/>Lancez l'IA Whisper (Étape 2) d'abord.</p>
              </div>
            ) : (
              <div className="segments-scroll">
                {segments.map((seg) => (
                  <div 
                    key={`${seg.video_id}-${seg.segment_id}`}
                    className={`segment-item ${activeSegment?.segment_id === seg.segment_id ? 'active' : ''}`}
                    onClick={() => handleSelectSegment(seg)}
                  >
                    <div className="segment-header">
                      <span>Segment {seg.segment_id}</span>
                      <span className={`status-badge status-${seg.status}`}>
                        {seg.status === 'annotated' ? 'Validé ✓' : 'À faire'}
                      </span>
                    </div>
                    <div style={{fontSize: '0.85rem', opacity: 0.8}}>
                      {seg.start}s - {seg.end}s
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PANNEAU DE DROITE */}
          <div className="annotation-workspace">
            {!activeSegment ? (
              <div className="empty-state" style={{margin: 'auto'}}>
                <div className="empty-state-icon">🎧</div>
                <h3>Sélectionnez un segment pour commencer</h3>
                <p>L'audio se lancera automatiquement pour vous permettre de transcrire.</p>
              </div>
            ) : (
              <>
                <div className="workspace-header">
                  <h3>Segment {activeSegment.segment_id}</h3>
                  <div className="time-badge">
                    ⏱️ {activeSegment.start}s ➔ {activeSegment.end}s
                  </div>
                </div>

                <div className="player-card">
                  <audio 
                    ref={audioRef}
                    className="audio-controls" 
                    controls 
                  >
                    <source src={`${API_URL}/audio/${activeSegment.video_id}.wav#t=${activeSegment.start},${activeSegment.end}`} type="audio/wav" />
                    Votre navigateur ne supporte pas l'audio.
                  </audio>

                  {activeSegment.whisper_text && (
                    <div className="whisper-hint">
                      <span className="hint-label">IA Whisper (Phonétique / Bruit)</span>
                      "{activeSegment.whisper_text}"
                    </div>
                  )}
                </div>

                <div className="editor-section">
                  <label htmlFor="annotation">Transcription Humaine (Langue cible)</label>
                  <textarea 
                    id="annotation"
                    className="annotation-input"
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tapez la transcription exacte ici..."
                    spellCheck="false"
                  />
                  
                  <div className="action-bar">
                    <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                      Astuce : <strong>Ctrl + Entrée</strong> pour sauvegarder rapidement
                    </span>
                    <button 
                      className={`btn-submit ${isSaved ? 'success' : ''}`} 
                      onClick={handleSubmit}
                    >
                      {isSaved ? '✓ Sauvegardé' : '💾 Enregistrer & Valider'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
