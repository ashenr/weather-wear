import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { WardrobePage } from './pages/WardrobePage'
import { AddItemPage } from './pages/AddItemPage'
import { ItemDetailPage } from './pages/ItemDetailPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { AccountPage } from './pages/AccountPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary><DashboardPage /></ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wardrobe"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary><WardrobePage /></ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wardrobe/add"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary><AddItemPage /></ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wardrobe/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary><ItemDetailPage /></ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary><FeedbackPage /></ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary><AccountPage /></ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
