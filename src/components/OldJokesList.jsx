import { useState, useEffect } from 'react'
import { jokesAPI } from '../services/api'
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

  const loadJokes = async () => {
    try {
      const savedJokes = await jokesAPI.getAll()
      setJokes(savedJokes)
    } catch (error) {
      console.error('Error loading jokes:', error)
      // Show helpful error message instead of falling back to empty localStorage
      const errorMessage = error.message || 'Unknown error'
      alert(`Unable to connect to server: ${errorMessage}\n\nPlease ensure:\n1. Backend server is running (npm start in server/ folder)\n2. You're on the same WiFi network\n3. Using the correct API URL\n\nYour jokes are saved in the cloud database and will load once connected.`)
      setJokes([]) // Don't show empty localStorage data
    }
  }

  const handleJokeClick = (joke) => {
    setSelectedJoke(joke)
  }

  const handleDeleteJoke = async (jokeId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this joke?')) {
      try {
        await jokesAPI.delete(jokeId)
        const updatedJokes = jokes.filter(joke => joke.id !== jokeId)
        setJokes(updatedJokes)
        if (selectedJoke && selectedJoke.id === jokeId) {
          setSelectedJoke(null)
        }
      } catch (error) {
        console.error('Error deleting joke:', error)
        alert('Failed to delete joke. Please try again.')
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

  const getJokePreview = (joke) => {
    // Handle new ordered format (sections array)
    if (joke.sections && joke.sections.length > 0) {
      const firstSection = joke.sections.find(s => s.type === 'context') || joke.sections[0]
      return firstSection.text ? firstSection.text.substring(0, 50) : 'No content...'
    }
    // Handle intermediate format (separate arrays)
    if (joke.contexts && joke.contexts.length > 0) {
      return joke.contexts[0].text.substring(0, 50)
    }
    // Handle old format (string)
    if (joke.context) {
      return joke.context.substring(0, 50)
    }
    return 'No content...'
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
                {getJokePreview(joke)}...
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
              {/* Handle new ordered format (sections array) */}
              {selectedJoke.sections && selectedJoke.sections.length > 0 && (
                selectedJoke.sections.map((section, index) => {
                  // Count how many sections of this type have appeared before this one (including this one)
                  let sectionNumber = 0
                  for (let i = 0; i <= index; i++) {
                    if (selectedJoke.sections[i].type === section.type) {
                      sectionNumber++
                    }
                  }
                  
                  return (
                    <div key={section.id || index} className="joke-section-detail">
                      <h3 className={`section-label-detail ${section.type}-label`}>
                        {section.type === 'context' ? 'Context' : 'Punchline'} #{sectionNumber}
                      </h3>
                      <p className={`joke-text-detail ${section.type}-text`}>{section.text}</p>
                    </div>
                  )
                })
              )}
              
              {/* Handle intermediate format (separate arrays) for backward compatibility */}
              {!selectedJoke.sections && selectedJoke.contexts && selectedJoke.contexts.length > 0 && (
                selectedJoke.contexts.map((context, index) => (
                  <div key={context.id || index} className="joke-section-detail">
                    <h3 className="section-label-detail context-label">
                      Context #{index + 1}
                    </h3>
                    <p className="joke-text-detail context-text">{context.text}</p>
                  </div>
                ))
              )}
              
              {!selectedJoke.sections && selectedJoke.punchlines && selectedJoke.punchlines.length > 0 && (
                selectedJoke.punchlines.map((punchline, index) => (
                  <div key={punchline.id || index} className="joke-section-detail">
                    <h3 className="section-label-detail punchline-label">
                      Punchline #{index + 1}
                    </h3>
                    <p className="joke-text-detail punchline-text">{punchline.text}</p>
                  </div>
                ))
              )}
              
              {/* Handle old format (strings) for backward compatibility */}
              {!selectedJoke.sections && !selectedJoke.contexts && selectedJoke.context && (
                <div className="joke-section-detail">
                  <h3 className="section-label-detail context-label">Context</h3>
                  <p className="joke-text-detail context-text">{selectedJoke.context}</p>
                </div>
              )}

              {!selectedJoke.sections && !selectedJoke.punchlines && selectedJoke.punchline && (
                <div className="joke-section-detail">
                  <h3 className="section-label-detail punchline-label">Punchline</h3>
                  <p className="joke-text-detail punchline-text">{selectedJoke.punchline}</p>
                </div>
              )}
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

