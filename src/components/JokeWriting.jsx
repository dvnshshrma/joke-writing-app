import { useNavigate } from 'react-router-dom'
import './JokeWriting.css'

function JokeWriting() {
  const navigate = useNavigate()

  return (
    <div className="joke-writing">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Joke Writing</h1>
      </div>
      
      <div className="joke-writing-content">
        <p className="placeholder-text">Joke writing functionality will be implemented here...</p>
      </div>
    </div>
  )
}

export default JokeWriting

