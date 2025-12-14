import { useNavigate } from 'react-router-dom'
import './Set.css'

function Set() {
  const navigate = useNavigate()

  return (
    <div className="set">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Let's work on a set</h1>
      </div>
      
      <div className="set-content">
        <p className="placeholder-text">Set management functionality will be implemented here...</p>
      </div>
    </div>
  )
}

export default Set

