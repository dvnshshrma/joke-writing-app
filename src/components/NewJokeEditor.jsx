import { useState, useEffect } from 'react'
import { jokesAPI } from '../services/api'
import './NewJokeEditor.css'

function NewJokeEditor({ joke, onBack, onSave }) {
  // Migrate old format to new format for backward compatibility
  const initializeSections = (joke) => {
    if (!joke) {
      return []
    }
    
    // If joke has old format (context/punchline as strings), convert to new format
    if (typeof joke.context === 'string' && joke.context) {
      const sections = []
      if (joke.context) {
        sections.push({ id: Date.now().toString(), type: 'context', text: joke.context })
      }
      if (joke.punchline) {
        sections.push({ id: (Date.now() + 1).toString(), type: 'punchline', text: joke.punchline })
      }
      return sections
    }
    
    // If joke has separate contexts/punchlines arrays (old new format), convert to ordered array
    if (joke.contexts || joke.punchlines) {
      const sections = []
      // Add contexts first, then punchlines (preserve old order if sections array doesn't exist)
      if (joke.contexts) {
        joke.contexts.forEach(ctx => {
          sections.push({ ...ctx, type: 'context' })
        })
      }
      if (joke.punchlines) {
        joke.punchlines.forEach(pl => {
          sections.push({ ...pl, type: 'punchline' })
        })
      }
      return sections
    }
    
    // If already in new ordered format
    return joke.sections || []
  }

  const initialSections = initializeSections(joke)
  
  const [header, setHeader] = useState(joke?.header || '')
  const [sections, setSections] = useState(initialSections)
  const [isDraft, setIsDraft] = useState(joke?.isDraft !== undefined ? joke.isDraft : true)
  const [comments, setComments] = useState(joke?.comments || {})
  const [activeCommentLine, setActiveCommentLine] = useState(null)
  const [strikethroughTexts, setStrikethroughTexts] = useState(joke?.strikethroughTexts || [])
  const [replacements, setReplacements] = useState(joke?.replacements || {})
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showAddMenu && !e.target.closest('.add-section-container')) {
        setShowAddMenu(false)
      }
    }

    if (showAddMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showAddMenu])

  const handleSave = async () => {
    try {
      const jokeData = {
        id: joke?.id || Date.now().toString(),
        header,
        sections,
        isDraft,
        comments,
        strikethroughTexts,
        replacements,
        createdAt: joke?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (joke?.id) {
        // Update existing joke
        await jokesAPI.update(joke.id, jokeData)
      } else {
        // Create new joke
        await jokesAPI.create(jokeData)
      }
      
      alert(isDraft ? 'Joke saved as draft!' : 'Joke finalized!')
      onSave()
    } catch (error) {
      console.error('Error saving joke:', error)
      alert('Failed to save joke. Please try again.')
    }
  }

  const addSection = (type) => {
    const newSection = {
      id: Date.now().toString(),
      type,
      text: ''
    }
    
    setSections([...sections, newSection])
    setShowAddMenu(false)
  }

  const updateSection = (id, text) => {
    setSections(sections.map(section => section.id === id ? { ...section, text } : section))
  }

  const deleteSection = (id) => {
    setSections(sections.filter(section => section.id !== id))
  }

  const toggleLineComment = (sectionType, sectionId, lineIndex) => {
    const key = `${sectionType}-${sectionId}-${lineIndex}`
    if (activeCommentLine === key) {
      setActiveCommentLine(null)
    } else {
      setActiveCommentLine(key)
    }
  }

  const addComment = (lineKey, comment) => {
    if (!comment.trim()) return
    
    const newComment = {
      id: Date.now().toString(),
      text: comment,
      timestamp: new Date().toISOString()
    }

    setComments(prev => ({
      ...prev,
      [lineKey]: [...(prev[lineKey] || []), newComment]
    }))
  }

  const toggleStrikethrough = (sectionType, sectionId, lineIndex, text) => {
    const key = `${sectionType}-${sectionId}-${lineIndex}`
    const exists = strikethroughTexts.find(st => st.key === key)
    
    if (exists) {
      setStrikethroughTexts(prev => prev.filter(st => st.key !== key))
      const { [key]: removed, ...rest } = replacements
      setReplacements(rest)
    } else {
      setStrikethroughTexts(prev => [...prev, { key, text, sectionType, sectionId, lineIndex }])
    }
  }

  const setReplacement = (key, replacementText) => {
    setReplacements(prev => ({
      ...prev,
      [key]: replacementText
    }))
  }

  const renderLine = (sectionType, sectionId, text, index) => {
    const key = `${sectionType}-${sectionId}-${index}`
    const isStrikethrough = strikethroughTexts.some(st => st.key === key)
    const replacement = replacements[key] || ''
    const lineComments = comments[key] || []

    return (
      <div key={index} className="joke-line-container">
        <div 
          className={`joke-line ${sectionType} ${isStrikethrough ? 'strikethrough' : ''}`}
          onClick={() => toggleLineComment(sectionType, sectionId, index)}
        >
          {text || <span className="placeholder-text">Click to add {sectionType}</span>}
        </div>
        
        {isStrikethrough && (
          <div className="replacement-section">
            <input
              type="text"
              className="replacement-input"
              placeholder="Replacement text..."
              value={replacement}
              onChange={(e) => setReplacement(key, e.target.value)}
            />
          </div>
        )}

        {activeCommentLine === key && (
          <div className="comments-panel">
            <div className="comments-list">
              {lineComments.length > 0 ? (
                lineComments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <p>{comment.text}</p>
                    <span className="comment-time">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="no-comments">No comments yet</p>
              )}
            </div>
            <div className="add-comment">
              <input
                type="text"
                className="comment-input"
                placeholder="Add a comment or feedback..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addComment(key, e.target.value)
                    e.target.value = ''
                  }
                }}
              />
            </div>
          </div>
        )}

        <button 
          className="strikethrough-btn"
          onClick={(e) => {
            e.stopPropagation()
            toggleStrikethrough(sectionType, sectionId, index, text)
          }}
          title="Strike through and replace"
        >
          {isStrikethrough ? '✓' : '⊘'}
        </button>
      </div>
    )
  }

  const renderSection = (section) => {
    const lines = section.text ? section.text.split('\n').filter(line => line.trim()) : []
    
    // Count how many sections of this type have appeared before this one (including this one)
    let sectionNumber = 0
    for (let i = 0; i <= sections.findIndex(s => s.id === section.id); i++) {
      if (sections[i].type === section.type) {
        sectionNumber++
      }
    }
    
    return (
      <div key={section.id} className="joke-section-item">
        <div className="section-header-actions">
          <h4 className="section-number">
            {section.type === 'context' ? 'Context' : 'Punchline'} #{sectionNumber}
          </h4>
          <button 
            className="delete-section-btn"
            onClick={() => deleteSection(section.id)}
            title="Delete this section"
          >
            ×
          </button>
        </div>
        <textarea
          className={`joke-textarea ${section.type}-text`}
          placeholder={section.type === 'context' ? 'Write the context/setup of your joke here...' : 'Write the punchline here...'}
          value={section.text}
          onChange={(e) => updateSection(section.id, e.target.value)}
        />
        {section.text && (
          <div className="lines-container">
            <p className="lines-hint">Click on lines below to add comments or strike through text</p>
            {lines.map((line, index) => 
              renderLine(section.type, section.id, line, index)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="new-joke-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <div className="editor-title">
          <span className="editor-mode-label">{joke ? '✏️ Editing Joke' : '✨ New Joke'}</span>
          <input
            type="text"
            className="joke-header-input"
            placeholder="Joke Header/Title..."
            value={header}
            onChange={(e) => setHeader(e.target.value)}
          />
        </div>
      </div>

      <div className="editor-body">
        <div className="sections-container">
          {sections.length === 0 && (
            <div className="no-sections-message">
              <p>Click the "+" button below to add your first Context or Punchline section</p>
            </div>
          )}
          {sections.map(section => renderSection(section))}
          
          <div className="add-section-container">
            <button 
              className="add-section-btn"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              +
            </button>
            {showAddMenu && (
              <div className="add-menu">
                <button 
                  className="add-menu-option"
                  onClick={() => addSection('context')}
                >
                  Add Context
                </button>
                <button 
                  className="add-menu-option"
                  onClick={() => addSection('punchline')}
                >
                  Add Punchline
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="editor-footer">
        <div className="save-options">
          <button 
            className={`save-btn ${isDraft ? 'active' : ''}`}
            onClick={() => setIsDraft(true)}
          >
            Save as Draft
          </button>
          <button 
            className={`save-btn ${!isDraft ? 'active finalise' : ''}`}
            onClick={() => setIsDraft(false)}
          >
            Finalise the Joke
          </button>
        </div>
        <button className="save-action-btn" onClick={handleSave}>
          {isDraft ? '💾 Save Draft' : '✅ Finalise & Save'}
        </button>
      </div>
    </div>
  )
}

export default NewJokeEditor

