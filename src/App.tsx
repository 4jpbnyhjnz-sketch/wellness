import { useState, type CSSProperties } from 'react'
import './App.css'
import nissaLogo from './assets/nissa_rugby.svg'

type HubModuleId = 'gps' | 'wellness' | 'rpe' | 'joueur' | 'perf-physique'
type HubView = 'accueil' | HubModuleId

type HubModule = {
  id: HubModuleId
  icon: string
  title: string
  description: string
  accentColor: string
}

type AppProps = {
  userDisplayName?: string
  onLogout?: () => void
}

const HUB_MODULES: HubModule[] = [
  {
    id: 'gps',
    icon: '📊',
    title: 'Rapport GPS',
    description: 'Seances · Matchs · PDF · Records',
    accentColor: '#D6001C',
  },
  {
    id: 'wellness',
    icon: '💚',
    title: 'Wellness',
    description: 'Hooper · Forme · Alertes collectives',
    accentColor: '#2ecc8a',
  },
  {
    id: 'rpe',
    icon: '💪',
    title: 'RPE',
    description: 'Charge · sRPE hebdomadaire · Individuel',
    accentColor: '#5bc4f5',
  },
  {
    id: 'joueur',
    icon: '👤',
    title: 'Joueur',
    description: 'Profil individuel · GPS · Wellness · RPE',
    accentColor: '#c9a84c',
  },
  {
    id: 'perf-physique',
    icon: '🏋️',
    title: 'Perf Physique',
    description: 'Tests DC Squat · Clean · CMJ · Broad Jump',
    accentColor: '#ff9500',
  },
]

function App({ userDisplayName, onLogout }: AppProps) {
  const [activeView, setActiveView] = useState<HubView>('accueil')
  const activeModule = HUB_MODULES.find((module) => module.id === activeView)

  return (
    <div className="hub-app">
      <header className="hub-topbar">
        <button type="button" className="brand" onClick={() => setActiveView('accueil')}>
          <span className="brand-logo">
            <img src={nissaLogo} alt="Logo Nissa Rugby" />
          </span>
          <span className="brand-text">
            <span className="brand-name">Nissa Rugby</span>
            <span className="brand-sub">Performance Hub</span>
          </span>
        </button>
        <nav className="hub-nav" aria-label="Sections">
          <button
            type="button"
            className={activeView === 'accueil' ? 'hub-nav-btn active' : 'hub-nav-btn'}
            onClick={() => setActiveView('accueil')}
          >
            🏠 Accueil
          </button>
          {HUB_MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              className={activeView === module.id ? 'hub-nav-btn active' : 'hub-nav-btn'}
              onClick={() => setActiveView(module.id)}
            >
              {module.icon} {module.title}
            </button>
          ))}
        </nav>
        <div className="hub-topbar-actions">
          {userDisplayName ? <span className="user-chip">{userDisplayName}</span> : null}
          {onLogout ? (
            <button type="button" className="logout-btn" onClick={onLogout}>
              Deconnexion
            </button>
          ) : null}
        </div>
      </header>

      <main>
        {activeView === 'accueil' ? (
          <section className="home-screen">
            <div className="home-hero">
              <div className="home-logo" aria-hidden="true">
                <img src={nissaLogo} alt="" />
              </div>
              <h1>Nissa Rugby</h1>
              <p>Performance Hub · Saison 2025-2026</p>
            </div>

            <div className="module-grid">
              {HUB_MODULES.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className="module-card"
                  style={{ '--accent': module.accentColor } as CSSProperties}
                  onClick={() => setActiveView(module.id)}
                >
                  <span className="module-icon">{module.icon}</span>
                  <span className="module-text">
                    <span className="module-title">{module.title}</span>
                    <span className="module-description">{module.description}</span>
                  </span>
                  <span className="module-arrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="module-screen">
            <p className="placeholder-chip">Migration en cours</p>
            <h2>{activeModule?.title}</h2>
            <p className="module-hint">
              Tu peux maintenant migrer la section {activeModule?.title} de
              <code> gps.html </code> vers un composant React dedie.
            </p>
            <button type="button" className="back-btn" onClick={() => setActiveView('accueil')}>
              ← Retour a l&apos;accueil
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
