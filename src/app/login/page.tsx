'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async () => {
    if (loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error
      
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans">
      {/* Black glass card with hover effect */}
      <div
        className="w-full max-w-md rounded-2xl
                   bg-black/40 backdrop-blur-lg
                   border border-gray-700/50
                   hover:border-gray-400/50
                   shadow-2xl hover:shadow-gray-900/50
                   transition-all duration-300
                   p-10 text-center"
      >
        <h1 className="text-4xl font-medium text-white mb-3">
          Smart Bookmark
        </h1>

        <p className="text-gray-400 mb-8 hover:text-gray-300 transition-colors">
          Save and manage your bookmarks securely
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-gray-800/50 py-3 rounded-xl
                     cursor-pointer
                     transition-all duration-200
                     hover:bg-gray-700/50
                     hover:border-gray-400
                     border border-gray-700/50
                     text-gray-200 hover:text-white
                     active:scale-95
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:bg-gray-800/50 disabled:hover:border-gray-700/50
                     disabled:active:scale-100"
        >
          {loading ? 'Redirecting...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}