import { useState, useEffect } from 'react'
import { jokesAPI } from '../services/api'
import { setsAPI } from '../services/setsAPI'
import './ShortSetEditor.css'

function ShortSetEditor({ onBack }) {
  const [header, setHeader] = useState('')
  const [availableJokes, setAvailableJokes] = useState([])
  const [selectedJokes, setSelectedJokes] = useState([])
  const [showJokeSelector, setShowJokeSelector] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJokes()
  }, [])

  const loadJokes = async () => {
    try {
      setLoading(true)
      const jokes = await jokesAPI.getAll()
      setAvailableJokes(jokes)
    } catch (error) {
      console.error('Error loading jokes:', error)
      alert('Failed to load jokes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddJoke = (joke) => {
    // Check if joke is already added
    if (selectedJokes.find(j => j.id === joke.id)) {
      return
    }
    
    setSelectedJokes([...selectedJokes, joke])
    setShowJokeSelector(false)
  }

  const handleRemoveJoke = (jokeId) => {
    setSelectedJokes(selectedJokes.filter(j => j.id !== jokeId))
  }

  const handleMoveJoke = (index, direction) => {
    const newJokes = [...selectedJokes]
    if (direction === 'up' && index > 0) {
      [newJokes[index - 1], newJokes[index]] = [newJokes[index], newJokes[index - 1]]
    } else if (direction === 'down' && index < newJokes.length - 1) {
      [newJokes[index], newJokes[index + 1]] = [newJokes[index + 1], newJokes[index]]
    }
    setSelectedJokes(newJokes)
  }

  const handleSave = async () => {
    if (!header.trim()) {
      alert('Please enter a header (bigger idea) for your set')
      return
    }

    if (selectedJokes.length === 0) {
      alert('Please add at least one joke to your set')
      return
    }

    try {
      const setData = {
        id: Date.now().toString(),
        header,
        type: 'short',
        jokes: selectedJokes.map(j => j.id),
        jokeDetails: selectedJokes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setsAPI.create(setData)
      alert('✅ Set saved successfully!')
      onBack()
    } catch (error) {
      console.error('Error saving set:', error)
      alert('Failed to save set. Please try again.')
    }
  }

  const renderJokePreview = (joke) => {
    const sections = joke.sections || []
    const contextSections = sections.filter(s => s.type === 'context')
    const punchlineSections = sections.filter(s => s.type === 'punchline')
    
    return (
      <div className="joke-preview-card">
        <div className="joke-preview-header">
          <h4>{joke.header || 'Untitled Joke'}</h4>
          <span className={`status-badge ${joke.isDraft ? 'draft' : 'final'}`}>
            {joke.isDraft ? 'Draft' : 'Final'}
          </span>
        </div>
        {contextSections.length > 0 && (
          <div className="joke-preview-section">
            <strong>Context:</strong>
            {contextSections.map((ctx, idx) => (
              <p key={ctx.id || idx}>{ctx.text.substring(0, 100)}...</p>
            ))}
          </div>
        )}
        {punchlineSections.length > 0 && (
          <div className="joke-preview-section">
            <strong>Punchline:</strong>
            {punchlineSections.map((pl, idx) => (
              <p key={pl.id || idx}>{pl.text.substring(0, 100)}...</p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="short-set-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Short Set Editor</h2>
      </div>

      <div className="editor-body">
        <div className="set-header-section">
          <label className="header-label">
            <span className="label-text">Bigger Idea / Set Header</span>
            <input
              type="text"
              className="set-header-input"
              placeholder="What's the bigger idea behind this set?"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
            />
          </label>
        </div>

        <div className="joke-selection-section">
          <div className="section-header">
            <h3>Selected Jokes ({selectedJokes.length})</h3>
            <button 
              className="add-joke-btn"
              onClick={() => setShowJokeSelector(!showJokeSelector)}
            >
              + Add Joke
            </button>
          </div>

          {showJokeSelector && (
            <div className="joke-selector">
              <div className="selector-header">
                <h4>Select a Joke to Add</h4>
                <button 
                  className="close-selector"
                  onClick={() => setShowJokeSelector(false)}
                >
                  ×
                </button>
              </div>
              {loading ? (
                <p>Loading jokes...</p>
              ) : availableJokes.length === 0 ? (
                <p>No jokes available. Create some jokes first!</p>
              ) : (
                <div className="available-jokes-list">
                  {availableJokes
                    .filter(joke => !selectedJokes.find(j => j.id === joke.id))
                    .map(joke => (
                      <div 
                        key={joke.id} 
                        className="available-joke-item"
                        onClick={() => handleAddJoke(joke)}
                      >
                        {renderJokePreview(joke)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {selectedJokes.length === 0 ? (
            <div className="empty-state">
              <p>No jokes added yet. Click "+ Add Joke" to get started!</p>
            </div>
          ) : (
            <div className="selected-jokes-list">
              {selectedJokes.map((joke, index) => (
                <div key={joke.id} className="selected-joke-item">
                  <div className="joke-order-controls">
                    <button
                      className="move-btn"
                      onClick={() => handleMoveJoke(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <span className="joke-number">{index + 1}</span>
                    <button
                      className="move-btn"
                      onClick={() => handleMoveJoke(index, 'down')}
                      disabled={index === selectedJokes.length - 1}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="joke-content">
                    {renderJokePreview(joke)}
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveJoke(joke.id)}
                    title="Remove joke"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="editor-footer">
        <button className="save-btn" onClick={handleSave}>
          💾 Save Set
        </button>
      </div>
    </div>
  )
}

export default ShortSetEditor

