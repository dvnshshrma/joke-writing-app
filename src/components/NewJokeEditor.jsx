import { useState } from 'react'
import './NewJokeEditor.css'

function NewJokeEditor({ joke, onBack, onSave }) {
  const [header, setHeader] = useState(joke?.header || '')
  const [context, setContext] = useState(joke?.context || '')
  const [punchline, setPunchline] = useState(joke?.punchline || '')
  const [isDraft, setIsDraft] = useState(joke?.isDraft !== undefined ? joke.isDraft : true)
  const [comments, setComments] = useState(joke?.comments || {})
  const [activeCommentLine, setActiveCommentLine] = useState(null)
  const [strikethroughTexts, setStrikethroughTexts] = useState(joke?.strikethroughTexts || [])
  const [replacements, setReplacements] = useState(joke?.replacements || {})

  const handleSave = () => {
    const jokeData = {
      id: joke?.id || Date.now().toString(),
      header,
      context,
      punchline,
      isDraft,
      comments,
      strikethroughTexts,
      replacements,
      createdAt: joke?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const savedJokes = JSON.parse(localStorage.getItem('comedica_jokes') || '[]')
    
    if (joke?.id) {
      // Update existing joke
      const index = savedJokes.findIndex(j => j.id === joke.id)
      if (index !== -1) {
        savedJokes[index] = jokeData
      }
    } else {
      // Add new joke
      savedJokes.push(jokeData)
    }
    
    localStorage.setItem('comedica_jokes', JSON.stringify(savedJokes))
    
    alert(isDraft ? 'Joke saved as draft!' : 'Joke finalized!')
    onSave()
  }

  const toggleLineComment = (lineType, lineIndex) => {
    const key = `${lineType}-${lineIndex}`
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

  const toggleStrikethrough = (lineType, lineIndex, text) => {
    const key = `${lineType}-${lineIndex}`
    const exists = strikethroughTexts.find(st => st.key === key)
    
    if (exists) {
      setStrikethroughTexts(prev => prev.filter(st => st.key !== key))
      const { [key]: removed, ...rest } = replacements
      setReplacements(rest)
    } else {
      setStrikethroughTexts(prev => [...prev, { key, text, lineType, lineIndex }])
    }
  }

  const setReplacement = (key, replacementText) => {
    setReplacements(prev => ({
      ...prev,
      [key]: replacementText
    }))
  }

  const renderLine = (lineType, text, index) => {
    const key = `${lineType}-${index}`
    const isStrikethrough = strikethroughTexts.some(st => st.key === key)
    const replacement = replacements[key] || ''
    const lineComments = comments[key] || []

    return (
      <div key={index} className="joke-line-container">
        <div 
          className={`joke-line ${lineType} ${isStrikethrough ? 'strikethrough' : ''}`}
          onClick={() => toggleLineComment(lineType, index)}
        >
          {text || <span className="placeholder-text">Click to add {lineType}</span>}
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
            toggleStrikethrough(lineType, index, text)
          }}
          title="Strike through and replace"
        >
          {isStrikethrough ? '✓' : '⊘'}
        </button>
      </div>
    )
  }

  const renderTextWithLines = (text, lineType) => {
    if (!text) return ['']
    const lines = text.split('\n')
    return lines
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
        <div className="joke-section">
          <h3 className="section-label">Context</h3>
          <textarea
            className="joke-textarea context-text"
            placeholder="Write the context/setup of your joke here..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          {context && (
            <div className="lines-container">
              <p className="lines-hint">Click on lines below to add comments or strike through text</p>
              {renderTextWithLines(context, 'context').map((line, index) => 
                line.trim() && renderLine('context', line, index)
              )}
            </div>
          )}
        </div>

        <div className="joke-section">
          <h3 className="section-label">Punchline</h3>
          <textarea
            className="joke-textarea punchline-text"
            placeholder="Write the punchline here..."
            value={punchline}
            onChange={(e) => setPunchline(e.target.value)}
          />
          {punchline && (
            <div className="lines-container">
              <p className="lines-hint">Click on lines below to add comments or strike through text</p>
              {renderTextWithLines(punchline, 'punchline').map((line, index) => 
                line.trim() && renderLine('punchline', line, index)
              )}
            </div>
          )}
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

