import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthCallback } from '@/pages/AuthCallback'
import App from './App.tsx'
import { ShelfPage } from './components/shelf-page'
import { LoginForm } from './components/sign-in.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/sign-in" element={<LoginForm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shelf"
            element={
              <ProtectedRoute>
                <ShelfPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

