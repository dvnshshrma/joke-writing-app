import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NewJokeEditor from './NewJokeEditor'
import OldJokesList from './OldJokesList'
import './JokeWriting.css'

function JokeWriting() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('options') // 'options', 'new', 'old', 'edit'
  const [editingJoke, setEditingJoke] = useState(null)

  const handleViewChange = (view) => {
    setActiveView(view)
  }

  const handleEditJoke = (joke) => {
    setEditingJoke(joke)
    setActiveView('edit')
  }

  return (
    <div className="joke-writing">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Joke Writing</h1>
      </div>
      
      <div className="joke-writing-content">
        {activeView === 'options' && (
          <div className="joke-options">
            <button 
              className="joke-option-btn"
              onClick={() => {
                setEditingJoke(null)
                handleViewChange('new')
              }}
            >
              <div className="option-icon">✨</div>
              <h2>Write a new joke idea</h2>
              <p>Start creating a new joke from scratch</p>
            </button>
            
            <button 
              className="joke-option-btn"
              onClick={() => handleViewChange('old')}
            >
              <div className="option-icon">📝</div>
              <h2>Work on an old joke</h2>
              <p>Continue working on saved jokes</p>
            </button>
          </div>
        )}

        {(activeView === 'new' || activeView === 'edit') && (
          <NewJokeEditor 
            joke={editingJoke}
            onBack={() => {
              setEditingJoke(null)
              handleViewChange('options')
            }}
            onSave={() => {
              setEditingJoke(null)
              handleViewChange('old')
            }}
          />
        )}

        {activeView === 'old' && (
          <OldJokesList 
            onBack={() => handleViewChange('options')}
            onEdit={handleEditJoke}
          />
        )}
      </div>
    </div>
  )
}

export default JokeWriting

