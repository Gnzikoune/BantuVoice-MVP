import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [segments, setSegments] = useState([])
  const [activeSegment, setActiveSegment] = useState(null)
  const [annotation, setAnnotation] = useState("")
  const [loading, setLoading] = useState(true)
  
  const API_URL = "http://127.0.0.1:8000"
  const audioRef = useRef(null)

  useEffect(() => {
    fetchSegments()
  }, [])

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

  const handleSelectSegment = (seg) => {
    setActiveSegment(seg)
    setAnnotation(seg.annotated_text || "")
    // On recharge l'audio
    if (audioRef.current) {
      audioRef.current.load()
    }
  }

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
          annotator_name: "Gildas" // A rendre dynamique plus tard
        })
      })
      
      if (response.ok) {
        // Rafraîchir la liste
        fetchSegments()
        // Garder le segment actif mais mettre à jour son statut visuellement
        setActiveSegment({...activeSegment, annotated_text: annotation, status: "annotated"})
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>BantuVoice</h1>
        <p>Plateforme Scientifique d'Annotation (CSGR-IA)</p>
      </header>

      {loading ? (
        <div className="empty-state">Chargement des données...</div>
      ) : (
        <div className="dashboard">
          {/* Liste des segments à gauche */}
          <div className="segment-list">
            <h2>Segments ({segments.length})</h2>
            {segments.length === 0 ? (
              <p className="empty-state">Aucun segment à annoter. Lancez l'outil Whisper d'abord !</p>
            ) : (
              segments.map((seg) => (
                <div 
                  key={`${seg.video_id}-${seg.segment_id}`}
                  className={`segment-item ${activeSegment?.segment_id === seg.segment_id ? 'active' : ''}`}
                  onClick={() => handleSelectSegment(seg)}
                >
                  <span>Segment {seg.segment_id} ({seg.start}s - {seg.end}s)</span>
                  <span className={`status-badge status-${seg.status}`}>
                    {seg.status === 'annotated' ? 'Validé' : 'À faire'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Espace de travail à droite */}
          <div className="annotation-workspace">
            {!activeSegment ? (
              <div className="empty-state">
                <h3>Sélectionnez un segment à gauche pour commencer</h3>
                <p>Écoutez l'extrait et transcrivez-le avec précision.</p>
              </div>
            ) : (
              <>
                <div className="player-section">
                  <h3>Lecture de l'extrait</h3>
                  <p>De {activeSegment.start}s à {activeSegment.end}s</p>
                  
                  {/* Utilisation de l'API FastAPI pour servir le fichier */}
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
                      <strong>Base phonétique (IA) :</strong> "{activeSegment.whisper_text}"
                    </div>
                  )}
                </div>

                <div className="editor-section">
                  <label htmlFor="annotation">Transcription Finale (Langue cible)</label>
                  <textarea 
                    id="annotation"
                    className="annotation-input"
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                    placeholder="Tapez exactement ce que vous entendez..."
                  />
                  
                  <div className="action-buttons">
                    <button className="btn-submit" onClick={handleSubmit}>
                      Enregistrer & Valider
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
