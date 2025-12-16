import { useState, useEffect } from 'react'
import { jokesAPI } from '../services/api'
import './OneLinersList.css'

function OneLinersList({ onBack, onEdit }) {
  const [oneLiners, setOneLiners] = useState([])
  const [selectedOneLiner, setSelectedOneLiner] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'draft', 'final'

  useEffect(() => {
    loadOneLiners()
  }, [])

  const loadOneLiners = async () => {
    try {
      const allJokes = await jokesAPI.getAll()
      // Filter for one-liners (jokes with sections containing type 'oneline')
      const filtered = allJokes.filter(joke => {
        if (joke.sections && joke.sections.length > 0) {
          return joke.sections.some(s => s.type === 'oneline')
        }
        return false
      })
      setOneLiners(filtered)
    } catch (error) {
      console.error('Error loading one-liners:', error)
      const errorMessage = error.message || 'Unknown error'
      alert(`Unable to load one-liners: ${errorMessage}\n\nPlease ensure:\n1. Backend server is running\n2. You're connected to the internet`)
      setOneLiners([])
    }
  }

  const handleOneLinerClick = (oneLiner) => {
    setSelectedOneLiner(oneLiner)
  }

  const handleEditClick = (oneLiner) => {
    onEdit(oneLiner)
  }

  const handleDeleteOneLiner = async (oneLinerId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this one-liner?')) {
      try {
        await jokesAPI.delete(oneLinerId)
        const updated = oneLiners.filter(ol => ol.id !== oneLinerId)
        setOneLiners(updated)
        if (selectedOneLiner && selectedOneLiner.id === oneLinerId) {
          setSelectedOneLiner(null)
        }
        alert('✅ One-liner deleted successfully!')
      } catch (error) {
        console.error('Error deleting one-liner:', error)
        alert('Failed to delete one-liner. Please try again.')
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

  const getOneLinerText = (oneLiner) => {
    if (oneLiner.sections && oneLiner.sections.length > 0) {
      const onelineSection = oneLiner.sections.find(s => s.type === 'oneline')
      return onelineSection ? onelineSection.text : oneLiner.sections[0].text
    }
    return oneLiner.text || 'No text'
  }

  const filteredOneLiners = oneLiners.filter(oneLiner => {
    if (filter === 'draft') return oneLiner.isDraft
    if (filter === 'final') return !oneLiner.isDraft
    return true
  })

  return (
    <div className="one-liners-list">
      <div className="list-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Your One-Liners</h2>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({oneLiners.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'draft' ? 'active' : ''}`}
            onClick={() => setFilter('draft')}
          >
            Drafts ({oneLiners.filter(ol => ol.isDraft).length})
          </button>
          <button 
            className={`filter-btn ${filter === 'final' ? 'active' : ''}`}
            onClick={() => setFilter('final')}
          >
            Final ({oneLiners.filter(ol => !ol.isDraft).length})
          </button>
        </div>
        {oneLiners.length === 0 && <p className="no-one-liners">No one-liners yet. Write one!</p>}
      </div>

      <div className="one-liners-layout">
        <div className="one-liners-sidebar">
          {filteredOneLiners.length === 0 ? (
            <div className="empty-state">
              <p>No {filter === 'all' ? '' : filter} one-liners found.</p>
            </div>
          ) : (
            filteredOneLiners.map(oneLiner => (
              <div
                key={oneLiner.id}
                className={`one-liner-tab ${selectedOneLiner?.id === oneLiner.id ? 'active' : ''}`}
                onClick={() => handleOneLinerClick(oneLiner)}
              >
                <div className="one-liner-tab-header">
                  <p className="one-liner-text-preview">{getOneLinerText(oneLiner)}</p>
                  <button 
                    className="delete-btn"
                    onClick={(e) => handleDeleteOneLiner(oneLiner.id, e)}
                  >
                    ×
                  </button>
                </div>
                <div className="one-liner-tab-meta">
                  <span className={`status-badge ${oneLiner.isDraft ? 'draft' : 'final'}`}>
                    {oneLiner.isDraft ? 'Draft' : 'Final'}
                  </span>
                  <span className="one-liner-date">{formatDate(oneLiner.updatedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedOneLiner && (
          <div className="one-liner-detail">
            <div className="one-liner-detail-header">
              <h2>One-Liner</h2>
              <span className={`status-badge ${selectedOneLiner.isDraft ? 'draft' : 'final'}`}>
                {selectedOneLiner.isDraft ? 'Draft' : 'Final'}
              </span>
            </div>
            
            <div className="one-liner-detail-body">
              <p className="one-liner-full-text">{getOneLinerText(selectedOneLiner)}</p>
            </div>

            <div className="one-liner-detail-footer">
              <button className="edit-btn" onClick={() => handleEditClick(selectedOneLiner)}>
                ✏️ Edit One-Liner
              </button>
              <div className="one-liner-meta-info">
                <p>Created: {formatDate(selectedOneLiner.createdAt)}</p>
                <p>Updated: {formatDate(selectedOneLiner.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OneLinersList

