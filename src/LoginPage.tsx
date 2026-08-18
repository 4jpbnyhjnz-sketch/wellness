import { useState } from 'react'
import { type AuthUser, loginWithMockDb, mockUsersForDev } from './auth/mockAuth'
import { supabase } from './supabaseClient'

import './LoginPage.css'
import nissaLogo from './assets/nissa_rugby.svg'

type LoginPageProps = {
  onLoginSuccess?: (user: AuthUser) => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const user = await loginWithMockDb(username, password)
      onLoginSuccess?.(user)
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Erreur de connexion inconnue.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <img src={nissaLogo} alt="Logo Nissa Rugby" />
        </div>

        <h1 className="login-title">Nissa Rugby</h1>
        <p className="login-subtitle">Performance Hub</p>

        <form onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Identifiant</span>
            <input
              className="login-input"
              type="text"
              autoComplete="username"
              placeholder="Identifiant"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="login-field">
            <span>Mot de passe</span>
            <input
              className="login-input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <button className="login-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="login-error" role="alert">
            {errorMessage}
          </p>
        </form>

        <details className="login-dev-hint">
          <summary>Comptes de test (mock)</summary>
          <ul>
            {mockUsersForDev.map((user) => (
              <li key={user.username}>
                <code>{user.username}</code> / <code>{user.password}</code> ({user.role})
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  )
}
