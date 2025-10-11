'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const router = useRouter()

  // Load theme preference on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else {
        setIsDarkMode(
          window.matchMedia("(prefers-color-scheme: dark)").matches
        );
      }
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setMessage('')

  if (isSignUp && password !== confirmPassword) {
    setMessage('Passwords do not match!')
    setLoading(false)
    return
  }

  if (password.length < 6) {
    setMessage('Password must be at least 6 characters')
    setLoading(false)
    return
  }

  try {
    if (isSignUp) {
      // USE TEMPORARY BYPASS INSTEAD OF SUPABASE SIGNUP
      const response = await fetch('https://mini-drive-backend-mzyb.onrender.com/api/temp-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const result = await response.json();
      
      if (result.error) {
        setMessage(`Sign up failed: ${result.error}`);
      } else {
        setMessage('Sign up successful! You can now sign in.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      // LOGIN - Use regular Supabase (should work)
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`Login failed: ${error.message}`)
      } else if (signInData.user) {
        // Ensure profile exists by calling backend
        try {
          await fetch('https://mini-drive-backend-mzyb.onrender.com/api/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: signInData.user.id,
              email: email
            })
          });
        } catch (err) {
          console.log('Profile check failed, but login continues');
        }
        
        setMessage('Login successful! Redirecting...');
        setTimeout(() => router.push('/dashboard'), 1000);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    setMessage(`Error: ${errorMessage}`);
  } finally {
    setLoading(false)
  }
}

  return (
    <div className={`w-full max-w-md mx-4 sm:mx-auto p-6 sm:p-8 space-y-6 rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Header with Theme Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} text-center`}>
              Mini Drive
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-medium hidden sm:block`}>
              Secure File Management
            </p>
          </div>
        </div>
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors border ${
            isDarkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 border-gray-600' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border-gray-300'
          }`}
          aria-label="Toggle theme"
        >
          {isDarkMode ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>

      <div className="text-center pt-2 sm:pt-4">
        <p className={`font-medium text-sm sm:text-base ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="email" className={`block text-sm font-semibold mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium transition-all ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        <div>
          <label htmlFor="password" className={`block text-sm font-semibold mb-2 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium transition-all ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        {isSignUp && (
          <div>
            <label htmlFor="confirmPassword" className={`block text-sm font-semibold mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium transition-all ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium border ${
            message.includes('successful') 
              ? isDarkMode
                ? 'bg-green-900/30 text-green-300 border-green-800'
                : 'bg-green-100 text-green-800 border-green-200'
              : isDarkMode
              ? 'bg-red-900/30 text-red-300 border-red-800'
              : 'bg-red-100 text-red-800 border-red-200'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full px-4 py-3 text-white rounded-lg font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } ${isDarkMode ? 'shadow-blue-500/10' : ''}`}
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp)
            setMessage('')
            setPassword('')
            setConfirmPassword('')
          }}
          className={`text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors ${
            isDarkMode ? 'text-blue-400 hover:text-blue-300' : ''
          }`}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>

      <div className={`p-3 sm:p-4 text-xs sm:text-sm rounded-lg border ${
        isDarkMode 
          ? 'text-gray-400 bg-gray-700/50 border-gray-600' 
          : 'text-gray-600 bg-gray-50 border-gray-200'
      }`}>
        <p className={`font-semibold mb-1 sm:mb-2 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Demo Information:
        </p>
        <p>• Password must be 6+ characters</p>
        <p>• Use any email (no confirmation needed)</p>
        <p>• Try: test@example.com / test123</p>
      </div>
    </div>
  )
}