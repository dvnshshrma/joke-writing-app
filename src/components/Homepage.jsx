import { useNavigate } from 'react-router-dom'
import './Homepage.css'

function Homepage() {
  const navigate = useNavigate()

  return (
    <div className="homepage">
      <div className="homepage-container">
        <h1 className="app-title">Comedica</h1>
        <p className="app-subtitle">Your companion for writing jokes and managing sets</p>
        
        <div className="options-container">
          <button 
            className="option-card joke-option"
            onClick={() => navigate('/joke')}
          >
            <div className="option-icon">😄</div>
            <h2>Joke</h2>
            <p>Write, edit, and manage your jokes</p>
          </button>
          
          <button 
            className="option-card set-option"
            onClick={() => navigate('/set')}
          >
            <div className="option-icon">🎤</div>
            <h2>Set</h2>
            <p>Let's work on a set</p>
          </button>

          <button 
            className="option-card analysis-option"
            onClick={() => navigate('/analyze')}
          >
            <div className="option-icon">📊</div>
            <h2>Analyse your sets</h2>
            <p>Upload audio and analyze performance</p>
          </button>

          <button 
            className="option-card recommendations-option"
            onClick={() => navigate('/recommendations')}
          >
            <div className="option-icon">🎯</div>
            <h2>Recommendations</h2>
            <p>AI insights on your best jokes</p>
          </button>

          <button 
            className="option-card data-option"
            onClick={() => navigate('/data')}
          >
            <div className="option-icon">📦</div>
            <h2>Export / Import</h2>
            <p>Backup and restore your data</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Homepage

