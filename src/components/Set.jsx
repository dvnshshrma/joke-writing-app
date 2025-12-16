import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ShortSetEditor from './ShortSetEditor'
import LongSetEditor from './LongSetEditor'
import SavedSetsList from './SavedSetsList'
import './Set.css'

function Set() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('options') // 'options', 'short', 'long', 'saved', 'edit'
  const [editingSet, setEditingSet] = useState(null)

  const handleEditSet = (set) => {
    setEditingSet(set)
    setActiveView(set.type === 'short' ? 'short' : 'long')
  }

  const handleSetSaved = () => {
    setEditingSet(null)
    setActiveView('options')
  }

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
              onClick={() => {
                setEditingSet(null)
                setActiveView('short')
              }}
            >
              <div className="option-icon">🎤</div>
              <h2>Short Set</h2>
              <p>For open mics - quick sets with selected jokes</p>
            </button>
            
            <button 
              className="set-option-btn long-set"
              onClick={() => {
                setEditingSet(null)
                setActiveView('long')
              }}
            >
              <div className="option-icon">🎭</div>
              <h2>Long Set</h2>
              <p>Full-length sets for longer performances</p>
            </button>

            <button 
              className="set-option-btn saved-sets"
              onClick={() => setActiveView('saved')}
            >
              <div className="option-icon">📚</div>
              <h2>Saved Sets</h2>
              <p>View and edit your saved sets</p>
            </button>
          </div>
        )}

        {activeView === 'short' && (
          <ShortSetEditor 
            onBack={() => {
              setEditingSet(null)
              setActiveView('options')
            }}
            editingSet={editingSet}
            onSave={handleSetSaved}
          />
        )}

        {activeView === 'long' && (
          <LongSetEditor 
            onBack={() => {
              setEditingSet(null)
              setActiveView('options')
            }}
            editingSet={editingSet}
            onSave={handleSetSaved}
          />
        )}

        {activeView === 'saved' && (
          <SavedSetsList 
            onBack={() => setActiveView('options')}
            onEdit={handleEditSet}
          />
        )}
      </div>
    </div>
  )
}

export default Set

