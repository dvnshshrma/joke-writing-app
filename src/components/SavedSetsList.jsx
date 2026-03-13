import { useState, useEffect, useRef } from 'react'
import { setsAPI } from '../services/setsAPI'
import './SavedSetsList.css'

function SavedSetsList({ onBack, onEdit }) {
  const [sets, setSets] = useState([])
  const [selectedSet, setSelectedSet] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'draft', 'final'

  // Run-through mode state
  const [runThroughSet, setRunThroughSet] = useState(null)
  const [runThroughIndex, setRunThroughIndex] = useState(0)
  const [runThroughNotes, setRunThroughNotes] = useState({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    loadSets()
  }, [])

  const loadSets = async () => {
    try {
      const savedSets = await setsAPI.getAll()
      setSets(savedSets)
    } catch (error) {
      console.error('Error loading sets:', error)
      const errorMessage = error.message || 'Unknown error'
      alert(`Unable to load sets: ${errorMessage}\n\nPlease ensure:\n1. Backend server is running\n2. You're connected to the internet`)
      setSets([])
    }
  }

  // Run-through helpers
  const startRunThrough = (set, e) => {
    e.stopPropagation()
    const jokes = set.jokeDetails || []
    // Pre-load notes from localStorage
    const notes = {}
    jokes.forEach(joke => {
      const saved = localStorage.getItem(`comedica-runthrough-notes-${set.id}-${joke.id}`)
      if (saved !== null) notes[joke.id] = saved
    })
    setRunThroughNotes(notes)
    setRunThroughSet(set)
    setRunThroughIndex(0)
    setElapsedSeconds(0)

    // Start timer
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1)
    }, 1000)
  }

  const exitRunThrough = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setRunThroughSet(null)
    setRunThroughIndex(0)
    setElapsedSeconds(0)
  }

  const runThroughNext = () => {
    if (!runThroughSet) return
    const jokes = runThroughSet.jokeDetails || []
    setRunThroughIndex(i => Math.min(i + 1, jokes.length - 1))
  }

  const runThroughPrev = () => {
    setRunThroughIndex(i => Math.max(i - 1, 0))
  }

  const handleRunThroughNoteChange = (jokeId, value) => {
    setRunThroughNotes(prev => ({ ...prev, [jokeId]: value }))
    if (runThroughSet) {
      localStorage.setItem(`comedica-runthrough-notes-${runThroughSet.id}-${jokeId}`, value)
    }
  }

  const formatElapsed = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Keyboard support for run-through mode
  useEffect(() => {
    if (!runThroughSet) return
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') runThroughNext()
      else if (e.key === 'ArrowLeft') runThroughPrev()
      else if (e.key === 'Escape') exitRunThrough()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [runThroughSet, runThroughIndex])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSetClick = (set) => {
    setSelectedSet(set)
  }

  const handleEditClick = (set) => {
    onEdit(set)
  }

  const handleDeleteSet = async (setId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this set?')) {
      try {
        await setsAPI.delete(setId)
        const updatedSets = sets.filter(set => set.id !== setId)
        setSets(updatedSets)
        if (selectedSet && selectedSet.id === setId) {
          setSelectedSet(null)
        }
        alert('✅ Set deleted successfully!')
      } catch (error) {
        console.error('Error deleting set:', error)
        alert('Failed to delete set. Please try again.')
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

  const filteredSets = sets.filter(set => {
    if (filter === 'draft') return set.isDraft
    if (filter === 'final') return !set.isDraft
    return true
  })

  return (
    <div className="saved-sets-list">
      <div className="list-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Your Saved Sets</h2>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({sets.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            Drafts ({sets.filter(s => s.isDraft).length})
          </button>
          <button 
            className={`filter-btn ${filter === 'final' ? 'active' : ''}`}
            onClick={() => setFilter('final')}
          >
            Final ({sets.filter(s => !s.isDraft).length})
          </button>
        </div>
        {sets.length === 0 && <p className="no-sets">No saved sets yet. Create one!</p>}
      </div>

      <div className="sets-layout">
        <div className="sets-sidebar">
          {filteredSets.length === 0 ? (
            <div className="empty-state">
              <p>No {filter === 'all' ? '' : filter} sets found.</p>
            </div>
          ) : (
            filteredSets.map(set => (
              <div
                key={set.id}
                className={`set-tab ${selectedSet?.id === set.id ? 'active' : ''}`}
                onClick={() => handleSetClick(set)}
              >
                <div className="set-tab-header">
                  <h3>{set.header || 'Untitled Set'}</h3>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDeleteSet(set.id, e)}
                  >
                    ×
                  </button>
                </div>
                <div className="set-tab-meta">
                  <span className={`status-badge ${set.isDraft ? 'draft' : 'final'}`}>
                    {set.isDraft ? 'Draft' : 'Final'}
                  </span>
                  <span className="set-type-badge">{set.type === 'short' ? '🎤 Short' : '🎭 Long'}</span>
                  <span className="set-date">{formatDate(set.updatedAt)}</span>
                </div>
                <p className="set-preview">
                  {set.jokes && set.jokes.length > 0
                    ? `${set.jokes.length} joke${set.jokes.length !== 1 ? 's' : ''}`
                    : 'No jokes added'}
                </p>
                {set.jokeDetails && set.jokeDetails.length > 0 && (
                  <button
                    className="runthrough-btn"
                    onClick={(e) => startRunThrough(set, e)}
                    title="Run Through this set"
                  >
                    ▶ Run Through
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {selectedSet && (
          <div className="set-detail">
            <div className="set-detail-header">
              <h2>{selectedSet.header || 'Untitled Set'}</h2>
              <div className="set-detail-badges">
                <span className={`status-badge ${selectedSet.isDraft ? 'draft' : 'final'}`}>
                  {selectedSet.isDraft ? 'Draft' : 'Final'}
                </span>
                <span className="set-type-badge">{selectedSet.type === 'short' ? '🎤 Short Set' : '🎭 Long Set'}</span>
              </div>
            </div>
            
            <div className="set-detail-body">
              {selectedSet.jokeDetails && selectedSet.jokeDetails.length > 0 ? (
                <div className="set-jokes-list">
                  {selectedSet.jokeDetails.map((joke, index) => (
                    <div key={joke.id || index} className="set-joke-item">
                      <div className="joke-number-badge">{index + 1}</div>
                      <div className="joke-content">
                        <h4>{joke.header || 'Untitled Joke'}</h4>
                        {selectedSet.transitions && selectedSet.transitions[index] && (
                          <div className="transition-display">
                            <strong>Transition:</strong> {selectedSet.transitions[index]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-jokes-message">No jokes in this set.</p>
              )}
            </div>

            <div className="set-detail-footer">
              <button className="edit-btn" onClick={() => handleEditClick(selectedSet)}>
                ✏️ Edit Set
              </button>
              <div className="set-meta-info">
                <p>Created: {formatDate(selectedSet.createdAt)}</p>
                <p>Updated: {formatDate(selectedSet.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Run-through overlay */}
      {runThroughSet && (() => {
        const jokes = runThroughSet.jokeDetails || []
        const joke = jokes[runThroughIndex]
        if (!joke) return null
        const sections = joke.sections || []
        const noteValue = runThroughNotes[joke.id] || ''

        return (
          <div className="runthrough-overlay" role="dialog" aria-modal="true">
            <div className="runthrough-topbar">
              <span className="runthrough-set-title">{runThroughSet.header || 'Untitled Set'}</span>
              <span className="runthrough-timer">{formatElapsed(elapsedSeconds)}</span>
              <button className="runthrough-exit" onClick={exitRunThrough} title="Exit (Esc)">
                ✕ Exit
              </button>
            </div>

            <div className="runthrough-card">
              <div className="runthrough-joke-meta">
                Joke {runThroughIndex + 1} of {jokes.length}
              </div>
              <h2 className="runthrough-joke-header">{joke.header || 'Untitled Joke'}</h2>

              <div className="runthrough-sections">
                {sections.length > 0 ? (
                  sections.map((section, idx) => (
                    <div key={section.id || idx} className={`runthrough-section runthrough-section--${section.type}`}>
                      <span className="runthrough-section-label">
                        {section.type === 'context' ? 'Context' : 'Punchline'}
                      </span>
                      <p className="runthrough-section-text">{section.text}</p>
                    </div>
                  ))
                ) : (
                  <>
                    {joke.context && (
                      <div className="runthrough-section runthrough-section--context">
                        <span className="runthrough-section-label">Context</span>
                        <p className="runthrough-section-text">{joke.context}</p>
                      </div>
                    )}
                    {joke.punchline && (
                      <div className="runthrough-section runthrough-section--punchline">
                        <span className="runthrough-section-label">Punchline</span>
                        <p className="runthrough-section-text">{joke.punchline}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="runthrough-notes-section">
                <label className="runthrough-notes-label">Notes for this joke</label>
                <textarea
                  className="runthrough-notes-input"
                  placeholder='e.g. "slow down on punchline", "remember callback"'
                  value={noteValue}
                  onChange={(e) => handleRunThroughNoteChange(joke.id, e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="runthrough-nav">
              <button
                className="runthrough-nav-btn"
                onClick={runThroughPrev}
                disabled={runThroughIndex === 0}
              >
                ← Prev
              </button>
              <span className="runthrough-progress">
                {runThroughIndex + 1} / {jokes.length}
              </span>
              <button
                className="runthrough-nav-btn"
                onClick={runThroughNext}
                disabled={runThroughIndex === jokes.length - 1}
              >
                Next →
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default SavedSetsList

