import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setsAPI } from '../services/setsAPI'
import { analysisAPI } from '../services/analysisAPI'
import './Analysis.css'

function Analysis() {
  const navigate = useNavigate()
  const [setName, setSetName] = useState('') // Text input for set name
  const [audioFile, setAudioFile] = useState(null)
  const [audioDuration, setAudioDuration] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [excludeStart, setExcludeStart] = useState(0) // seconds to exclude from start
  const [excludeEnd, setExcludeEnd] = useState(0) // seconds to exclude from end
  const [activeTab, setActiveTab] = useState('new') // 'new', 'old', or 'trends'
  const [savedAnalyses, setSavedAnalyses] = useState([])
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [mediaFile, setMediaFile] = useState(null) // Renamed from audioFile to support video
  const [mediaType, setMediaType] = useState(null) // 'audio' or 'video'
  const [isConverting, setIsConverting] = useState(false) // For video to audio conversion
  const [conversionMessage, setConversionMessage] = useState(null)
  const [convertVideoToAudio, setConvertVideoToAudio] = useState(true) // user-controlled (recommended)

  useEffect(() => {
    loadRecentAnalyses()
  }, [])

  useEffect(() => {
    if (activeTab === 'old') {
      loadSavedAnalyses()
    }
  }, [activeTab])

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
      const isAudio = file.type.startsWith('audio/')
      const isVideo = file.type.startsWith('video/')
      const fileSizeMB = file.size / (1024 * 1024)
      const MAX_SIZE_MB = 1024 // 1GB
      // NOTE: We allow analyzing the original video <1GB when the user opts in.
      
      if (isAudio || isVideo) {
        // Convert videos to audio when:
        // - video is over the hard 1GB limit (must)
        // - user has enabled conversion (recommended)
        const shouldConvert = isVideo && (fileSizeMB > MAX_SIZE_MB || convertVideoToAudio)
        if (shouldConvert) {
          const reason = fileSizeMB > MAX_SIZE_MB
            ? `over 1GB limit`
            : `conversion is enabled`
          setConversionMessage(`Video is ${fileSizeMB.toFixed(0)}MB (${reason}). Converting to audio for analysis...`)
          setIsConverting(true)
          
          try {
            const audioBlob = await extractAudioFromVideo(file)
            const audioFile = new File([audioBlob], file.name.replace(/\.[^/.]+$/, '.webm'), { type: 'audio/webm' })
            
            setAudioFile(audioFile)
            setMediaFile(audioFile)
            setMediaType('audio')
            setConversionMessage(`✅ Converted to audio (${(audioFile.size / (1024 * 1024)).toFixed(1)}MB)`)
            
            const duration = await getMediaDuration(audioFile, false)
            setAudioDuration(duration)
          } catch (error) {
            console.error('Error converting video:', error)
            setConversionMessage('❌ Conversion failed. Try a smaller file or audio format.')
            setAudioFile(null)
          } finally {
            setIsConverting(false)
          }
          return
        }
        
        // Normal file handling (under size limit)
        setAudioFile(file)
        setMediaFile(file)
        setMediaType(isAudio ? 'audio' : 'video')
        if (isVideo && fileSizeMB > 200) {
          setConversionMessage('ℹ️ Large videos can fail to upload on some deployments. If analysis fails, enable “Convert video to audio”.')
        } else {
          setConversionMessage(null)
        }
        
        try {
          const duration = await getMediaDuration(file, isVideo)
          setAudioDuration(duration)
        } catch (error) {
          console.error('Error getting media duration:', error)
          setAudioDuration(null)
        }
      } else {
        alert('Please select an audio or video file (mp3, wav, m4a, mp4, mov, webm, etc.)')
      }
    }
  }

  // Extract audio from video using MediaRecorder
  const extractAudioFromVideo = async (videoFile) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoFile)
      // Keep muted to avoid feedback / autoplay blocks; we only need the audio track for recording.
      video.muted = true
      
      video.onloadedmetadata = async () => {
        try {
          // Create audio context
          const audioContext = new (window.AudioContext || window.webkitAudioContext)()
          const source = audioContext.createMediaElementSource(video)
          const destination = audioContext.createMediaStreamDestination()
          source.connect(destination)
          // Do NOT connect to speakers; just record.
          
          // Set up MediaRecorder for audio
          const mediaRecorder = new MediaRecorder(destination.stream, {
            mimeType: 'audio/webm;codecs=opus',
            // Keep bitrate low so even large videos become small audio files (best-effort, browser may ignore)
            audioBitsPerSecond: 24000
          })
          const chunks = []
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data)
          }
          
          mediaRecorder.onstop = () => {
            URL.revokeObjectURL(video.src)
            audioContext.close()
            const blob = new Blob(chunks, { type: 'audio/webm' })
            resolve(blob)
          }
          
          mediaRecorder.onerror = (e) => {
            URL.revokeObjectURL(video.src)
            audioContext.close()
            reject(e)
          }
          
          // Start recording and play video
          mediaRecorder.start()
          video.play()
          
          // Stop when video ends
          video.onended = () => {
            mediaRecorder.stop()
          }
          
          // Fallback timeout (max 2 hours)
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop()
            }
          }, 2 * 60 * 60 * 1000)
          
        } catch (error) {
          URL.revokeObjectURL(video.src)
          reject(error)
        }
      }
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error('Failed to load video'))
      }
    })
  }

  const getMediaDuration = (file, isVideo = false) => {
    return new Promise((resolve, reject) => {
      const media = isVideo ? document.createElement('video') : new Audio()
      const url = URL.createObjectURL(file)
      
      media.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url)
        resolve(Math.floor(media.duration))
      })
      
      media.addEventListener('error', (e) => {
        URL.revokeObjectURL(url)
        reject(e)
      })
      
      media.src = url
      if (isVideo) media.load()
    })
  }

  // Get trend data for performance comparison
  const getTrendData = () => {
    if (!savedAnalyses || savedAnalyses.length < 2) return null
    
    const sortedAnalyses = [...savedAnalyses].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )
    
    return {
      analyses: sortedAnalyses,
      lpmTrend: sortedAnalyses.map(a => ({ date: a.createdAt, value: a.laughsPerMinute, name: a.setName })),
      avgLaughsTrend: sortedAnalyses.map(a => ({ date: a.createdAt, value: a.avgLaughsPerJoke, name: a.setName })),
      categories: sortedAnalyses.reduce((acc, a) => {
        acc[a.category] = (acc[a.category] || 0) + 1
        return acc
      }, {}),
      improvement: sortedAnalyses.length >= 2 ? {
        lpm: sortedAnalyses[sortedAnalyses.length - 1].laughsPerMinute - sortedAnalyses[0].laughsPerMinute,
        avg: sortedAnalyses[sortedAnalyses.length - 1].avgLaughsPerJoke - sortedAnalyses[0].avgLaughsPerJoke
      } : null,
      bestPerformance: sortedAnalyses.reduce((best, a) => 
        a.laughsPerMinute > best.laughsPerMinute ? a : best, sortedAnalyses[0]),
      worstPerformance: sortedAnalyses.reduce((worst, a) => 
        a.laughsPerMinute < worst.laughsPerMinute ? a : worst, sortedAnalyses[0])
    }
  }

  const handleAnalyze = async () => {
    if (!setName.trim()) {
      alert('Please enter a name for this set')
      return
    }

    if (!audioFile) {
      alert('Please upload an audio or video file')
      return
    }

    setIsAnalyzing(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('setName', setName.trim())
      formData.append('useTranscript', 'true') // Flag to use transcript-based analysis
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
      alert('✅ Analysis complete! Jokes extracted from transcript.')
    } catch (error) {
      console.error('Error analyzing audio:', error)
      const errorMessage = error.message || 'Unknown error'
      if (errorMessage.includes('table not found') || errorMessage.includes('relation')) {
        alert(`❌ Database Error: ${errorMessage}\n\nPlease run the SQL script:\nserver/create-analysis-table.sql\nin your Supabase SQL Editor.`)
      } else {
        alert(`❌ Failed to analyze: ${errorMessage}`)
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
            onClick={() => { setActiveTab('old'); loadSavedAnalyses(); }}
          >
            📊 View Old Analyses
          </button>
          <button 
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => { setActiveTab('trends'); loadSavedAnalyses(); }}
          >
            📈 Performance Trends
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
        ) : activeTab === 'trends' && !analysisResult ? (
          <PerformanceTrends trendData={getTrendData()} formatDate={formatDate} />
        ) : !analysisResult ? (
          <div className="analysis-upload-section">
            <div className="set-name-section">
              <h2>1. Name Your Set</h2>
              <p className="section-hint">Enter a name for this performance. The AI will transcribe and automatically detect jokes.</p>
              <input
                type="text"
                className="set-name-input"
                placeholder="e.g., Open Mic at Comedy Club - Dec 2024"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
              />
            </div>

            <div className="audio-upload-section">
              <h2>2. Upload Audio or Video</h2>
              <div className="video-options">
                <label className="video-option">
                  <input
                    type="checkbox"
                    checked={convertVideoToAudio}
                    onChange={(e) => setConvertVideoToAudio(e.target.checked)}
                  />
                  <span><strong>Convert video to audio (recommended)</strong></span>
                </label>
                <p className="video-option-hint">
                  Turning this off will attempt to analyze the original video file (works best for smaller videos). Videos over 1GB will still be converted.
                </p>
              </div>
              <div className="upload-area">
                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/*,video/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <label htmlFor="audio-upload" className="upload-label">
                  {audioFile ? (
                    <div className="file-selected">
                      <span className="file-icon">{mediaType === 'video' ? '🎬' : '🎵'}</span>
                      <div className="file-info">
                        <p className="file-name">{audioFile.name}</p>
                        <p className="file-size">
                          {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                          {mediaType && <span className="file-type-badge">{mediaType.toUpperCase()}</span>}
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
                          setMediaFile(null)
                          setMediaType(null)
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
                      <p>Click to upload audio or video file</p>
                      <p className="upload-hint">Audio: MP3, WAV, M4A, OGG • Video: MP4, MOV, WEBM</p>
                      <p className="upload-hint">Max 1GB • Videos over 1GB will be converted to audio</p>
                    </div>
                  )}
                </label>
                
                {/* Conversion status message */}
                {isConverting && (
                  <div className="conversion-status converting">
                    <span className="spinner">🔄</span>
                    <p>{conversionMessage || 'Converting video to audio...'}</p>
                  </div>
                )}
                {conversionMessage && !isConverting && (
                  <div className={`conversion-status ${conversionMessage.includes('✅') ? 'success' : conversionMessage.includes('❌') ? 'error' : 'info'}`}>
                    <p>{conversionMessage}</p>
                  </div>
                )}
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
                disabled={!setName.trim() || !audioFile || isAnalyzing}
              >
                {isAnalyzing ? '🔄 Analyzing & Transcribing...' : '🚀 Analyze Set'}
              </button>
              {isAnalyzing && (
                <p className="analyzing-hint">Transcribing audio, detecting laughs, and extracting jokes...</p>
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
                setSetName('')
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

            {/* Interval Comparison Section */}
            <IntervalComparison 
              timeline={analysisResult.timeline} 
              effectiveDuration={analysisResult.effectiveDuration || analysisResult.timeline[analysisResult.timeline.length - 1]?.time}
            />

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

              {/* Extracted Jokes from Transcript */}
              {analysisResult.extractedJokes && analysisResult.extractedJokes.length > 0 && (
                <div className="extracted-jokes-section">
                  <h4>🎭 Extracted Jokes from Transcript</h4>
                  <p className="section-description">
                    AI detected {analysisResult.extractedJokes.length} distinct bits/jokes in your set
                  </p>
                  <div className="extracted-jokes-list">
                    {analysisResult.extractedJokes.map((joke, i) => (
                      <div key={i} className="extracted-joke-card">
                        <div className="extracted-joke-header">
                          <span className="joke-index">#{i + 1}</span>
                          <h5>{joke.header}</h5>
                          {joke.duration && (
                            <span className="joke-duration">
                              {Math.floor(joke.duration / 60)}:{Math.floor(joke.duration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        {joke.topic && (
                          <span className="joke-topic-badge">{joke.topic}</span>
                        )}
                        {joke.text && (
                          <p className="joke-text">{joke.text.substring(0, 200)}{joke.text.length > 200 ? '...' : ''}</p>
                        )}
                        {joke.laughGap && (
                          <span className="laugh-indicator">😂 {joke.laughGap.toFixed(1)}s laugh</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Transcript */}
              {analysisResult.transcriptText && (
                <div className="transcript-section">
                  <h4>📝 Full Transcript</h4>
                  <div className="transcript-box">
                    <p>{analysisResult.transcriptText}</p>
                  </div>
                </div>
              )}
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

// Performance Trends Component
function PerformanceTrends({ trendData, formatDate }) {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [excludedIds, setExcludedIds] = useState(new Set())
  const [sortBy, setSortBy] = useState('date') // 'date', 'lpm', 'name', 'category'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc', 'desc'
  
  if (!trendData || !trendData.analyses || trendData.analyses.length < 2) {
    return (
      <div className="trends-section">
        <div className="trends-empty">
          <span className="trends-empty-icon">📈</span>
          <h3>Not enough data for trends</h3>
          <p>Complete at least 2 analyses to see your performance trends over time.</p>
        </div>
      </div>
    )
  }

  const allAnalyses = trendData.analyses
  
  // Filter out excluded analyses
  const analyses = allAnalyses.filter(a => !excludedIds.has(a.id))
  const hasData = analyses.length >= 2
  
  const toggleExclude = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  // Recalculate trends based on filtered data
  const lpmTrend = analyses.map(a => ({
    date: a.createdAt,
    value: a.laughsPerMinute,
    name: a.setName
  }))
  
  const bestPerformance = analyses.reduce((best, a) => 
    a.laughsPerMinute > best.laughsPerMinute ? a : best, analyses[0])
  const worstPerformance = analyses.reduce((worst, a) => 
    a.laughsPerMinute < worst.laughsPerMinute ? a : worst, analyses[0])
  
  const categories = analyses.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1
    return acc
  }, {})
  
  const improvement = analyses.length >= 2 ? {
    lpm: analyses[analyses.length - 1].laughsPerMinute - analyses[0].laughsPerMinute
  } : null
  
  // Calculate stats (handle empty state)
  const avgLPM = analyses.length > 0 ? analyses.reduce((sum, a) => sum + a.laughsPerMinute, 0) / analyses.length : 0
  const avgLPJ = analyses.length > 0 ? analyses.reduce((sum, a) => sum + a.avgLaughsPerJoke, 0) / analyses.length : 0
  const totalSets = analyses.length
  
  // Chart dimensions
  const chartWidth = 800
  const chartHeight = 250
  const padding = { top: 30, right: 40, bottom: 60, left: 50 }
  
  const maxLPM = hasData ? Math.max(...lpmTrend.map(d => d.value), 1) : 10
  const minLPM = hasData ? Math.min(...lpmTrend.map(d => d.value)) : 0
  
  const scaleX = (i) => hasData && lpmTrend.length > 1 
    ? padding.left + (i / (lpmTrend.length - 1)) * (chartWidth - padding.left - padding.right)
    : padding.left
  const scaleY = (val) => chartHeight - padding.bottom - ((val - minLPM * 0.8) / (maxLPM * 1.2 - minLPM * 0.8)) * (chartHeight - padding.top - padding.bottom)

  const pathData = hasData ? lpmTrend.map((d, i) => {
    const x = scaleX(i)
    const y = scaleY(d.value)
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
  }).join(' ') : ''

  const formatShortDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="trends-section">
      <h2>📈 Your Performance Over Time</h2>
      
      {/* Summary Cards */}
      <div className="trends-summary">
        <div className="trend-card highlight">
          <span className="trend-icon">{!hasData ? '📊' : (improvement && improvement.lpm >= 0 ? '📈' : '📉')}</span>
          <div className="trend-content">
            <h4>Overall Progress</h4>
            <p className={`trend-value ${!hasData ? '' : (improvement && improvement.lpm >= 0 ? 'positive' : 'negative')}`}>
              {hasData && improvement ? (improvement.lpm >= 0 ? '+' : '') + improvement.lpm.toFixed(1) : '--'} LPM
            </p>
            <span className="trend-label">{hasData ? 'since first analysis' : 'select sets to compare'}</span>
          </div>
        </div>
        
        <div className="trend-card">
          <span className="trend-icon">🎯</span>
          <div className="trend-content">
            <h4>Average LPM</h4>
            <p className="trend-value">{hasData ? avgLPM.toFixed(1) : '--'}</p>
            <span className="trend-label">across {totalSets} sets</span>
          </div>
        </div>
        
        <div className="trend-card">
          <span className="trend-icon">🏆</span>
          <div className="trend-content">
            <h4>Best Performance</h4>
            <p className="trend-value">{hasData ? bestPerformance.laughsPerMinute.toFixed(1) : '--'} LPM</p>
            <span className="trend-label">{hasData ? (bestPerformance.setName || 'Untitled') : '--'}</span>
          </div>
        </div>
        
        <div className="trend-card">
          <span className="trend-icon">📊</span>
          <div className="trend-content">
            <h4>Category Breakdown</h4>
            <div className="category-breakdown">
              <span className="cat-pill good">{categories.good || 0} Good</span>
              <span className="cat-pill average">{categories.average || 0} Avg</span>
              <span className="cat-pill bad">{categories.bad || 0} Bad</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="trend-chart-container">
        <h3>Laughs Per Minute Trend</h3>
        <div className="trend-chart">
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#667eea" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => {
              const val = minLPM * 0.8 + ((maxLPM * 1.2 - minLPM * 0.8) * i / 4)
              const y = scaleY(val)
              return (
                <g key={i}>
                  <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#e8e8e8" strokeDasharray="4,4" />
                  <text x={padding.left - 8} y={y + 4} fill="#888" fontSize="10" textAnchor="end">{val.toFixed(1)}</text>
                </g>
              )
            })}

            {/* Area under curve */}
            {hasData && (
              <path 
                d={pathData + ` L ${scaleX(lpmTrend.length - 1)} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`}
                fill="url(#trendGradient)"
              />
            )}

            {/* Main line */}
            {hasData && <path d={pathData} fill="none" stroke="#667eea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            
            {/* Empty state message */}
            {!hasData && (
              <text x={chartWidth / 2} y={chartHeight / 2} fill="#999" fontSize="14" textAnchor="middle">
                Select at least 2 sets to see trend chart
              </text>
            )}

            {/* Data points with labels */}
            {hasData && lpmTrend.map((d, i) => (
              <g key={i}>
                <circle
                  cx={scaleX(i)}
                  cy={scaleY(d.value)}
                  r={hoveredPoint === i ? 10 : 6}
                  fill={hoveredPoint === i ? '#764ba2' : '#667eea'}
                  stroke="white"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* X-axis labels */}
                <text x={scaleX(i)} y={chartHeight - padding.bottom + 20} fill="#666" fontSize="10" textAnchor="middle">
                  {formatShortDate(d.date)}
                </text>
                {/* Hover tooltip */}
                {hoveredPoint === i && (
                  <g>
                    <rect x={scaleX(i) - 60} y={scaleY(d.value) - 55} width="120" height="45" rx="6" fill="rgba(0,0,0,0.9)" />
                    <text x={scaleX(i)} y={scaleY(d.value) - 38} fill="white" fontSize="10" textAnchor="middle">{d.name || 'Set'}</text>
                    <text x={scaleX(i)} y={scaleY(d.value) - 22} fill="#ffd700" fontSize="14" textAnchor="middle" fontWeight="700">{d.value.toFixed(1)} LPM</text>
                  </g>
                )}
              </g>
            ))}

            {/* Axis labels */}
            <text x={chartWidth / 2} y={chartHeight - 10} fill="#666" fontSize="11" textAnchor="middle">Performance Date</text>
            <text x={15} y={chartHeight / 2} fill="#666" fontSize="11" textAnchor="middle" transform={`rotate(-90, 15, ${chartHeight / 2})`}>LPM</text>
          </svg>
        </div>
        <p className="trend-note">💡 Hover over points for details • Each point represents one analyzed performance</p>
      </div>

      {/* Performance History */}
      <div className="performance-history">
        <div className="history-header">
          <h3>Performance History</h3>
          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Date</option>
              <option value="lpm">LPM</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
            </select>
            <button 
              className="sort-order-btn" 
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        <div className="history-actions">
          <p className="history-hint">Click the checkbox to exclude sets from trend analysis</p>
          <div className="bulk-actions">
            <button onClick={() => setExcludedIds(new Set())}>✓ Include All</button>
            <button onClick={() => setExcludedIds(new Set(allAnalyses.map(a => a.id)))}>✗ Exclude All</button>
          </div>
        </div>
        <div className="history-list">
          {[...allAnalyses].sort((a, b) => {
            let cmp = 0
            if (sortBy === 'date') cmp = new Date(a.createdAt) - new Date(b.createdAt)
            else if (sortBy === 'lpm') cmp = a.laughsPerMinute - b.laughsPerMinute
            else if (sortBy === 'name') cmp = (a.setName || '').localeCompare(b.setName || '')
            else if (sortBy === 'category') cmp = (a.category || '').localeCompare(b.category || '')
            return sortOrder === 'desc' ? -cmp : cmp
          }).map((a, i) => {
            const isExcluded = excludedIds.has(a.id)
            return (
              <div key={a.id} className={`history-item ${isExcluded ? 'excluded' : ''}`}>
                <label className="exclude-checkbox">
                  <input 
                    type="checkbox" 
                    checked={!isExcluded}
                    onChange={() => toggleExclude(a.id)}
                  />
                  <span className="checkmark"></span>
                </label>
                <div className="history-rank">{allAnalyses.length - i}</div>
                <div className="history-info">
                  <h4>{a.setName || 'Untitled Set'}</h4>
                  <span className="history-date">{formatDate(a.createdAt)}</span>
                </div>
                <div className="history-metrics">
                  <span className="history-lpm">{a.laughsPerMinute.toFixed(1)} LPM</span>
                  <span className={`category-badge-small ${a.category}`}>{a.category}</span>
                </div>
              </div>
            )
          })}
        </div>
        {excludedIds.size > 0 && (
          <p className="excluded-notice">
            ⚠️ {excludedIds.size} set(s) excluded from analysis
          </p>
        )}
      </div>
    </div>
  )
}

// Interval Comparison Component
function IntervalComparison({ timeline, effectiveDuration }) {
  const [intervalSize, setIntervalSize] = useState(60) // Default 1 minute intervals
  
  if (!timeline || timeline.length === 0 || !effectiveDuration) {
    return null
  }
  
  // Calculate intervals
  const intervals = []
  const numIntervals = Math.ceil(effectiveDuration / intervalSize)
  
  for (let i = 0; i < numIntervals; i++) {
    const startTime = i * intervalSize
    const endTime = Math.min((i + 1) * intervalSize, effectiveDuration)
    
    // Sum laughs in this interval
    const intervalLaughs = timeline.filter(t => 
      t.time >= startTime && t.time < endTime
    ).reduce((sum, t) => sum + t.laughs, 0)
    
    // Calculate LPM for this interval
    const intervalDuration = (endTime - startTime) / 60 // in minutes
    const lpm = intervalDuration > 0 ? intervalLaughs / intervalDuration : 0
    
    intervals.push({
      index: i,
      startTime,
      endTime,
      laughs: intervalLaughs,
      lpm: lpm,
      label: `${Math.floor(startTime / 60)}:${(startTime % 60).toString().padStart(2, '0')} - ${Math.floor(endTime / 60)}:${(endTime % 60).toString().padStart(2, '0')}`
    })
  }
  
  // Find best and worst intervals
  const maxLPM = Math.max(...intervals.map(i => i.lpm), 1)
  const avgLPM = intervals.reduce((sum, i) => sum + i.lpm, 0) / intervals.length
  const bestInterval = intervals.reduce((best, i) => i.lpm > best.lpm ? i : best, intervals[0])
  const worstInterval = intervals.reduce((worst, i) => i.lpm < worst.lpm ? i : worst, intervals[0])
  
  // Calculate changes between consecutive intervals
  const changes = intervals.slice(1).map((interval, i) => ({
    from: intervals[i],
    to: interval,
    change: interval.lpm - intervals[i].lpm,
    percentChange: intervals[i].lpm > 0 ? ((interval.lpm - intervals[i].lpm) / intervals[i].lpm) * 100 : 0
  }))
  
  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  
  return (
    <div className="interval-comparison-section">
      <div className="interval-header">
        <h3>📊 Interval-by-Interval Comparison</h3>
        <div className="interval-selector">
          <label>Interval size:</label>
          <select 
            value={intervalSize} 
            onChange={(e) => setIntervalSize(parseInt(e.target.value))}
            className="interval-select"
          >
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
            <option value={180}>3 minutes</option>
            <option value={300}>5 minutes</option>
          </select>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="interval-summary">
        <div className="interval-stat best">
          <span className="stat-icon">🔥</span>
          <div>
            <h4>Best Interval</h4>
            <p>{bestInterval.label}</p>
            <span className="stat-value">{bestInterval.lpm.toFixed(1)} LPM</span>
          </div>
        </div>
        <div className="interval-stat worst">
          <span className="stat-icon">📉</span>
          <div>
            <h4>Needs Work</h4>
            <p>{worstInterval.label}</p>
            <span className="stat-value">{worstInterval.lpm.toFixed(1)} LPM</span>
          </div>
        </div>
        <div className="interval-stat avg">
          <span className="stat-icon">📈</span>
          <div>
            <h4>Average</h4>
            <p>{intervals.length} intervals</p>
            <span className="stat-value">{avgLPM.toFixed(1)} LPM</span>
          </div>
        </div>
      </div>
      
      {/* Interval Bars */}
      <div className="interval-bars">
        {intervals.map((interval, i) => {
          const isBest = interval === bestInterval
          const isWorst = interval === worstInterval
          const aboveAvg = interval.lpm >= avgLPM
          
          return (
            <div key={i} className={`interval-bar-item ${isBest ? 'best' : ''} ${isWorst ? 'worst' : ''}`}>
              <div className="interval-label">
                <span className="interval-time">{interval.label}</span>
                {isBest && <span className="interval-badge best">🔥 Best</span>}
                {isWorst && <span className="interval-badge worst">📉 Low</span>}
              </div>
              <div className="interval-bar-container">
                <div 
                  className={`interval-bar-fill ${aboveAvg ? 'above-avg' : 'below-avg'}`}
                  style={{ width: `${(interval.lpm / maxLPM) * 100}%` }}
                />
                <span className="interval-lpm">{interval.lpm.toFixed(1)} LPM</span>
              </div>
              <div className="interval-laughs">{interval.laughs} laughs</div>
            </div>
          )
        })}
      </div>
      
      {/* Changes Between Intervals */}
      {changes.length > 0 && (
        <div className="interval-changes">
          <h4>Momentum Changes</h4>
          <div className="changes-list">
            {changes.map((change, i) => (
              <div key={i} className={`change-item ${change.change >= 0 ? 'positive' : 'negative'}`}>
                <span className="change-label">
                  {formatTime(change.from.startTime)} → {formatTime(change.to.endTime)}
                </span>
                <span className="change-value">
                  {change.change >= 0 ? '↑' : '↓'} {Math.abs(change.change).toFixed(1)} LPM
                  <span className="change-percent">
                    ({change.percentChange >= 0 ? '+' : ''}{change.percentChange.toFixed(0)}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <p className="interval-tip">
        💡 Use this to identify where your set gains or loses momentum
      </p>
    </div>
  )
}

export default Analysis

