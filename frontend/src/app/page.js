'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/components/LoginPage'
import HomePage from '@/components/HomePage'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true)
    }
  }, [user, loading])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="mobile-container">
      {user ? (
        <HomePage />
      ) : (
        <LoginPage />
      )}
    </div>
  )
}