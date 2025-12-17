import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Homepage from './components/Homepage'
import JokeWriting from './components/JokeWriting'
import Set from './components/Set'
import Analysis from './components/Analysis'
import JokeRecommendations from './components/JokeRecommendations'
import DataManager from './components/DataManager'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/joke/*" element={<JokeWriting />} />
          <Route path="/set/*" element={<Set />} />
          <Route path="/analyze" element={<Analysis />} />
          <Route path="/recommendations" element={<JokeRecommendations />} />
          <Route path="/data" element={<DataManager />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

