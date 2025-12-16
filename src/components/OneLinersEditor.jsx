import { useState, useEffect } from 'react'
import { jokesAPI } from '../services/api'
import './OneLinersEditor.css'

function OneLinersEditor({ oneLiner, onBack, onSave, onViewSaved }) {
  const [text, setText] = useState('')
  const [isDraft, setIsDraft] = useState(true)

  useEffect(() => {
    if (oneLiner) {
      // Load one-liner data
      if (oneLiner.sections && oneLiner.sections.length > 0) {
        setText(oneLiner.sections[0].text || '')
      } else if (oneLiner.text) {
        setText(oneLiner.text)
      }
      setIsDraft(oneLiner.isDraft !== undefined ? oneLiner.isDraft : true)
    }
  }, [oneLiner])

  const handleSave = async (saveAsDraft = false) => {
    if (!text.trim()) {
      alert('Please enter a one-liner joke')
      return
    }

    try {
      // Store one-liner as a joke with section type 'oneline'
      const jokeData = {
        id: oneLiner?.id || Date.now().toString(),
        header: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        sections: [{ id: Date.now().toString(), type: 'oneline', text: text.trim() }],
        isDraft: saveAsDraft,
        createdAt: oneLiner?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (oneLiner) {
        await jokesAPI.update(oneLiner.id, jokeData)
        alert(saveAsDraft ? '✅ One-liner updated as draft!' : '✅ One-liner finalised!')
      } else {
        await jokesAPI.create(jokeData)
        alert(saveAsDraft ? '✅ One-liner saved as draft!' : '✅ One-liner finalised!')
      }

      if (onSave) {
        onSave()
      } else {
        onBack()
      }
    } catch (error) {
      console.error('Error saving one-liner:', error)
      alert('Failed to save one-liner. Please try again.')
    }
  }

  return (
    <div className="one-liners-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>{oneLiner ? 'Edit One-Liner' : 'Write a One-Liner'}</h2>
        {!oneLiner && onViewSaved && (
          <button className="view-saved-btn" onClick={onViewSaved}>
            📚 View Saved
          </button>
        )}
      </div>

      <div className="editor-body">
        <div className="one-liner-input-section">
          <label className="input-label">
            <span className="label-text">Your One-Liner</span>
            <textarea
              className="one-liner-textarea"
              placeholder="Write your one-liner joke here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="char-count">{text.length} characters</div>
          </label>
        </div>

        <div className="help-section">
          <p className="help-text">
            💡 <strong>Tip:</strong> One-liners are quick, punchy jokes that deliver the setup and punchline in a single line.
          </p>
        </div>
      </div>

      <div className="editor-footer">
        <button 
          className="save-draft-btn" 
          onClick={() => handleSave(true)}
        >
          💾 Save as Draft
        </button>
        <button 
          className="finalise-btn" 
          onClick={() => handleSave(false)}
        >
          ✅ Finalise
        </button>
      </div>
    </div>
  )
}

export default OneLinersEditor

