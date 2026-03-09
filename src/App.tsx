import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { WardrobePage } from './pages/WardrobePage'
import { AddItemPage } from './pages/AddItemPage'
import { ItemDetailPage } from './pages/ItemDetailPage'
import { FeedbackPage } from './pages/FeedbackPage'

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
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wardrobe"
            element={
              <ProtectedRoute>
                <Layout>
                  <WardrobePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wardrobe/add"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddItemPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wardrobe/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ItemDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Layout>
                  <FeedbackPage />
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
