import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { jokesAPI } from '../services/api'
import { setsAPI } from '../services/setsAPI'
import { analysisAPI } from '../services/analysisAPI'
import './DataManager.css'

function DataManager() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [activeTab, setActiveTab] = useState('export')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    jokes: true,
    sets: true,
    analyses: true,
    oneLiners: true
  })
  const [importPreview, setImportPreview] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {}
      }

      if (exportOptions.jokes) {
        const jokes = await jokesAPI.getAll()
        exportData.data.jokes = jokes.filter(j => !j.isOneLiner)
      }
      
      if (exportOptions.oneLiners) {
        const jokes = await jokesAPI.getAll()
        exportData.data.oneLiners = jokes.filter(j => j.isOneLiner)
      }

      if (exportOptions.sets) {
        exportData.data.sets = await setsAPI.getAll()
      }

      if (exportOptions.analyses) {
        exportData.data.analyses = await analysisAPI.getAll()
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comedica-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setImportResult({
        success: true,
        message: 'Export completed successfully!',
        details: {
          jokes: exportData.data.jokes?.length || 0,
          oneLiners: exportData.data.oneLiners?.length || 0,
          sets: exportData.data.sets?.length || 0,
          analyses: exportData.data.analyses?.length || 0
        }
      })
    } catch (err) {
      setError('Failed to export data: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        
        // Validate structure
        if (!data.version || !data.data) {
          throw new Error('Invalid backup file format')
        }

        setImportPreview({
          file: file.name,
          exportedAt: data.exportedAt,
          version: data.version,
          counts: {
            jokes: data.data.jokes?.length || 0,
            oneLiners: data.data.oneLiners?.length || 0,
            sets: data.data.sets?.length || 0,
            analyses: data.data.analyses?.length || 0
          },
          rawData: data
        })
        setError(null)
      } catch (err) {
        setError('Invalid file format: ' + err.message)
        setImportPreview(null)
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importPreview?.rawData) return

    setIsImporting(true)
    setError(null)
    
    const results = { jokes: 0, oneLiners: 0, sets: 0, analyses: 0, errors: [] }
    const data = importPreview.rawData.data

    try {
      // Import jokes
      if (data.jokes) {
        for (const joke of data.jokes) {
          try {
            await jokesAPI.create({
              ...joke,
              id: undefined, // Let server generate new ID
              importedAt: new Date().toISOString()
            })
            results.jokes++
          } catch (e) {
            results.errors.push(`Joke "${joke.header}": ${e.message}`)
          }
        }
      }

      // Import one-liners
      if (data.oneLiners) {
        for (const oneLiner of data.oneLiners) {
          try {
            await jokesAPI.create({
              ...oneLiner,
              id: undefined,
              importedAt: new Date().toISOString()
            })
            results.oneLiners++
          } catch (e) {
            results.errors.push(`One-liner "${oneLiner.header}": ${e.message}`)
          }
        }
      }

      // Import sets
      if (data.sets) {
        for (const set of data.sets) {
          try {
            await setsAPI.create({
              ...set,
              id: undefined,
              importedAt: new Date().toISOString()
            })
            results.sets++
          } catch (e) {
            results.errors.push(`Set "${set.header}": ${e.message}`)
          }
        }
      }

      // Note: Analyses are read-only imports (for reference)
      if (data.analyses) {
        results.analyses = data.analyses.length
        results.errors.push('Note: Analyses are exported for backup only and cannot be re-imported')
      }

      setImportResult({
        success: true,
        message: 'Import completed!',
        details: results
      })
      setImportPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setError('Import failed: ' + err.message)
    } finally {
      setIsImporting(false)
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="data-manager">
      <div className="data-manager-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>📦 Data Manager</h1>
        <p>Export your data for backup or import from a previous backup</p>
      </div>

      <div className="dm-tabs">
        <button 
          className={`dm-tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📤 Export Data
        </button>
        <button 
          className={`dm-tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 Import Data
        </button>
      </div>

      {error && (
        <div className="dm-error">
          ❌ {error}
        </div>
      )}

      {importResult && (
        <div className={`dm-result ${importResult.success ? 'success' : 'error'}`}>
          <h3>{importResult.success ? '✅' : '❌'} {importResult.message}</h3>
          {importResult.details && (
            <div className="result-details">
              {importResult.details.jokes !== undefined && (
                <span>📝 {importResult.details.jokes} jokes</span>
              )}
              {importResult.details.oneLiners !== undefined && (
                <span>💬 {importResult.details.oneLiners} one-liners</span>
              )}
              {importResult.details.sets !== undefined && (
                <span>🎤 {importResult.details.sets} sets</span>
              )}
              {importResult.details.analyses !== undefined && (
                <span>📊 {importResult.details.analyses} analyses</span>
              )}
            </div>
          )}
          {importResult.details?.errors?.length > 0 && (
            <div className="result-errors">
              <p>⚠️ Some items had issues:</p>
              <ul>
                {importResult.details.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {importResult.details.errors.length > 5 && (
                  <li>...and {importResult.details.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
          <button onClick={() => setImportResult(null)}>Dismiss</button>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="dm-content">
          <div className="export-section">
            <h2>Select what to export</h2>
            
            <div className="export-options">
              <label className="export-option">
                <input 
                  type="checkbox" 
                  checked={exportOptions.jokes}
                  onChange={(e) => setExportOptions(prev => ({...prev, jokes: e.target.checked}))}
                />
                <span className="option-icon">📝</span>
                <span className="option-label">Jokes</span>
              </label>
              
              <label className="export-option">
                <input 
                  type="checkbox" 
                  checked={exportOptions.oneLiners}
                  onChange={(e) => setExportOptions(prev => ({...prev, oneLiners: e.target.checked}))}
                />
                <span className="option-icon">💬</span>
                <span className="option-label">One-Liners</span>
              </label>
              
              <label className="export-option">
                <input 
                  type="checkbox" 
                  checked={exportOptions.sets}
                  onChange={(e) => setExportOptions(prev => ({...prev, sets: e.target.checked}))}
                />
                <span className="option-icon">🎤</span>
                <span className="option-label">Sets</span>
              </label>
              
              <label className="export-option">
                <input 
                  type="checkbox" 
                  checked={exportOptions.analyses}
                  onChange={(e) => setExportOptions(prev => ({...prev, analyses: e.target.checked}))}
                />
                <span className="option-icon">📊</span>
                <span className="option-label">Analyses</span>
              </label>
            </div>

            <button 
              className="export-btn"
              onClick={handleExport}
              disabled={isExporting || !Object.values(exportOptions).some(v => v)}
            >
              {isExporting ? '⏳ Exporting...' : '📤 Export to JSON File'}
            </button>

            <p className="export-note">
              💡 Your data will be downloaded as a JSON file. Keep it safe for backup or to transfer to another device.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="dm-content">
          <div className="import-section">
            <h2>Import from backup</h2>
            
            <div 
              className="import-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <span className="dropzone-icon">📁</span>
              <p>Click to select a backup file</p>
              <span className="dropzone-hint">Accepts .json files</span>
            </div>

            {importPreview && (
              <div className="import-preview">
                <h3>📋 Preview</h3>
                <div className="preview-info">
                  <p><strong>File:</strong> {importPreview.file}</p>
                  <p><strong>Exported:</strong> {formatDate(importPreview.exportedAt)}</p>
                  <p><strong>Version:</strong> {importPreview.version}</p>
                </div>
                
                <div className="preview-counts">
                  <div className="count-item">
                    <span className="count-icon">📝</span>
                    <span className="count-value">{importPreview.counts.jokes}</span>
                    <span className="count-label">Jokes</span>
                  </div>
                  <div className="count-item">
                    <span className="count-icon">💬</span>
                    <span className="count-value">{importPreview.counts.oneLiners}</span>
                    <span className="count-label">One-Liners</span>
                  </div>
                  <div className="count-item">
                    <span className="count-icon">🎤</span>
                    <span className="count-value">{importPreview.counts.sets}</span>
                    <span className="count-label">Sets</span>
                  </div>
                  <div className="count-item">
                    <span className="count-icon">📊</span>
                    <span className="count-value">{importPreview.counts.analyses}</span>
                    <span className="count-label">Analyses</span>
                  </div>
                </div>

                <div className="import-actions">
                  <button 
                    className="import-btn"
                    onClick={handleImport}
                    disabled={isImporting}
                  >
                    {isImporting ? '⏳ Importing...' : '📥 Import All Data'}
                  </button>
                  <button 
                    className="cancel-btn"
                    onClick={() => {
                      setImportPreview(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <p className="import-warning">
                  ⚠️ This will add new items to your existing data. Duplicates may be created.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DataManager

