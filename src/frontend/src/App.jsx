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

// Composant Panneau d'Administration (Dashboard)
function AdminPanel({ token, apiUrl }) {
  const [url, setUrl] = useState('')
  const [language, setLanguage] = useState('')
  const [languages, setLanguages] = useState([])
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [audios, setAudios] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const logsEndRef = useRef(null)

  // Charger les langues, audios et statut initial
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const langRes = await fetch(`${apiUrl}/admin/languages`, { headers: { 'Authorization': `Bearer ${token}` }})
        if (langRes.ok) setLanguages((await langRes.json()).languages)
        const audiosRes = await fetch(`${apiUrl}/admin/audios`, { headers: { 'Authorization': `Bearer ${token}` }})
        if (audiosRes.ok) setAudios((await audiosRes.json()).audios)
        const statusRes = await fetch(`${apiUrl}/admin/status`, { headers: { 'Authorization': `Bearer ${token}` }})
        if (statusRes.ok) setStatus(await statusRes.json())
      } catch (e) { console.error(e) }
    }
    fetchAdminData()
  }, [token, apiUrl])

  // Polling du statut toutes les secondes si tâche active
  useEffect(() => {
    let interval;
    if (status?.is_running) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${apiUrl}/admin/status`, { headers: { 'Authorization': `Bearer ${token}` }})
          if (res.ok) {
            const data = await res.json()
            setStatus(data)
            // Actualiser la bibliothèque une fois terminé
            if (!data.is_running) {
              const audiosRes = await fetch(`${apiUrl}/admin/audios`, { headers: { 'Authorization': `Bearer ${token}` }})
              if (audiosRes.ok) setAudios((await audiosRes.json()).audios)
            }
          }
        } catch (e) { console.error(e) }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [status?.is_running, token, apiUrl])

  // Auto-scroll du terminal vers le bas
  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [status?.message])

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
        setStatus({ is_running: true, step: 'Étape 1 : Téléchargement audio', progress: 10, message: 'Démarrage de la collecte...' })
        setUrl('')
        setActiveTab('ingest') // Basculer automatiquement pour voir les logs
      }
    } catch (e) {
      setError('Erreur de connexion au serveur')
    }
  }

  // Calculs pour les KPI cards
  const totalSegments = audios.reduce((sum, a) => sum + (a.segment_count || 0), 0)
  const langCount = new Set(audios.map(a => a.language)).size

  const tabs = [
    { id: 'overview', label: '📊 Vue d\'ensemble' },
    { id: 'ingest', label: '⚙️ Ingestion' },
    { id: 'library', label: '📚 Bibliothèque' },
  ]

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

      {/* SIDEBAR ADMIN */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'rgba(0,0,0,0.25)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 0', gap: '0.25rem'
      }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>
            Administration
          </p>
        </div>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: activeTab === tab.id ? 'rgba(139,92,246,0.15)' : 'transparent',
            border: 'none',
            borderLeft: activeTab === tab.id ? '3px solid var(--accent-color)' : '3px solid transparent',
            color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
            padding: '0.85rem 1.5rem', textAlign: 'left', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: activeTab === tab.id ? 600 : 400,
            transition: 'all 0.2s ease', width: '100%'
          }}>
            {tab.label}
          </button>
        ))}

        {/* Indicateur de tâche dans la sidebar */}
        {status?.is_running && (
          <div style={{ margin: '1.5rem 1rem 0', padding: '0.75rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 700, marginBottom: '0.4rem' }}>● PIPELINE ACTIF</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{status.step}</div>
            <div style={{ marginTop: '0.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${status.progress}%`, background: '#60a5fa', transition: 'width 0.5s ease' }}></div>
            </div>
          </div>
        )}
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>

        {/* ── ONGLET : VUE D'ENSEMBLE ── */}
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Tableau de Bord</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', marginTop: 0 }}>Vue d'ensemble du corpus BantuVoice</p>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Audios collectés', value: audios.length, icon: '🎵', color: '#8b5cf6' },
                { label: 'Segments total', value: totalSegments, icon: '✂️', color: '#3b82f6' },
                { label: 'Langues couvertes', value: langCount, icon: '🌍', color: '#10b981' },
                { label: 'Infrastructure', value: 'Floci ☁️', icon: '🛠️', color: '#f59e0b' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                  borderRadius: '12px', padding: '1.25rem',
                  borderTop: `3px solid ${kpi.color}`
                }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{kpi.icon}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Répartition par langue */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', marginTop: 0 }}>Répartition par langue</h3>
              {languages.map(lang => {
                const count = audios.filter(a => a.language === lang.code).length
                const pct = audios.length ? Math.round((count / audios.length) * 100) : 0
                return (
                  <div key={lang.code} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                      <span>{lang.label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{count} audio(s) — {pct}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-color)', borderRadius: '3px', transition: 'width 0.8s ease' }}></div>
                    </div>
                  </div>
                )
              })}
              {audios.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Aucun audio dans le corpus.{' '}
                  <button onClick={() => setActiveTab('ingest')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                    Commencer une ingestion →
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── ONGLET : INGESTION ── */}
        {activeTab === 'ingest' && (
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Nouvelle Ingestion</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', marginTop: 0 }}>Télécharger et segmenter un audio depuis YouTube.</p>

            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <form onSubmit={handleCollect} className="login-form">
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 2, minWidth: '250px' }}>
                    <label>URL YouTube</label>
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required disabled={status?.is_running} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                    <label>Langue</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} required disabled={status?.is_running} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <option value="" disabled>Choisir...</option>
                      {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-submit" disabled={status?.is_running} style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                  {status?.is_running ? '⏳ Pipeline en cours...' : '🚀 Lancer la Collecte & Segmentation'}
                </button>
                {error && <div style={{ color: '#ff6b6b', marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,107,107,0.1)', borderRadius: '6px', fontSize: '0.9rem' }}>{error}</div>}
              </form>
            </div>

            {/* TERMINAL DE LOGS EN TEMPS RÉEL */}
            {status && (status.is_running || status.progress > 0) && (
              <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#161b22', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }}></span>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e', display: 'inline-block' }}></span>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840', display: 'inline-block' }}></span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: '#8b949e', fontFamily: 'monospace' }}>pipeline.log — BantuVoice AI</span>
                </div>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${status.progress}%`,
                      background: status.step?.startsWith('✅') ? '#28c840' : status.step?.startsWith('❌') ? '#ff5f57' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                      transition: 'width 0.5s ease'
                    }}></div>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#8b949e', whiteSpace: 'nowrap' }}>
                    {status.step} ({status.progress}%)
                  </span>
                </div>
                <div style={{ padding: '1rem', fontFamily: '"Cascadia Code", "Fira Code", monospace', fontSize: '0.82rem', lineHeight: '1.9', color: '#c9d1d9', maxHeight: '280px', overflowY: 'auto' }}>
                  {(status.message || '').split('\n').map((line, i) => (
                    <div key={i} style={{
                      color: line.startsWith('[SUCCÈS]') ? '#28c840'
                        : line.startsWith('Chargement') ? '#febc2e'
                        : line.startsWith('Transcription') ? '#60a5fa'
                        : line.startsWith('❌') ? '#ff5f57'
                        : '#c9d1d9'
                    }}>
                      <span style={{ color: '#4a5568', marginRight: '0.6rem', userSelect: 'none' }}>$</span>{line}
                    </div>
                  ))}
                  {status.is_running && (
                    <div><span style={{ color: '#4a5568', marginRight: '0.6rem' }}>$</span>
                      <span style={{ display: 'inline-block', width: '8px', height: '14px', background: '#60a5fa', verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }}></span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET : BIBLIOTHÈQUE ── */}
        {activeTab === 'library' && (
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Bibliothèque d'Audios</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', marginTop: 0 }}>Corpus indexé dans Amazon DynamoDB via Floci.io.</p>
            {audios.length === 0 ? (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ color: 'var(--text-secondary)' }}>Aucun audio dans la bibliothèque.</p>
                <button className="btn-submit" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('ingest')}>➕ Nouvelle Ingestion</button>
              </div>
            ) : (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                      {['Titre / ID', 'Langue', 'Segments', 'Ingéré le'].map(h => (
                        <th key={h} style={{ padding: '1rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audios.map((a, i) => (
                      <tr key={a.audio_id} style={{ borderTop: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600 }}>{a.title || a.audio_id}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>{a.audio_id}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className="status-badge status-annotated" style={{ textTransform: 'capitalize' }}>{a.language}</span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{a.segment_count}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}> extraits</span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(a.created_at).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
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
