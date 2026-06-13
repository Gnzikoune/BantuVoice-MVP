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

// ─────────────────────────────────────────────
// Composant Panneau d'Administration — Dashboard Premium
// ─────────────────────────────────────────────
function AdminPanel({ token, apiUrl }) {
  const [url, setUrl] = useState('')
  const [language, setLanguage] = useState('')
  const [languages, setLanguages] = useState([])
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')
  const [audios, setAudios] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const logsEndRef = useRef(null)

  // Chargement initial parallèle
  useEffect(() => {
    const load = async () => {
      try {
        const [lr, ar, sr] = await Promise.all([
          fetch(`${apiUrl}/admin/languages`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/admin/audios`,    { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${apiUrl}/admin/status`,    { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (lr.ok) setLanguages((await lr.json()).languages)
        if (ar.ok) setAudios((await ar.json()).audios)
        if (sr.ok) setStatus(await sr.json())
      } catch (e) { console.error(e) }
    }
    load()
  }, [token, apiUrl])

  // Polling du statut
  useEffect(() => {
    let iv
    if (status?.is_running) {
      iv = setInterval(async () => {
        try {
          const r = await fetch(`${apiUrl}/admin/status`, { headers: { Authorization: `Bearer ${token}` } })
          if (r.ok) {
            const d = await r.json()
            setStatus(d)
            if (!d.is_running) {
              const ar = await fetch(`${apiUrl}/admin/audios`, { headers: { Authorization: `Bearer ${token}` } })
              if (ar.ok) setAudios((await ar.json()).audios)
            }
          }
        } catch (e) { console.error(e) }
      }, 1000)
    }
    return () => clearInterval(iv)
  }, [status?.is_running, token, apiUrl])

  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [status?.message])

  const handleCollect = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const r = await fetch(`${apiUrl}/admin/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url, language }),
      })
      if (!r.ok) {
        setError((await r.json()).detail || 'Erreur lors du lancement')
      } else {
        setStatus({ is_running: true, step: 'Étape 1 : Téléchargement audio', progress: 10, message: 'Démarrage de la collecte...' })
        setUrl('')
        setActiveTab('ingest')
      }
    } catch { setError('Erreur de connexion au serveur') }
  }

  const handleDeleteAudio = async (audioId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet audio ? Cette action supprimera également tous ses segments et le fichier source (S3).")) return;
    
    try {
      const res = await fetch(`${apiUrl}/admin/audios/${audioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAudios(audios.filter(a => a.audio_id !== audioId));
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de connexion.");
    }
  }

  // Métriques métier
  const totalSegments = audios.reduce((s, a) => s + (a.segment_count || 0), 0)
  const langCodes = [...new Set(audios.map(a => a.language))]
  const completionPct = languages.length ? Math.round((langCodes.length / languages.length) * 100) : 0

  const COLORS = ['#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#a18cd1','#fccb90','#d299c2']
  const navItems = [
    { id: 'overview', icon: '◈', label: "Vue d'ensemble" },
    { id: 'ingest',   icon: '⊕', label: 'Nouvelle Ingestion' },
    { id: 'library',  icon: '◫', label: 'Bibliothèque' },
  ]

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--card-bg)',
        borderRight: '1px solid var(--border-color)',
      }}>
        <div style={{ padding: '1.5rem 1.25rem 1rem' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.18em', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0 1.5rem' }}>
            Espace Administrateur
          </p>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              width: '100%', padding: '0.72rem 0.9rem', marginBottom: '0.2rem',
              borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeTab === item.id
                ? 'var(--accent-color)'
                : 'transparent',
              color: activeTab === item.id ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === item.id ? 600 : 400,
              fontSize: '0.88rem',
              boxShadow: activeTab === item.id ? '0 4px 12px var(--shadow-color)' : 'none',
              transition: 'all 0.2s ease',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Bloc statut */}
        {status?.is_running ? (
          <div style={{ margin: '1rem', padding: '1rem', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', boxShadow: '0 0 8px #3b82f6', animation: 'blink 1.5s ease-in-out infinite' }}></span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pipeline actif</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{status.step}</div>
            <div style={{ height: '3px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${status.progress}%`, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', transition: 'width 0.5s ease' }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#3b82f6', marginTop: '0.25rem' }}>{status.progress}%</div>
          </div>
        ) : (
          <div style={{ margin: '1rem', padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.07)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--success-color)', fontWeight: 600 }}>● Système opérationnel</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>DynamoDB · S3 · Whisper</div>
          </div>
        )}
      </aside>

      {/* ── CONTENU PRINCIPAL ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem 2.5rem', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>

        {/* ═══ VUE D'ENSEMBLE ═══ */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>Tableau de Bord</h2>
              <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Corpus BantuVoice — Patrimoine linguistique gabonais</p>
            </div>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.75rem' }}>
              {[
                { label: 'Audios collectés',   value: audios.length, sub: 'fichiers dans la bibliothèque',
                  gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', glow: 'rgba(102,126,234,0.35)', icon: '🎵' },
                { label: 'Segments à annoter', value: totalSegments, sub: 'extraits audio générés par Whisper',
                  gradient: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)', glow: 'rgba(240,147,251,0.35)', icon: '✂️' },
                { label: 'Langues documentées', value: `${langCodes.length} / ${languages.length}`, sub: 'langues gabonaises couvertes',
                  gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)', glow: 'rgba(79,172,254,0.35)', icon: '🌍' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: kpi.gradient, borderRadius: '18px', padding: '1.6rem',
                  boxShadow: `0 8px 32px ${kpi.glow}`, position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', right: '-8px', top: '-8px', fontSize: '4.5rem', opacity: 0.12, lineHeight: 1 }}>{kpi.icon}</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.92)', marginTop: '0.4rem' }}>{kpi.label}</div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.2rem' }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Grille : Avancement + Répartition */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>

              {/* Donut Avancement */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-color)' }}>
                <h3 style={{ margin: '0 0 1.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'flex-start' }}>Avancement</h3>
                <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke="url(#pctGrad)" strokeWidth="3"
                      strokeDasharray={`${completionPct} ${100 - completionPct}`}
                      strokeLinecap="round" />
                    <defs>
                      <linearGradient id="pctGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>{completionPct}%</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>couvert</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '1rem 0', lineHeight: 1.5 }}>
                  {langCodes.length} langue{langCodes.length !== 1 ? 's' : ''} sur {languages.length} documentée{langCodes.length !== 1 ? 's' : ''}
                </p>
                {audios.length === 0 && (
                  <button onClick={() => setActiveTab('ingest')} style={{ marginTop: '0.75rem', width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    ⊕ Démarrer
                  </button>
                )}
              </div>

              {/* Répartition par langue */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '1.75rem', boxShadow: 'var(--shadow-color)' }}>
                <h3 style={{ margin: '0 0 1.5rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Répartition par langue</h3>
                {languages.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Chargement...</p>}
                {languages.map((lang, idx) => {
                  const count = audios.filter(a => a.language === lang.code).length
                  const segs  = audios.filter(a => a.language === lang.code).reduce((s, a) => s + (a.segment_count || 0), 0)
                  const pct   = audios.length ? Math.round((count / audios.length) * 100) : 0
                  const col   = COLORS[idx % COLORS.length]
                  return (
                    <div key={lang.code} style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: col, display: 'inline-block', boxShadow: `0 0 6px ${col}` }}></span>
                          <span style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-primary)' }}>{lang.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.9rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          <span>{count} audio{count !== 1 ? 's' : ''}</span>
                          <span>{segs} seg.</span>
                          <span style={{ color: col, fontWeight: 700, minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: '3px', transition: 'width 1s ease', boxShadow: pct > 0 ? `0 0 8px ${col}` : 'none' }}></div>
                      </div>
                    </div>
                  )
                })}
                {audios.length === 0 && languages.length > 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Aucune donnée — lancez une ingestion pour peupler le corpus.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ INGESTION ═══ */}
        {activeTab === 'ingest' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>Nouvelle Ingestion</h2>
              <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Téléchargement → Segmentation Whisper → Indexation DynamoDB</p>
            </div>

            {/* Formulaire */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '2rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-color)' }}>
              <form onSubmit={handleCollect} className="login-form">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>URL YouTube</label>
                    <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required disabled={status?.is_running} style={{ marginTop: '0.4rem', background: 'var(--input-bg)' }} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Langue</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} required disabled={status?.is_running}
                      style={{ marginTop: '0.4rem', width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}>
                      <option value="" disabled>Sélectionner...</option>
                      {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={status?.is_running} style={{
                  width: '100%', padding: '0.95rem', borderRadius: '10px', border: 'none',
                  cursor: status?.is_running ? 'not-allowed' : 'pointer',
                  background: status?.is_running
                    ? 'rgba(255,255,255,0.07)'
                    : 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
                  color: status?.is_running ? 'rgba(255,255,255,0.35)' : '#fff',
                  fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em',
                  boxShadow: status?.is_running ? 'none' : '0 4px 24px rgba(102,126,234,0.4)',
                  transition: 'all 0.25s ease',
                }}>
                  {status?.is_running ? "⏳  Pipeline en cours d'exécution..." : '🚀  Lancer la Collecte & Segmentation IA'}
                </button>
                {error && (
                  <div style={{ marginTop: '0.75rem', padding: '0.8rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.88rem' }}>
                    {error}
                  </div>
                )}
              </form>
            </div>

            {/* Terminal de logs */}
            {status && (status.is_running || status.progress > 0) && (
              <div style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Barre titre macOS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.25rem', background: '#1c1c1e' }}>
                  <span style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }}></span>
                  <span style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#febc2e', display: 'inline-block' }}></span>
                  <span style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#28c840', display: 'inline-block' }}></span>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.76rem', color: '#636366', fontFamily: 'monospace' }}>bantuvoice — pipeline.log</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: status.step?.startsWith('✅') ? '#28c840' : status.step?.startsWith('❌') ? '#ff5f57' : '#febc2e' }}>
                      {status.step}
                    </span>
                    <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#48484a' }}>({status.progress}%)</span>
                  </div>
                </div>
                {/* Barre de progression */}
                <div style={{ height: '4px', background: '#2c2c2e', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${status.progress}%`,
                    background: status.step?.startsWith('✅') ? '#28c840' : status.step?.startsWith('❌') ? '#ff5f57' : 'linear-gradient(90deg,#667eea,#764ba2)',
                    transition: 'width 0.6s ease', boxShadow: '0 0 10px rgba(102,126,234,0.5)',
                  }}></div>
                </div>
                {/* Corps terminal */}
                <div style={{ background: '#111113', padding: '1.25rem', fontFamily: '"Cascadia Code","Fira Code","Consolas",monospace', fontSize: '0.82rem', lineHeight: 2, maxHeight: '300px', overflowY: 'auto' }}>
                  {(status.message || '').split('\n').map((line, i) => (
                    <div key={i}>
                      <span style={{ color: '#3a3a3c', marginRight: '0.7rem', userSelect: 'none' }}>›</span>
                      <span style={{
                        color: line.startsWith('[SUCCÈS]')              ? '#28c840'
                             : line.startsWith('Chargement')            ? '#febc2e'
                             : line.startsWith('Transcription en cours')? '#60a5fa'
                             : line.startsWith('❌')                    ? '#ff5f57'
                             : '#aeaeb2'
                      }}>{line}</span>
                    </div>
                  ))}
                  {status.is_running && (
                    <div>
                      <span style={{ color: '#3a3a3c', marginRight: '0.7rem' }}>›</span>
                      <span style={{ display: 'inline-block', width: '9px', height: '15px', background: '#667eea', verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }}></span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ BIBLIOTHÈQUE ═══ */}
        {activeTab === 'library' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>Bibliothèque d'Audios</h2>
                <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {audios.length} audio{audios.length !== 1 ? 's' : ''} · {totalSegments} segments indexés dans DynamoDB
                </p>
              </div>
              <button onClick={() => setActiveTab('ingest')} style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', background: 'var(--accent-color)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                ⊕ Ajouter un audio
              </button>
            </div>

            {audios.length === 0 ? (
              <div style={{ background: 'var(--card-bg)', border: '1px dashed var(--border-color)', borderRadius: '18px', padding: '4rem', textAlign: 'center', boxShadow: 'var(--shadow-color)' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem' }}>La bibliothèque est vide.</p>
                <button onClick={() => setActiveTab('ingest')} style={{ padding: '0.7rem 1.5rem', background: 'var(--accent-color)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'inline-block' }}>
                  ⊕ Première Ingestion
                </button>
              </div>
            ) : (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-color)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--input-bg)' }}>
                      {['Titre', 'Langue', 'Segments', 'Ingéré le', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.9rem 1.25rem', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audios.map((a, i) => {
                      const langLabel = languages.find(l => l.code === a.language)?.label || a.language
                      const col = COLORS[languages.findIndex(l => l.code === a.language) % COLORS.length] || '#8b5cf6'
                      return (
                        <tr key={a.audio_id}
                          style={{ borderTop: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--input-bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.title || a.audio_id}</div>
                            <div style={{ fontSize: '0.69rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>{a.audio_id}</div>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{ padding: '0.22rem 0.7rem', borderRadius: '20px', background: `${col}22`, border: `1px solid ${col}55`, color: col, fontSize: '0.76rem', fontWeight: 700 }}>
                              {langLabel}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-color)' }}>{a.segment_count}</span>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginLeft: '0.3rem' }}>extraits</span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {new Date(a.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <button onClick={() => handleDeleteAudio(a.audio_id)} style={{
                              background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'
                            }}>
                              🗑️ Supprimer
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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

// ─────────────────────────────────────────────
// Composant Principal App
// ─────────────────────────────────────────────
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loginError, setLoginError] = useState('')

  // États hiérarchiques (Langue -> Audio -> Segments)
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

  useEffect(() => {
    if (token) {
      fetchCurrentUser()
      fetchLanguages()
    }
  }, [token])

  useEffect(() => {
    if (selectedLanguage) {
      setSelectedAudio(null)
      setSegments([])
      setActiveSegment(null)
      fetchAudios(selectedLanguage)
    }
  }, [selectedLanguage])

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
    } catch {
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
      const response = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) setUser(await response.json())
      else handleLogout()
    } catch (e) { console.error(e) }
  }

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`${API_URL}/languages`, { headers: { Authorization: `Bearer ${token}` }})
      if (res.ok) setLanguages((await res.json()).languages)
    } catch (e) { console.error(e) }
  }

  const fetchAudios = async (langCode) => {
    try {
      const res = await fetch(`${API_URL}/audios?language=${langCode}`, { headers: { Authorization: `Bearer ${token}` }})
      if (res.ok) setAudios((await res.json()).audios)
    } catch (e) { console.error(e) }
  }

  const fetchSegments = async (audioId) => {
    try {
      const res = await fetch(`${API_URL}/segments?audio_id=${audioId}`, { headers: { Authorization: `Bearer ${token}` }})
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audio_id: selectedAudio.audio_id, segment_id: activeSegment.segment_id, annotated_text: annotation })
      })
      if (response.ok) {
        setIsSaved(true)
        fetchSegments(selectedAudio.audio_id)
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

  if (!token) return <Login onLogin={handleLogin} error={loginError} />

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-titles">
          <h1>BantuVoice</h1>
          <p>Espace sécurisé — Utilisateur : <strong>{user?.full_name || 'Chargement...'}</strong></p>
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
          {/* BARRE LATÉRALE HIÉRARCHIQUE */}
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
