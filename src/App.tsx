import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import CardList from './pages/CardList'
import CardNew from './pages/CardNew'
import CardDetail from './pages/CardDetail'
import Review from './pages/Review'
import ReviewSession from './pages/ReviewSession'
import Stats from './pages/Stats'
import Login from './pages/Login'
import Register from './pages/Register'
import Settings from './pages/Settings'
import { useAuthStore } from './store/useAuthStore'

function App() {
  useEffect(() => {
    useAuthStore.getState().init()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="cards" element={<CardList />} />
        <Route path="cards/new" element={<CardNew />} />
        <Route path="cards/:id" element={<CardDetail />} />
        <Route path="review" element={<Review />} />
        <Route path="review/session" element={<ReviewSession />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App