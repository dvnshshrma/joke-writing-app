import { useNavigate } from 'react-router-dom'
import './Set.css'

function LongSetEditor({ onBack }) {
  return (
    <div className="long-set-editor">
      <div className="editor-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2>Long Set Editor</h2>
      </div>
      
      <div className="editor-body">
        <p className="placeholder-text">Long set functionality coming soon...</p>
      </div>
    </div>
  )
}

export default LongSetEditor

