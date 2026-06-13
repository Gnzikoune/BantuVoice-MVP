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
          <strong style={{color: 'var(--accent-color)'}}>Comptes de test (Double Annotation) :</strong><br/>
          👤 <code>linguiste_a</code> / <code>password123</code><br/>
          👤 <code>linguiste_b</code> / <code>password123</code>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Identifiant (ex: linguiste_a)</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Mot de passe (ex: password123)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn-submit" style={{width: '100%', justifyContent: 'center'}}>
            Se connecter
          </button>
        </form>
      </div>
    </div>
  )
// Composant Panneau d'Administration
function AdminPanel({ token, apiUrl }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  // Polling pour récupérer le statut toutes les secondes si une tâche est en cours
  useEffect(() => {
    let interval;
    if (status?.is_running) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${apiUrl}/admin/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) setStatus(await res.json())
        } catch (e) { console.error(e) }
      }, 1000)
    } else {
      // Récupération initiale
      const fetchStatus = async () => {
        try {
          const res = await fetch(`${apiUrl}/admin/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) setStatus(await res.json())
        } catch (e) {}
      }
      fetchStatus()
    }
    return () => clearInterval(interval)
  }, [status?.is_running, token, apiUrl])

  const handleCollect = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${apiUrl}/admin/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Erreur lors du lancement')
      } else {
        setStatus({ is_running: true, step: 'Initialisation...', progress: 5, message: 'Démarrage...' })
        setUrl('')
      }
    } catch (e) {
      setError('Erreur de connexion au serveur')
    }
  }

  return (
    <div className="admin-panel" style={{padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%'}}>
      <div className="login-card" style={{maxWidth: '100%'}}>
        <h2>Panneau d'Administration CSGR-IA</h2>
        <p>Lancer une nouvelle collecte de données linguistiques en arrière-plan.</p>
        
        <form onSubmit={handleCollect} className="login-form" style={{marginTop: '2rem'}}>
          <div className="form-group">
            <label>URL de la vidéo YouTube</label>
            <input 
              type="url" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="https://www.youtube.com/watch?v=..."
              required 
              disabled={status?.is_running}
            />
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
              <div style={{
                height: '100%', 
                width: `${status.progress}%`, 
                background: 'var(--accent-color)',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
            <p style={{marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
              {status.message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  // États d'authentification
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loginError, setLoginError] = useState('')

  // États d'application
  const [segments, setSegments] = useState([])
  const [activeSegment, setActiveSegment] = useState(null)
  const [annotation, setAnnotation] = useState("")
  const [theme, setTheme] = useState('dark')
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Navigation RBAC
  const [activeTab, setActiveTab] = useState('workspace')
  
  // URL dynamique pour s'adapter au serveur local ou VPS distant
  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
  const audioRef = useRef(null)

  // Gestion du thème
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Vérification du token et récupération de l'utilisateur au chargement
  useEffect(() => {
    if (token) {
      fetchCurrentUser()
      fetchSegments()
    }
  }, [token])

  /**
   * Tente de se connecter à l'API FastAPI pour récupérer un token JWT.
   * @param {string} username - Le nom d'utilisateur (ex: linguiste_a)
   * @param {string} password - Le mot de passe de l'utilisateur
   */
  const handleLogin = async (username, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const jwtToken = data.access_token;
        localStorage.setItem('token', jwtToken);
        setToken(jwtToken);
        setLoginError('');
      } else {
        setLoginError("Identifiants incorrects. Veuillez réessayer.");
      }
    } catch (error) {
      setLoginError("Erreur de connexion au serveur.");
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSegments([]);
    setActiveSegment(null);
  }

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        setUser(await response.json())
      } else {
        handleLogout() // Token expiré ou invalide
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchSegments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/segments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSegments(data.segments)
      } else if (response.status === 401) {
        handleLogout()
      }
    } catch (error) {
      console.error("Erreur lors de la récupération:", error)
    } finally {
      setLoading(false)
    }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          video_id: activeSegment.video_id,
          segment_id: activeSegment.segment_id,
          annotated_text: annotation
        })
      })
      
      if (response.ok) {
        setIsSaved(true)
        fetchSegments() // Rafraîchit pour obtenir le nouveau total d'annotations
        setActiveSegment({...activeSegment, annotated_text: annotation, status: "annotated"})
        setTimeout(() => setIsSaved(false), 2000)
      } else if (response.status === 401) {
        handleLogout()
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
    }
  }

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // --- RENDU ---
  
  if (!token) {
    return <Login onLogin={handleLogin} error={loginError} />
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-titles">
          <h1>BantuVoice</h1>
          <p>Espace sécurisé - Utilisateur : <strong>{user?.full_name || 'Chargement...'}</strong></p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          {user?.role === 'admin' && (
            <div className="tabs" style={{display: 'flex', gap: '0.5rem', marginRight: '1rem'}}>
              <button 
                className={`tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
                onClick={() => setActiveTab('workspace')}
                style={{padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', background: activeTab === 'workspace' ? 'var(--accent-color)' : 'transparent', color: '#fff', cursor: 'pointer'}}
              >
                Espace Linguiste
              </button>
              <button 
                className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
                style={{padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', background: activeTab === 'admin' ? 'var(--accent-color)' : 'transparent', color: '#fff', cursor: 'pointer'}}
              >
                ⚙️ Admin
              </button>
            </div>
          )}
          <button onClick={toggleTheme} className="theme-toggle" title="Basculer le thème">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Déconnexion
          </button>
        </div>
      </header>

      {activeTab === 'admin' && user?.role === 'admin' ? (
        <AdminPanel token={token} apiUrl={API_URL} />
      ) : loading && segments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h2>Chargement de vos tâches...</h2>
        </div>
      ) : (
        <div className="dashboard">
          {/* PANNEAU DE GAUCHE */}
          <div className="segment-list">
            <h2>
              Mes Tâches
              <span className="segment-count">{segments.length} extraits</span>
            </h2>
            
            {segments.length === 0 ? (
              <div className="empty-state" style={{marginTop: '2rem'}}>
                <div className="empty-state-icon">📭</div>
                <p>Aucun segment détecté.</p>
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
                    <div style={{fontSize: '0.85rem', opacity: 0.8, marginTop: '0.5rem'}}>
                      {seg.total_annotations > 0 ? (
                        <span style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>
                          👥 {seg.total_annotations} annotation(s) globale(s)
                        </span>
                      ) : (
                        "Aucune annotation globale"
                      )}
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
                <h3>Sélectionnez une tâche à gauche</h3>
                <p>Rappel : Protocole d'aveuglement activé. Vous ne verrez pas le travail de vos collègues.</p>
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
                    <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                      Astuce : <strong>Ctrl + Entrée</strong> pour sauvegarder
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
