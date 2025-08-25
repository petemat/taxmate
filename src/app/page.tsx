'use client'

import { useAuth } from '@/contexts/auth-context'
import { LoginForm } from '@/components/auth/login-form'
import { Dashboard } from '@/components/dashboard/dashboard'
import { AuthDebug } from '@/components/debug/auth-debug'
import { RefreshCw } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="mb-8">
              <div className="mx-auto w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                <span className="text-lg font-semibold text-white">T</span>
              </div>
            </div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              TaxMate
            </h1>
            <p className="text-gray-500 text-sm">
              Belege verwalten und Steuern optimieren
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <>
      <Dashboard />
      <AuthDebug />
    </>
  )
}
