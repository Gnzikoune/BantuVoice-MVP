import { useState, useEffect, useRef } from 'react'
import './App.css'

// Composant de Connexion (Login)
function Login({ onLogin, error }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onLogin(username, password)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Connexion Scientifique</h2>
        <p>Identifiez-vous pour accéder à l'espace d'annotation BantuVoice.</p>
        
        <div style={{background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)'}}>
          <strong style={{color: 'var(--accent-color)'}}>Comptes de test :</strong><br/>
          👤 <code>linguiste_a</code> / <code>password123</code><br/>
          👤 <code>linguiste_b</code> / <code>password123</code><br/>
          👑 <code>gildas_admin</code> / <code>password123</code>
        </div>
        
        {error && <div style={{color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid rgba(255,107,107,0.3)'}}>{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Identifiant</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-submit" style={{width: '100%', justifyContent: 'center'}}>
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
}

// Composant Panneau d'Administration
function AdminPanel({ token, apiUrl }) {
  const [url, setUrl] = useState('')
  const [language, setLanguage] = useState('')
  const [languages, setLanguages] = useState([])
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [audios, setAudios] = useState([])

  // Charger les langues et les audios
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const langRes = await fetch(`${apiUrl}/admin/languages`, { headers: { 'Authorization': `Bearer ${token}` }})
        if (langRes.ok) setLanguages((await langRes.json()).languages)

        const audiosRes = await fetch(`${apiUrl}/admin/audios`, { headers: { 'Authorization': `Bearer ${token}` }})
        if (audiosRes.ok) setAudios((await audiosRes.json()).audios)
      } catch (e) { console.error(e) }
    }
    fetchAdminData()
  }, [token, apiUrl])

  // Polling du statut
  useEffect(() => {
    let interval;
    if (status?.is_running) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${apiUrl}/admin/status`, { headers: { 'Authorization': `Bearer ${token}` }})
          if (res.ok) setStatus(await res.json())
        } catch (e) { console.error(e) }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status?.is_running, token, apiUrl])

  const handleCollect = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${apiUrl}/admin/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url, language })
      })
      if (!res.ok) {
        setError((await res.json()).detail || 'Erreur lors du lancement')
      } else {
        setStatus({ is_running: true, step: 'Initialisation...', progress: 5, message: 'Démarrage...' })
        setUrl('')
      }
    } catch (e) {
      setError('Erreur de connexion au serveur')
    }
  }

  return (
    <div className="admin-panel" style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%'}}>
      
      {/* SECTION INGESTION */}
      <div className="login-card" style={{maxWidth: '100%', marginBottom: '2rem'}}>
        <h2>Nouvelle Ingestion (Collecte de données)</h2>
        <p>Lancer une nouvelle collecte en spécifiant la langue de l'audio.</p>
        
        <form onSubmit={handleCollect} className="login-form" style={{marginTop: '2rem'}}>
          <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
            <div className="form-group" style={{flex: 2, minWidth: '250px'}}>
              <label>URL de la vidéo YouTube</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required disabled={status?.is_running} />
            </div>
            <div className="form-group" style={{flex: 1, minWidth: '150px'}}>
              <label>Langue</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} required disabled={status?.is_running} style={{width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)', border: '1px solid rgba(255,255,255,0.1)'}}>
                <option value="" disabled>Choisir...</option>
                {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn-submit" disabled={status?.is_running} style={{width: '100%', justifyContent: 'center'}}>
            {status?.is_running ? 'Collecte en cours...' : 'Lancer la Collecte & Segmentation'}
          </button>
          {error && <div style={{color: '#ff6b6b', marginTop: '1rem'}}>{error}</div>}
        </form>

        {status && (status.is_running || status.progress > 0) && (
          <div style={{marginTop: '2rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px'}}>
            <h3 style={{marginBottom: '1rem', fontSize: '1.1rem'}}>{status.step || 'En attente...'}</h3>
            <div style={{width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden'}}>
              <div style={{ height: '100%', width: `${status.progress}%`, background: 'var(--accent-color)', transition: 'width 0.5s ease' }}></div>
            </div>
            <p style={{marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>{status.message}</p>
          </div>
        )}
      </div>

      {/* SECTION BIBLIOTHÈQUE */}
      <div className="login-card" style={{maxWidth: '100%'}}>
        <h2>Bibliothèque d'Audios (AWS DynamoDB)</h2>
        <p>Liste de tous les audios ingérés et disponibles pour les linguistes.</p>
        
        {audios.length === 0 ? (
           <div className="empty-state" style={{marginTop: '2rem'}}>📭 Aucun audio dans la bibliothèque.</div>
        ) : (
          <table style={{width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse', textAlign: 'left'}}>
            <thead>
              <tr style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                <th style={{padding: '1rem 0'}}>Titre / ID</th>
                <th>Langue</th>
                <th>Segments</th>
                <th>Date d'ingestion</th>
              </tr>
            </thead>
            <tbody>
              {audios.map(a => (
                <tr key={a.audio_id} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                  <td style={{padding: '1rem 0'}}><strong>{a.title || a.audio_id}</strong></td>
                  <td><span className="status-badge status-pending" style={{textTransform: 'capitalize'}}>{a.language}</span></td>
                  <td>{a.segment_count} extraits</td>
                  <td style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loginError, setLoginError] = useState('')

  // Nouveaux états hiérarchiques (Langue -> Audio -> Segments)
  const [languages, setLanguages] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState("")
  const [audios, setAudios] = useState([])
  const [selectedAudio, setSelectedAudio] = useState(null)
  const [segments, setSegments] = useState([])
  const [activeSegment, setActiveSegment] = useState(null)
  
  const [annotation, setAnnotation] = useState("")
  const [theme, setTheme] = useState('dark')
  const [isSaved, setIsSaved] = useState(false)
  
  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  const audioRef = useRef(null)

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  // Initialisation Utilisateur et Langues
  useEffect(() => {
    if (token) {
      fetchCurrentUser()
      fetchLanguages()
    }
  }, [token])

  // Changement de Langue -> Récupérer les Audios
  useEffect(() => {
    if (selectedLanguage) {
      setSelectedAudio(null)
      setSegments([])
      setActiveSegment(null)
      fetchAudios(selectedLanguage)
    }
  }, [selectedLanguage])

  // Changement d'Audio -> Récupérer les Segments
  useEffect(() => {
    if (selectedAudio) {
      setActiveSegment(null)
      fetchSegments(selectedAudio.audio_id)
    }
  }, [selectedAudio])

  const handleLogin = async (username, password) => {
    try {
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const response = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData })
      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('token', data.access_token)
        setToken(data.access_token)
        setLoginError('')
      } else {
        setLoginError("Identifiants incorrects.")
      }
    } catch (error) {
      setLoginError("Erreur de connexion.")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/me`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (response.ok) setUser(await response.json())
      else handleLogout()
    } catch (e) { console.error(e) }
  }

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`${API_URL}/languages`, { headers: { 'Authorization': `Bearer ${token}` }})
      if (res.ok) setLanguages((await res.json()).languages)
    } catch (e) { console.error(e) }
  }

  const fetchAudios = async (langCode) => {
    try {
      const res = await fetch(`${API_URL}/audios?language=${langCode}`, { headers: { 'Authorization': `Bearer ${token}` }})
      if (res.ok) setAudios((await res.json()).audios)
    } catch (e) { console.error(e) }
  }

  const fetchSegments = async (audioId) => {
    try {
      const res = await fetch(`${API_URL}/segments?audio_id=${audioId}`, { headers: { 'Authorization': `Bearer ${token}` }})
      if (res.ok) setSegments((await res.json()).segments)
    } catch (e) { console.error(e) }
  }

  const handleSelectSegment = (seg) => {
    setActiveSegment(seg)
    setAnnotation(seg.annotated_text || "")
    setIsSaved(false)
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load()
        audioRef.current.play().catch(e => console.log("Lecture bloquée", e))
      }
    }, 50)
  }

  const handleSubmit = async () => {
    if (!activeSegment) return
    try {
      const response = await fetch(`${API_URL}/annotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ audio_id: selectedAudio.audio_id, segment_id: activeSegment.segment_id, annotated_text: annotation })
      })
      if (response.ok) {
        setIsSaved(true)
        fetchSegments(selectedAudio.audio_id) // Rafraîchit
        setActiveSegment({...activeSegment, annotated_text: annotation, status: "annotated"})
        setTimeout(() => setIsSaved(false), 2000)
      } else if (response.status === 401) {
        handleLogout()
      }
    } catch (error) { console.error(error) }
  }

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  }

  // --- RENDU ---
  
  if (!token) return <Login onLogin={handleLogin} error={loginError} />

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-titles">
          <h1>BantuVoice</h1>
          <p>Espace sécurisé - Utilisateur : <strong>{user?.full_name || 'Chargement...'}</strong></p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          {user?.role === 'admin' && (
            <span style={{color: 'var(--accent-color)', fontWeight: 'bold', marginRight: '1rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px'}}>
              👑 Mode Administrateur
            </span>
          )}
          <button onClick={toggleTheme} className="theme-toggle" title="Basculer le thème">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="btn-logout">Déconnexion</button>
        </div>
      </header>

      {user?.role === 'admin' ? (
        <AdminPanel token={token} apiUrl={API_URL} />
      ) : (
        <div className="dashboard">
          {/* NOUVELLE BARRE LATÉRALE HIÉRARCHIQUE */}
          <div className="segment-list" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            
            {/* 1. Sélection de la Langue */}
            <div>
              <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>1. Langue d'étude</h3>
              <select 
                value={selectedLanguage} 
                onChange={(e) => setSelectedLanguage(e.target.value)} 
                style={{width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)', border: '1px solid rgba(255,255,255,0.1)'}}
              >
                <option value="">Sélectionnez une langue...</option>
                {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>

            {/* 2. Sélection de l'Audio */}
            {selectedLanguage && (
              <div>
                <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>2. Fichier Audio</h3>
                {audios.length === 0 ? (
                  <p style={{fontSize: '0.9rem', color: '#ff6b6b'}}>Aucun audio disponible pour cette langue.</p>
                ) : (
                  <select 
                    value={selectedAudio?.audio_id || ""} 
                    onChange={(e) => setSelectedAudio(audios.find(a => a.audio_id === e.target.value))} 
                    style={{width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)', border: '1px solid rgba(255,255,255,0.1)'}}
                  >
                    <option value="">Sélectionnez un audio...</option>
                    {audios.map(a => <option key={a.audio_id} value={a.audio_id}>{a.title || a.audio_id}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* 3. Liste des Segments */}
            {selectedAudio && (
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                <h3 style={{fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)'}}>3. Segments à annoter ({segments.length})</h3>
                <div className="segments-scroll">
                  {segments.map((seg) => (
                    <div 
                      key={seg.segment_id}
                      className={`segment-item ${activeSegment?.segment_id === seg.segment_id ? 'active' : ''}`}
                      onClick={() => handleSelectSegment(seg)}
                    >
                      <div className="segment-header">
                        <span>Segment {seg.segment_id}</span>
                        <span className={`status-badge status-${seg.status}`}>
                          {seg.status === 'annotated' ? 'Validé ✓' : 'À faire'}
                        </span>
                      </div>
                      <div style={{fontSize: '0.85rem', opacity: 0.8, marginTop: '0.5rem'}}>
                        {seg.total_annotations > 0 ? (
                          <span style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>👥 {seg.total_annotations} annotation(s) globale(s)</span>
                        ) : ("Aucune annotation globale")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PANNEAU DE DROITE (ESPACE DE TRAVAIL) */}
          <div className="annotation-workspace">
            {!activeSegment ? (
              <div className="empty-state" style={{margin: 'auto'}}>
                <div className="empty-state-icon">🎧</div>
                <h3>Espace de Travail</h3>
                <p>Sélectionnez une langue, un audio, puis un segment à gauche pour commencer.</p>
              </div>
            ) : (
              <>
                <div className="workspace-header">
                  <h3>Segment {activeSegment.segment_id}</h3>
                  <div className="time-badge">⏱️ {activeSegment.start}s ➔ {activeSegment.end}s</div>
                </div>

                <div className="player-card">
                  <audio ref={audioRef} className="audio-controls" controls>
                    <source src={`${API_URL}/audio/${selectedAudio.audio_id}#t=${activeSegment.start},${activeSegment.end}`} type="audio/wav" />
                  </audio>

                  {activeSegment.whisper_text && (
                    <div className="whisper-hint">
                      <span className="hint-label">IA Whisper (Phonétique / Bruit)</span>
                      "{activeSegment.whisper_text}"
                    </div>
                  )}
                </div>

                <div className="editor-section">
                  <label htmlFor="annotation">Ma Transcription (Langue cible)</label>
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
                    <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Astuce : <strong>Ctrl + Entrée</strong> pour sauvegarder</span>
                    <button className={`btn-submit ${isSaved ? 'success' : ''}`} onClick={handleSubmit}>
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
