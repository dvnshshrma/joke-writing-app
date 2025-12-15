import { useState, useEffect } from 'react'
import './OldJokesList.css'

function OldJokesList({ onBack, onEdit }) {
  const [jokes, setJokes] = useState([])
  const [selectedJoke, setSelectedJoke] = useState(null)

  const handleEditClick = (joke) => {
    onEdit(joke)
  }

  useEffect(() => {
    loadJokes()
  }, [])

  const loadJokes = () => {
    const savedJokes = JSON.parse(localStorage.getItem('comedica_jokes') || '[]')
    setJokes(savedJokes)
  }

  const handleJokeClick = (joke) => {
    setSelectedJoke(joke)
  }

  const handleDeleteJoke = (jokeId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this joke?')) {
      const updatedJokes = jokes.filter(joke => joke.id !== jokeId)
      localStorage.setItem('comedica_jokes', JSON.stringify(updatedJokes))
      setJokes(updatedJokes)
      if (selectedJoke && selectedJoke.id === jokeId) {
        setSelectedJoke(null)
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="old-jokes-list">
      <div className="list-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Your Saved Jokes</h2>
        {jokes.length === 0 && <p className="no-jokes">No saved jokes yet. Start writing one!</p>}
      </div>

      <div className="jokes-layout">
        <div className="jokes-sidebar">
          {jokes.map(joke => (
            <div
              key={joke.id}
              className={`joke-tab ${selectedJoke?.id === joke.id ? 'active' : ''}`}
              onClick={() => handleJokeClick(joke)}
            >
              <div className="joke-tab-header">
                <h3>{joke.header || 'Untitled Joke'}</h3>
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDeleteJoke(joke.id, e)}
                >
                  ×
                </button>
              </div>
              <div className="joke-tab-meta">
                <span className={`status-badge ${joke.isDraft ? 'draft' : 'final'}`}>
                  {joke.isDraft ? 'Draft' : 'Final'}
                </span>
                <span className="joke-date">{formatDate(joke.updatedAt)}</span>
              </div>
              <p className="joke-preview">
                {joke.context.substring(0, 50)}...
              </p>
            </div>
          ))}
        </div>

        {selectedJoke && (
          <div className="joke-detail">
            <div className="joke-detail-header">
              <h2>{selectedJoke.header || 'Untitled Joke'}</h2>
              <span className={`status-badge ${selectedJoke.isDraft ? 'draft' : 'final'}`}>
                {selectedJoke.isDraft ? 'Draft' : 'Final'}
              </span>
            </div>
            
            <div className="joke-detail-body">
              <div className="joke-section-detail">
                <h3 className="section-label-detail context-label">Context</h3>
                <p className="joke-text-detail context-text">{selectedJoke.context}</p>
              </div>

              <div className="joke-section-detail">
                <h3 className="section-label-detail punchline-label">Punchline</h3>
                <p className="joke-text-detail punchline-text">{selectedJoke.punchline}</p>
              </div>
            </div>

            <div className="joke-detail-footer">
              <button className="edit-btn" onClick={() => handleEditClick(selectedJoke)}>
                ✏️ Edit Joke
              </button>
              <div className="joke-meta-info">
                <p>Created: {formatDate(selectedJoke.createdAt)}</p>
                <p>Updated: {formatDate(selectedJoke.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OldJokesList

