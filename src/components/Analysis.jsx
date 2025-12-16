import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setsAPI } from '../services/setsAPI'
import { analysisAPI } from '../services/analysisAPI'
import './Analysis.css'

function Analysis() {
  const navigate = useNavigate()
  const [selectedSet, setSelectedSet] = useState(null)
  const [availableSets, setAvailableSets] = useState([])
  const [audioFile, setAudioFile] = useState(null)
  const [audioDuration, setAudioDuration] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [showSetSelector, setShowSetSelector] = useState(false)
  const [loading, setLoading] = useState(true)
  const [excludeStart, setExcludeStart] = useState(0) // seconds to exclude from start
  const [excludeEnd, setExcludeEnd] = useState(0) // seconds to exclude from end
  const [activeTab, setActiveTab] = useState('new') // 'new' or 'old'
  const [savedAnalyses, setSavedAnalyses] = useState([])
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)

  useEffect(() => {
    loadSets()
    loadRecentAnalyses()
  }, [])

  useEffect(() => {
    if (activeTab === 'old') {
      loadSavedAnalyses()
    }
  }, [activeTab])

  const loadSets = async () => {
    try {
      setLoading(true)
      const sets = await setsAPI.getAll()
      // Only show finalized sets for analysis
      const finalizedSets = sets.filter(set => !set.isDraft)
      setAvailableSets(finalizedSets)
    } catch (error) {
      console.error('Error loading sets:', error)
      alert('Failed to load sets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadRecentAnalyses = async () => {
    try {
      const analyses = await analysisAPI.getAll()
      // Could show recent analyses here
    } catch (error) {
      console.error('Error loading analyses:', error)
    }
  }

  const loadSavedAnalyses = async () => {
    try {
      const analyses = await analysisAPI.getAll()
      setSavedAnalyses(analyses || [])
    } catch (error) {
      console.error('Error loading saved analyses:', error)
      alert('Failed to load saved analyses. Please try again.')
      setSavedAnalyses([])
    }
  }

  const handleDeleteAnalysis = async (analysisId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      try {
        await analysisAPI.delete(analysisId)
        const updated = savedAnalyses.filter(a => a.id !== analysisId)
        setSavedAnalyses(updated)
        if (selectedAnalysis && selectedAnalysis.id === analysisId) {
          setSelectedAnalysis(null)
        }
        alert('✅ Analysis deleted successfully!')
      } catch (error) {
        console.error('Error deleting analysis:', error)
        alert('Failed to delete analysis. Please try again.')
      }
    }
  }

  const handleViewAnalysis = async (analysisId) => {
    try {
      const analysis = await analysisAPI.getById(analysisId)
      if (analysis) {
        setAnalysisResult(analysis)
        setShowSavedAnalyses(false)
        setSelectedAnalysis(null)
      }
    } catch (error) {
      console.error('Error loading analysis:', error)
      alert('Failed to load analysis. Please try again.')
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file)
        
        // Get audio duration
        try {
          const duration = await getAudioDuration(file)
          setAudioDuration(duration)
        } catch (error) {
          console.error('Error getting audio duration:', error)
          // If we can't get duration, we'll use a default in the backend
          setAudioDuration(null)
        }
      } else {
        alert('Please select an audio file (mp3, wav, m4a, etc.)')
      }
    }
  }

  const getAudioDuration = (file) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      const url = URL.createObjectURL(file)
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url)
        resolve(Math.floor(audio.duration))
      })
      
      audio.addEventListener('error', (e) => {
        URL.revokeObjectURL(url)
        reject(e)
      })
      
      audio.src = url
    })
  }

  const handleAnalyze = async () => {
    if (!selectedSet) {
      alert('Please select a set to analyze')
      return
    }

    if (!audioFile) {
      alert('Please upload an audio file')
      return
    }

    setIsAnalyzing(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('setId', selectedSet.id)
      formData.append('setName', selectedSet.header)
      if (audioDuration) {
        formData.append('audioDuration', audioDuration.toString())
      }
      if (excludeStart > 0) {
        formData.append('excludeStartSeconds', excludeStart.toString())
      }
      if (excludeEnd > 0) {
        formData.append('excludeEndSeconds', excludeEnd.toString())
      }

      const result = await analysisAPI.analyze(formData)
      setAnalysisResult(result)
      setActiveTab('new') // Stay on new tab to show results
      alert('✅ Analysis complete!')
    } catch (error) {
      console.error('Error analyzing audio:', error)
      const errorMessage = error.message || 'Unknown error'
      // Show more helpful error messages
      if (errorMessage.includes('table not found') || errorMessage.includes('relation')) {
        alert(`❌ Database Error: ${errorMessage}\n\nPlease run the SQL script:\nserver/create-analysis-table.sql\nin your Supabase SQL Editor.`)
      } else {
        alert(`❌ Failed to analyze audio: ${errorMessage}`)
      }
    } finally {
      setIsAnalyzing(false)
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

  return (
    <div className="analysis">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Analyse your sets</h1>
      </div>

      {!analysisResult && (
        <div className="analysis-tabs">
          <button 
            className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            ✨ New Analysis
          </button>
          <button 
            className={`tab-btn ${activeTab === 'old' ? 'active' : ''}`}
            onClick={() => setActiveTab('old')}
          >
            📊 View Old Analyses
          </button>
        </div>
      )}

      <div className="analysis-content">
        {!analysisResult && activeTab === 'old' ? (
          <div className="saved-analyses-section">
            <h2>Saved Analyses</h2>
            {savedAnalyses.length === 0 ? (
              <div className="empty-state">
                <p>No saved analyses yet. Create your first analysis!</p>
              </div>
            ) : (
              <div className="analyses-layout">
                <div className="analyses-sidebar">
                  {savedAnalyses.map(analysis => (
                    <div
                      key={analysis.id}
                      className={`analysis-tab ${selectedAnalysis?.id === analysis.id ? 'active' : ''}`}
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <div className="analysis-tab-header">
                        <h4>{analysis.setName || 'Untitled Set'}</h4>
                        <button 
                          className="delete-analysis-btn"
                          onClick={(e) => handleDeleteAnalysis(analysis.id, e)}
                        >
                          ×
                        </button>
                      </div>
                      <div className="analysis-tab-meta">
                        <span className={`category-badge-small ${analysis.category}`}>
                          {analysis.category}
                        </span>
                        <span className="analysis-date">{formatDate(analysis.createdAt)}</span>
                      </div>
                      <div className="analysis-tab-stats">
                        <span>{analysis.laughsPerMinute.toFixed(1)} LPM</span>
                        <span>•</span>
                        <span>{analysis.avgLaughsPerJoke.toFixed(1)} avg/joke</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedAnalysis && (
                  <div className="analysis-detail">
                    <div className="analysis-detail-header">
                      <h2>{selectedAnalysis.setName || 'Untitled Set'}</h2>
                      <button 
                        className="view-analysis-btn"
                        onClick={() => handleViewAnalysis(selectedAnalysis.id)}
                      >
                        📊 View Full Analysis
                      </button>
                    </div>
                    
                    <div className="analysis-detail-summary">
                      <div className="detail-card">
                        <h3>Category</h3>
                        <span className={`category-badge ${selectedAnalysis.category}`}>
                          {selectedAnalysis.category}
                        </span>
                      </div>
                      <div className="detail-card">
                        <h3>Laughs per Minute</h3>
                        <p className="metric-value-small">{selectedAnalysis.laughsPerMinute.toFixed(1)}</p>
                      </div>
                      <div className="detail-card">
                        <h3>Avg Laughs per Joke</h3>
                        <p className="metric-value-small">{selectedAnalysis.avgLaughsPerJoke.toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="analysis-detail-footer">
                      <div className="analysis-meta-info">
                        <p><strong>Created:</strong> {formatDate(selectedAnalysis.createdAt)}</p>
                        <p><strong>Updated:</strong> {formatDate(selectedAnalysis.updatedAt)}</p>
                        {selectedAnalysis.audioFileName && (
                          <p><strong>Audio:</strong> {selectedAnalysis.audioFileName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : !analysisResult ? (
          <div className="analysis-upload-section">
            <div className="set-selection-section">
              <h2>1. Select a Set</h2>
              <button 
                className="select-set-btn"
                onClick={() => setShowSetSelector(!showSetSelector)}
              >
                {selectedSet ? selectedSet.header : 'Select a Set'}
              </button>

              {showSetSelector && (
                <div className="set-selector">
                  <div className="selector-header">
                    <h4>Select a Set to Analyze</h4>
                    <button 
                      className="close-selector"
                      onClick={() => setShowSetSelector(false)}
                    >
                      ×
                    </button>
                  </div>
                  {loading ? (
                    <p>Loading sets...</p>
                  ) : availableSets.length === 0 ? (
                    <p>No finalized sets available. Finalize a set first!</p>
                  ) : (
                    <div className="sets-list">
                      {availableSets.map(set => (
                        <div
                          key={set.id}
                          className={`set-option-item ${selectedSet?.id === set.id ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedSet(set)
                            setShowSetSelector(false)
                          }}
                        >
                          <h4>{set.header || 'Untitled Set'}</h4>
                          <p>{set.type === 'short' ? '🎤 Short Set' : '🎭 Long Set'} • {set.jokes?.length || 0} jokes</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="audio-upload-section">
              <h2>2. Upload Audio</h2>
              <div className="upload-area">
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="audio-upload" className="upload-label">
                  {audioFile ? (
                    <div className="file-selected">
                      <span className="file-icon">🎵</span>
                      <div className="file-info">
                        <p className="file-name">{audioFile.name}</p>
                        <p className="file-size">
                          {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                          {audioDuration && (
                            <span className="file-duration">
                              {' • '}
                              {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </p>
                      </div>
                      <button 
                        className="remove-file-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAudioFile(null)
                          setAudioDuration(null)
                          setExcludeStart(0)
                          setExcludeEnd(0)
                          document.getElementById('audio-upload').value = ''
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">📁</span>
                      <p>Click to upload audio file</p>
                      <p className="upload-hint">Supports: MP3, WAV, M4A, OGG</p>
                    </div>
                  )}
                </label>
              </div>

              {audioFile && audioDuration && (
                <div className="exclude-applause-section">
                  <h3>3. Exclude Applause (Optional)</h3>
                  <p className="exclude-hint">Remove start and end applause from analysis for more accurate metrics</p>
                  <div className="exclude-controls">
                    <div className="exclude-control">
                      <label htmlFor="exclude-start">Exclude from start (seconds):</label>
                      <input
                        type="number"
                        id="exclude-start"
                        min="0"
                        max={audioDuration}
                        value={excludeStart}
                        onChange={(e) => setExcludeStart(Math.max(0, Math.min(audioDuration, parseInt(e.target.value) || 0)))}
                        className="exclude-input"
                      />
                      <span className="exclude-preview">
                        {excludeStart > 0 && `(0:00 - ${Math.floor(excludeStart / 60)}:${(excludeStart % 60).toString().padStart(2, '0')})`}
                      </span>
                    </div>
                    <div className="exclude-control">
                      <label htmlFor="exclude-end">Exclude from end (seconds):</label>
                      <input
                        type="number"
                        id="exclude-end"
                        min="0"
                        max={audioDuration - excludeStart}
                        value={excludeEnd}
                        onChange={(e) => setExcludeEnd(Math.max(0, Math.min(audioDuration - excludeStart, parseInt(e.target.value) || 0)))}
                        className="exclude-input"
                      />
                      <span className="exclude-preview">
                        {excludeEnd > 0 && `(${Math.floor((audioDuration - excludeEnd) / 60)}:${((audioDuration - excludeEnd) % 60).toString().padStart(2, '0')} - ${Math.floor(audioDuration / 60)}:${(audioDuration % 60).toString().padStart(2, '0')})`}
                      </span>
                    </div>
                    {(excludeStart > 0 || excludeEnd > 0) && (
                      <div className="exclude-summary">
                        <p>
                          <strong>Analyzing:</strong> {Math.floor(excludeStart / 60)}:{(excludeStart % 60).toString().padStart(2, '0')} - {Math.floor((audioDuration - excludeEnd) / 60)}:{((audioDuration - excludeEnd) % 60).toString().padStart(2, '0')}
                          {' '}({Math.floor((audioDuration - excludeStart - excludeEnd) / 60)}:{((audioDuration - excludeStart - excludeEnd) % 60).toString().padStart(2, '0')} total)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="analyze-section">
              <button
                className="analyze-btn"
                onClick={handleAnalyze}
                disabled={!selectedSet || !audioFile || isAnalyzing}
              >
                {isAnalyzing ? '🔄 Analyzing...' : '🚀 Analyze Set'}
              </button>
              {isAnalyzing && (
                <p className="analyzing-hint">Processing audio and detecting laughs...</p>
              )}
              {audioFile && audioDuration && (excludeStart > 0 || excludeEnd > 0) && (
                <p className="exclude-notice">
                  ⚠️ Analysis will exclude {excludeStart > 0 ? `${excludeStart}s from start` : ''}{excludeStart > 0 && excludeEnd > 0 ? ' and ' : ''}{excludeEnd > 0 ? `${excludeEnd}s from end` : ''}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="analysis-results">
            <div className="results-header">
              <button className="back-btn" onClick={() => {
                setAnalysisResult(null)
                setAudioFile(null)
                setSelectedSet(null)
                setExcludeStart(0)
                setExcludeEnd(0)
                setActiveTab('new')
              }}>
                ← Back
              </button>
              <h2>Analysis Results</h2>
              <button 
                className="view-saved-btn"
                onClick={() => {
                  setAnalysisResult(null)
                  setActiveTab('old')
                }}
              >
                📊 View All Analyses
              </button>
            </div>

            <div className="results-summary">
              <div className="summary-card">
                <h3>Set Name</h3>
                <p>{analysisResult.setName}</p>
              </div>
              <div className="summary-card">
                <h3>Category</h3>
                <span className={`category-badge ${analysisResult.category}`}>
                  {analysisResult.category}
                </span>
              </div>
              <div className="summary-card">
                <h3>Laughs per Minute</h3>
                <p className="metric-value">{analysisResult.laughsPerMinute.toFixed(1)}</p>
              </div>
              <div className="summary-card">
                <h3>Average Laughs per Joke</h3>
                <p className="metric-value">{analysisResult.avgLaughsPerJoke.toFixed(1)}</p>
              </div>
            </div>

            <div className="timeline-section">
              <h3>Laughs Timeline</h3>
              {(analysisResult.excludedStart > 0 || analysisResult.excludedEnd > 0) && (
                <div className="exclusion-notice">
                  <p>
                    ⚠️ Excluded: {analysisResult.excludedStart > 0 ? `${Math.floor(analysisResult.excludedStart / 60)}:${(analysisResult.excludedStart % 60).toString().padStart(2, '0')} from start` : ''}
                    {analysisResult.excludedStart > 0 && analysisResult.excludedEnd > 0 ? ' and ' : ''}
                    {analysisResult.excludedEnd > 0 ? `${Math.floor(analysisResult.excludedEnd / 60)}:${(analysisResult.excludedEnd % 60).toString().padStart(2, '0')} from end` : ''}
                  </p>
                </div>
              )}
              <div className="timeline-graph">
                <TimelineChart 
                  data={analysisResult.timeline} 
                  effectiveDuration={analysisResult.effectiveDuration || analysisResult.timeline[analysisResult.timeline.length - 1]?.time}
                />
              </div>
            </div>

            <div className="joke-metrics-section">
              <h3>Laughs per Joke</h3>
              <div className="joke-metrics-list">
                {analysisResult.jokeMetrics.map((metric, index) => {
                  const maxLaughs = analysisResult.maxLaughs || Math.max(...analysisResult.jokeMetrics.map(m => m.laughs), 1)
                  const jokeHeader = metric.header || `Joke ${index + 1}`
                  return (
                    <div key={index} className="joke-metric-item">
                      <div className="joke-metric-header">
                        <span className="joke-number">{jokeHeader}</span>
                        <span className="laugh-count">{metric.laughs} laughs</span>
                      </div>
                      <div className="laugh-bar">
                        <div 
                          className="laugh-bar-fill"
                          style={{ width: `${(metric.laughs / maxLaughs) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Advanced Analytics Section */}
            <div className="advanced-analytics-section">
              <h3>📊 Advanced Insights</h3>
              {analysisResult.isMockData && (
                <div className="mock-data-notice">
                  ℹ️ Using simulated analysis. Add AssemblyAI API key for real AI analysis.
                </div>
              )}
              <div className="insights-grid">
                <div className="insight-card">
                  <span className="insight-icon">🎤</span>
                  <div className="insight-content">
                    <h4>Speaking Pace</h4>
                    <p className="insight-value">{analysisResult.speakingPace || '~150'} WPM</p>
                    <p className="insight-label">words per minute</p>
                  </div>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">📝</span>
                  <div className="insight-content">
                    <h4>Word Count</h4>
                    <p className="insight-value">{analysisResult.wordCount || '-'}</p>
                    <p className="insight-label">total words spoken</p>
                  </div>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">😂</span>
                  <div className="insight-content">
                    <h4>Laugh Moments</h4>
                    <p className="insight-value">{analysisResult.silenceCount || '-'}</p>
                    <p className="insight-label">detected pauses for laughs</p>
                  </div>
                </div>
                <div className="insight-card">
                  <span className="insight-icon">⏱️</span>
                  <div className="insight-content">
                    <h4>Set Duration</h4>
                    <p className="insight-value">
                      {analysisResult.effectiveDuration ? 
                        `${Math.floor(analysisResult.effectiveDuration / 60)}:${(analysisResult.effectiveDuration % 60).toString().padStart(2, '0')}` 
                        : '-'}
                    </p>
                    <p className="insight-label">analyzed time</p>
                  </div>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="performance-tips">
                <h4>💡 Performance Tips</h4>
                {generatePerformanceTips(analysisResult)}
              </div>

              {/* Joke Performance Ranking */}
              <div className="joke-ranking">
                <h4>🏆 Top Performing Jokes</h4>
                <div className="ranking-list">
                  {[...analysisResult.jokeMetrics]
                    .sort((a, b) => b.laughs - a.laughs)
                    .slice(0, 3)
                    .map((joke, i) => (
                      <div key={i} className={`ranking-item rank-${i + 1}`}>
                        <span className="rank-badge">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                        <span className="rank-joke">{joke.header}</span>
                        <span className="rank-laughs">{joke.laughs} laughs</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Generate performance tips based on analysis results
function generatePerformanceTips(analysis) {
  const tips = []
  
  if (analysis.laughsPerMinute < 4) {
    tips.push({ icon: '📈', text: 'Try increasing joke density - aim for 4-8 laughs per minute' })
  } else if (analysis.laughsPerMinute >= 8) {
    tips.push({ icon: '🔥', text: 'Great pace! You\'re hitting the sweet spot of 8+ laughs per minute' })
  }
  
  if (analysis.jokeMetrics && analysis.jokeMetrics.length > 0) {
    const sorted = [...analysis.jokeMetrics].sort((a, b) => b.laughs - a.laughs)
    const weakJokes = analysis.jokeMetrics.filter(j => j.laughs < analysis.avgLaughsPerJoke * 0.5)
    
    if (weakJokes.length > 0) {
      tips.push({ 
        icon: '🎯', 
        text: `${weakJokes.length} joke(s) underperformed. Consider reworking or replacing them.` 
      })
    }
    
    if (sorted[0] && sorted[0].jokeIndex === analysis.jokeMetrics.length - 1) {
      tips.push({ icon: '🎬', text: 'Strong closer! Your final joke is your best performer.' })
    } else if (sorted[0] && sorted[0].jokeIndex === 0) {
      tips.push({ icon: '🚀', text: 'Great opener! Consider if your closer can match it.' })
    }
  }
  
  if (analysis.speakingPace) {
    if (analysis.speakingPace > 170) {
      tips.push({ icon: '🐢', text: 'You might be speaking too fast. Try slowing down for better delivery.' })
    } else if (analysis.speakingPace < 130) {
      tips.push({ icon: '⚡', text: 'Your pace is slow. A slightly faster pace can maintain energy.' })
    }
  }
  
  if (tips.length === 0) {
    tips.push({ icon: '✨', text: 'Solid performance! Keep refining and experimenting.' })
  }
  
  return (
    <div className="tips-list">
      {tips.map((tip, i) => (
        <div key={i} className="tip-item">
          <span className="tip-icon">{tip.icon}</span>
          <span className="tip-text">{tip.text}</span>
        </div>
      ))}
    </div>
  )
}

// Enhanced Timeline Chart Component with hover, minima/maxima
function TimelineChart({ data, effectiveDuration }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  
  if (!data || data.length === 0) {
    return <p>No timeline data available</p>
  }

  const maxLaughs = Math.max(...data.map(d => d.laughs), 1)
  const minLaughs = Math.min(...data.map(d => d.laughs))
  const totalTime = effectiveDuration || (data.length > 0 ? data[data.length - 1].time : 100)
  const totalLaughs = data.reduce((sum, d) => sum + d.laughs, 0)
  const avgLaughs = totalLaughs / data.length
  
  // Find peaks (local maxima) and valleys (local minima)
  const peaks = []
  const valleys = []
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].laughs > data[i-1].laughs && data[i].laughs > data[i+1].laughs && data[i].laughs >= maxLaughs * 0.7) {
      peaks.push({ ...data[i], index: i })
    }
    if (data[i].laughs < data[i-1].laughs && data[i].laughs < data[i+1].laughs && data[i].laughs <= minLaughs + 1) {
      valleys.push({ ...data[i], index: i })
    }
  }
  
  // Global max and min
  const globalMax = data.reduce((max, d) => d.laughs > max.laughs ? d : max, data[0])
  const globalMin = data.reduce((min, d) => d.laughs < min.laughs ? d : min, data[0])
  
  const chartWidth = 900
  const chartHeight = 280
  const padding = { top: 40, right: 50, bottom: 50, left: 60 }

  const scaleX = (time) => (time / totalTime) * (chartWidth - padding.left - padding.right) + padding.left
  const scaleY = (laughs) => chartHeight - padding.bottom - (laughs / maxLaughs) * (chartHeight - padding.top - padding.bottom)
  
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

  // Create smooth path
  const pathData = data.map((d, i) => {
    const x = scaleX(d.time)
    const y = scaleY(d.laughs)
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
  }).join(' ')

  // Create gradient area
  const areaPath = pathData + ` L ${scaleX(data[data.length-1].time)} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`

  return (
    <div className="timeline-chart enhanced">
      {/* Chart Stats Bar */}
      <div className="chart-stats-bar">
        <div className="chart-stat">
          <span className="stat-label">Peak</span>
          <span className="stat-value peak">{globalMax.laughs} laughs @ {formatTime(globalMax.time)}</span>
        </div>
        <div className="chart-stat">
          <span className="stat-label">Low</span>
          <span className="stat-value low">{globalMin.laughs} laughs @ {formatTime(globalMin.time)}</span>
        </div>
        <div className="chart-stat">
          <span className="stat-label">Average</span>
          <span className="stat-value avg">{avgLaughs.toFixed(1)} laughs/interval</span>
        </div>
        <div className="chart-stat">
          <span className="stat-label">Total</span>
          <span className="stat-value total">{totalLaughs} laughs</span>
        </div>
      </div>

      <div className="chart-container enhanced">
        <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Gradient for area fill */}
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#667eea" stopOpacity="0.05" />
            </linearGradient>
            {/* Glow filter for line */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Drop shadow */}
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
            </filter>
          </defs>

          {/* Background grid */}
          {[0, 1, 2, 3, 4, 5].map(y => {
            const yPos = scaleY((y / 5) * maxLaughs)
            const value = Math.round((y / 5) * maxLaughs)
            return (
              <g key={y}>
                <line
                  x1={padding.left}
                  y1={yPos}
                  x2={chartWidth - padding.right}
                  y2={yPos}
                  stroke={y === 0 ? '#ccc' : '#e8e8e8'}
                  strokeWidth={y === 0 ? 2 : 1}
                  strokeDasharray={y === 0 ? '0' : '4,4'}
                />
                <text x={padding.left - 10} y={yPos + 4} fill="#888" fontSize="11" textAnchor="end" fontWeight="500">
                  {value}
                </text>
              </g>
            )
          })}

          {/* Time markers */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const time = Math.floor(totalTime * pct)
            const x = scaleX(time)
            return (
              <g key={i}>
                <line x1={x} y1={chartHeight - padding.bottom} x2={x} y2={chartHeight - padding.bottom + 6} stroke="#888" strokeWidth="1" />
                <text x={x} y={chartHeight - padding.bottom + 20} fill="#666" fontSize="11" textAnchor="middle" fontWeight="500">
                  {formatTime(time)}
                </text>
              </g>
            )
          })}

          {/* Average line */}
          <line
            x1={padding.left}
            y1={scaleY(avgLaughs)}
            x2={chartWidth - padding.right}
            y2={scaleY(avgLaughs)}
            stroke="#ffa726"
            strokeWidth="2"
            strokeDasharray="8,4"
            opacity="0.8"
          />
          <text x={chartWidth - padding.right + 5} y={scaleY(avgLaughs) + 4} fill="#ffa726" fontSize="10" fontWeight="600">
            AVG
          </text>

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGradient)" />

          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            style={{ stroke: '#667eea' }}
          />

          {/* Line gradient definition */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="50%" stopColor="#764ba2" />
              <stop offset="100%" stopColor="#667eea" />
            </linearGradient>
          </defs>

          {/* Peak markers */}
          {peaks.slice(0, 3).map((peak, i) => (
            <g key={`peak-${i}`}>
              <circle cx={scaleX(peak.time)} cy={scaleY(peak.laughs)} r="8" fill="#4caf50" stroke="white" strokeWidth="2" filter="url(#shadow)" />
              <text x={scaleX(peak.time)} y={scaleY(peak.laughs) - 14} fill="#4caf50" fontSize="10" textAnchor="middle" fontWeight="700">
                ▲ {peak.laughs}
              </text>
            </g>
          ))}

          {/* Valley markers */}
          {valleys.slice(0, 2).map((valley, i) => (
            <g key={`valley-${i}`}>
              <circle cx={scaleX(valley.time)} cy={scaleY(valley.laughs)} r="6" fill="#ef5350" stroke="white" strokeWidth="2" />
              <text x={scaleX(valley.time)} y={scaleY(valley.laughs) + 20} fill="#ef5350" fontSize="9" textAnchor="middle" fontWeight="600">
                ▼ {valley.laughs}
              </text>
            </g>
          ))}

          {/* Global max marker */}
          <g>
            <circle cx={scaleX(globalMax.time)} cy={scaleY(globalMax.laughs)} r="10" fill="#ffd700" stroke="#ff9800" strokeWidth="3" filter="url(#shadow)" />
            <text x={scaleX(globalMax.time)} y={scaleY(globalMax.laughs) - 18} fill="#ff9800" fontSize="11" textAnchor="middle" fontWeight="700">
              🔥 MAX
            </text>
          </g>

          {/* Interactive hover points */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={scaleX(d.time)}
                cy={scaleY(d.laughs)}
                r={hoveredPoint === i ? 8 : 4}
                fill={hoveredPoint === i ? '#764ba2' : '#667eea'}
                stroke="white"
                strokeWidth={hoveredPoint === i ? 3 : 1}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {hoveredPoint === i && (
                <g>
                  <rect
                    x={scaleX(d.time) - 45}
                    y={scaleY(d.laughs) - 45}
                    width="90"
                    height="35"
                    rx="6"
                    fill="rgba(0,0,0,0.85)"
                    filter="url(#shadow)"
                  />
                  <text x={scaleX(d.time)} y={scaleY(d.laughs) - 30} fill="white" fontSize="11" textAnchor="middle" fontWeight="600">
                    {formatTime(d.time)}
                  </text>
                  <text x={scaleX(d.time)} y={scaleY(d.laughs) - 17} fill="#ffd700" fontSize="12" textAnchor="middle" fontWeight="700">
                    {d.laughs} laughs
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* Y-axis label */}
          <text x={20} y={chartHeight / 2} fill="#666" fontSize="12" fontWeight="600" textAnchor="middle" transform={`rotate(-90, 20, ${chartHeight / 2})`}>
            Laughs
          </text>

          {/* X-axis label */}
          <text x={chartWidth / 2} y={chartHeight - 8} fill="#666" fontSize="12" fontWeight="600" textAnchor="middle">
            Time
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#667eea' }}></span>
          <span>Laughs over time</span>
        </div>
        <div className="legend-item">
          <span className="legend-line" style={{ background: '#ffa726' }}></span>
          <span>Average</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#ffd700', border: '2px solid #ff9800' }}></span>
          <span>Peak moment</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#4caf50' }}></span>
          <span>High points</span>
        </div>
      </div>

      <p className="chart-note">💡 Hover over data points for details • Timeline shows analyzed portion (applause excluded)</p>
    </div>
  )
}

export default Analysis

