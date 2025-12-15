import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ShortSetEditor from './ShortSetEditor'
import LongSetEditor from './LongSetEditor'
import './Set.css'

function Set() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('options') // 'options', 'short', 'long'

  return (
    <div className="set">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Let's work on a set</h1>
      </div>
      
      <div className="set-content">
        {activeView === 'options' && (
          <div className="set-options">
            <button 
              className="set-option-btn short-set"
              onClick={() => setActiveView('short')}
            >
              <div className="option-icon">🎤</div>
              <h2>Short Set</h2>
              <p>For open mics - quick sets with selected jokes</p>
            </button>
            
            <button 
              className="set-option-btn long-set"
              onClick={() => setActiveView('long')}
            >
              <div className="option-icon">🎭</div>
              <h2>Long Set</h2>
              <p>Full-length sets for longer performances</p>
            </button>
          </div>
        )}

        {activeView === 'short' && (
          <ShortSetEditor 
            onBack={() => setActiveView('options')}
          />
        )}

        {activeView === 'long' && (
          <LongSetEditor 
            onBack={() => setActiveView('options')}
          />
        )}
      </div>
    </div>
  )
}

export default Set

