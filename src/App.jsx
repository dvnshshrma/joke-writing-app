import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Homepage from './components/Homepage'
import JokeWriting from './components/JokeWriting'
import Set from './components/Set'
import Analysis from './components/Analysis'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/joke" element={<JokeWriting />} />
          <Route path="/set" element={<Set />} />
          <Route path="/analyze" element={<Analysis />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

