import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Homepage from './components/Homepage'
import JokeWriting from './components/JokeWriting'
import Set from './components/Set'
import Analysis from './components/Analysis'
import JokeRecommendations from './components/JokeRecommendations'
import DataManager from './components/DataManager'
import ComedyStyle from './components/ComedyStyle'
import Auth from './components/Auth'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading, isAuthEnabled } = useAuth()
  
  // If auth is not configured, allow access
  if (!isAuthEnabled) return children
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <span className="loading-icon">🎤</span>
          <p>Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Auth />
  }
  
  return children
}

function AppContent() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Homepage /></ProtectedRoute>} />
          <Route path="/joke/*" element={<ProtectedRoute><JokeWriting /></ProtectedRoute>} />
          <Route path="/set/*" element={<ProtectedRoute><Set /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><JokeRecommendations /></ProtectedRoute>} />
          <Route path="/data" element={<ProtectedRoute><DataManager /></ProtectedRoute>} />
          <Route path="/comedy-style" element={<ProtectedRoute><ComedyStyle /></ProtectedRoute>} />
          <Route path="/login" element={<Auth />} />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

