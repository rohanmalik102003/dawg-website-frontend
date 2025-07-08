'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!auth) {
      setError('Firebase nicht verfügbar')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        // Registrierung
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        // Benutzer im Backend registrieren
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              username: username || email.split('@')[0],
              display_name: username || email.split('@')[0],
            }),
          })
          
          if (!response.ok) {
            console.error('Backend registration failed:', await response.text())
          }
        } catch (backendError) {
          console.error('Backend registration error:', backendError)
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError(getErrorMessage(error.code))
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Benutzer nicht gefunden'
      case 'auth/wrong-password':
        return 'Falsches Passwort'
      case 'auth/email-already-in-use':
        return 'E-Mail bereits verwendet'
      case 'auth/weak-password':
        return 'Passwort zu schwach'
      case 'auth/invalid-email':
        return 'Ungültige E-Mail'
      default:
        return 'Ein Fehler ist aufgetreten'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Bei DoIt anmelden' : 'DoIt-Konto erstellen'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? 'Noch kein Konto?' : 'Bereits ein Konto?'}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? 'Registrieren' : 'Anmelden'}
            </button>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Benutzername
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ihr Benutzername"
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="ihre@email.de"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ihr Passwort"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                isLogin ? 'Anmelden' : 'Registrieren'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}