import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ComedyStyle.css'

// Comedy style tags
const COMEDY_STYLES = [
  'Anecdotal',
  'Clowning',
  'Edgy',
  'Fantastical',
  'Heartfelt',
  'Observational',
  'Opinionated',
  'Playful',
  'Puns',
  'Philosophical',
  'Sarcasm',
  'Satire',
  'Self-deprecation',
  'Shock',
  'Superiority',
  'Surrealism',
  'Tragedy',
  'Wordplay'
]

// Writing elements based on comedy writing techniques
const WRITING_ELEMENTS = [
  'Setup-Punchline Structure',
  'Callbacks',
  'Tags (Add-on jokes)',
  'Rule of Three',
  'Incongruity',
  'Misdirection',
  'Exaggeration',
  'Self-Awareness',
  'Storytelling Arc',
  'Timing & Pacing',
  'Repetition',
  'Contrast',
  'Personification',
  'Irony'
]

function ComedyStyle() {
  const navigate = useNavigate()
  const [audioFile, setAudioFile] = useState(null)
  const [audioFileName, setAudioFileName] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 
                       'video/mp4', 'video/quicktime', 'video/webm']
    if (!validTypes.includes(file.type)) {
      alert('Please upload an audio or video file (MP3, WAV, M4A, MP4, MOV, WEBM)')
      return
    }

    setAudioFile(file)
    setAudioFileName(file.name)
    setError(null)
  }

  const getAuthHeaders = async () => {
    const headers = {}
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    }
    return headers
  }

  const handleAnalyze = async () => {
    if (!audioFile) {
      alert('Please upload an audio file')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      
      // Check if we're in production (same-origin) - use JSON + storage upload
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      
      if (isProduction && supabase) {
        // Upload to Supabase Storage first (same as analysis)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('You must be logged in to analyze')
        
        const safeName = `${Date.now()}-${audioFileName.replace(/[^\w.\-]+/g, '_')}`
        const path = `${user.id}/${safeName}`
        
        const { error: uploadError } = await supabase.storage
          .from('analysis-media')
          .upload(path, audioFile, { upsert: true, contentType: audioFile.type || 'application/octet-stream' })
        
        if (uploadError) throw new Error(uploadError.message || 'Failed to upload file')
        
        // Send JSON payload
        const response = await fetch('/api/comedy-style/analyze', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileName: audioFileName,
            storageBucket: 'analysis-media',
            storagePath: path
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to analyze style' }))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.status === 'processing' && result.jobId) {
          await pollForResults(result.jobId)
        } else {
          setAnalysisResult(result)
        }
      } else {
        // Local development: use FormData
        const formData = new FormData()
        formData.append('audio', audioFile)
        formData.append('fileName', audioFileName)
        
        const response = await fetch('http://localhost:3001/api/comedy-style/analyze', {
          method: 'POST',
          headers,
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to analyze style' }))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.status === 'processing' && result.jobId) {
          await pollForResults(result.jobId)
        } else {
          setAnalysisResult(result)
        }
      }
    } catch (err) {
      console.error('Error analyzing comedy style:', err)
      setError(err.message || 'Failed to analyze comedy style. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const pollForResults = async (jobId) => {
    const maxAttempts = 60 // 5 minutes max (5 second intervals)
    let attempts = 0

    const poll = async () => {
      try {
        const headers = await getAuthHeaders()
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        const apiUrl = isProduction ? '/api' : 'http://localhost:3001/api'
        
        const response = await fetch(`${apiUrl}/comedy-style/job/${jobId}`, { headers })

        if (!response.ok) {
          throw new Error('Failed to check analysis status')
        }

        const result = await response.json()

        if (result.status === 'completed') {
          setAnalysisResult(result.result)
          return true
        } else if (result.status === 'failed') {
          throw new Error(result.error || 'Analysis failed')
        }

        return false
      } catch (err) {
        console.error('Error polling for results:', err)
        throw err
      }
    }

    while (attempts < maxAttempts) {
      const completed = await poll()
      if (completed) return

      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    }

    throw new Error('Analysis timed out. Please try again.')
  }

  const getStyleScore = (styleName) => {
    if (!analysisResult || !analysisResult.styleTags) return 0
    const tag = analysisResult.styleTags.find(t => t.name === styleName)
    return tag ? tag.score : 0
  }

  const getElementScore = (elementName) => {
    if (!analysisResult || !analysisResult.writingElements) return 0
    const element = analysisResult.writingElements.find(e => e.name === elementName)
    return element ? element.score : 0
  }

  const getTopStyles = () => {
    if (!analysisResult || !analysisResult.styleTags) return []
    return [...analysisResult.styleTags]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter(tag => tag.score > 0)
  }

  const getTopElements = () => {
    if (!analysisResult || !analysisResult.writingElements) return []
    return [...analysisResult.writingElements]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .filter(element => element.score > 0)
  }

  return (
    <div className="comedy-style">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Find Your Style</h1>
        <p className="page-subtitle">Discover your comedy style and writing elements</p>
      </div>

      {!analysisResult ? (
        <div className="style-upload-section">
          <div className="upload-card">
            <h2>Upload Your Comedy Set</h2>
            <p className="upload-description">
              Upload an audio or video recording of your comedy set. We'll analyze your style and identify key writing elements.
            </p>

            <div className="file-upload-area">
              <input
                type="file"
                id="audio-upload"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                className="file-input"
                disabled={isAnalyzing}
              />
              <label htmlFor="audio-upload" className="file-label">
                {audioFile ? (
                  <div className="file-selected">
                    <span className="file-icon">🎤</span>
                    <span className="file-name">{audioFileName}</span>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <span className="upload-icon">📁</span>
                    <span>Click to upload audio or video file</span>
                    <span className="file-hint">MP3, WAV, M4A, MP4, MOV, WEBM</span>
                  </div>
                )}
              </label>
            </div>

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!audioFile || isAnalyzing}
            >
              {isAnalyzing ? '🔄 Analyzing...' : '🎭 Analyze My Style'}
            </button>

            {isAnalyzing && (
              <div className="analyzing-message">
                <p>🔄 Transcribing and analyzing your comedy style...</p>
                <p className="analyzing-hint">This may take a few minutes</p>
                <p className="analyzing-hint">Analyzing: Styles → Writing Elements → Adam Bloom Tools</p>
              </div>
            )}

            <div className="api-info-box">
              <p className="info-text">
                💡 <strong>Tip:</strong> For more accurate style classification, add an OpenAI API key to your server environment variables (OPENAI_API_KEY).
                <br />
                The analyzer will use keyword-based classification otherwise (still works great!).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="style-results">
          <div className="results-header">
            <button className="back-btn" onClick={() => setAnalysisResult(null)}>
              ← New Analysis
            </button>
            <h2>Your Comedy Style Analysis</h2>
          </div>

          {/* Top Styles Section */}
          <div className="results-section">
            <h3>🎭 Your Comedy Styles</h3>
            <div className="style-tags-grid">
              {COMEDY_STYLES.map(style => {
                const score = getStyleScore(style)
                const percentage = Math.round(score * 100)
                return (
                  <div key={style} className="style-tag-card">
                    <div className="style-tag-header">
                      <span className="style-tag-name">{style}</span>
                      <span className="style-tag-score">{percentage}%</span>
                    </div>
                    <div className="score-bar-container">
                      <div 
                        className="score-bar"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top 5 Styles Highlight */}
            {getTopStyles().length > 0 && (
              <div className="top-styles-section">
                <h4>Your Top Styles</h4>
                <div className="top-styles-list">
                  {getTopStyles().map((tag, index) => (
                    <div key={tag.name} className="top-style-badge">
                      <span className="rank">#{index + 1}</span>
                      <span className="style-name">{tag.name}</span>
                      <span className="style-percentage">{Math.round(tag.score * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Writing Elements Section */}
          <div className="results-section">
            <h3>✍️ Writing Elements</h3>
            <div className="writing-elements-grid">
              {WRITING_ELEMENTS.map(element => {
                const score = getElementScore(element)
                const percentage = Math.round(score * 100)
                return (
                  <div key={element} className="element-card">
                    <div className="element-header">
                      <span className="element-name">{element}</span>
                      <span className="element-score">{percentage}%</span>
                    </div>
                    <div className="score-bar-container">
                      <div 
                        className="score-bar element-bar"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top 5 Elements Highlight */}
            {getTopElements().length > 0 && (
              <div className="top-elements-section">
                <h4>Strongest Elements</h4>
                <div className="top-elements-list">
                  {getTopElements().map((element, index) => (
                    <div key={element.name} className="top-element-badge">
                      <span className="rank">#{index + 1}</span>
                      <span className="element-name">{element.name}</span>
                      <span className="element-percentage">{Math.round(element.score * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Adam Bloom Tools Section */}
          {analysisResult.bloomTools && (
            <div className="results-section bloom-tools-section">
              <h3>🛠️ Adam Bloom Writing Tools</h3>
              
              <div className="bloom-tools-grid">
                <div className="bloom-tool-card">
                  <h4>Seesaw Theory</h4>
                  <p className={analysisResult.bloomTools.seesawTheory.detected ? 'detected' : 'not-detected'}>
                    {analysisResult.bloomTools.seesawTheory.detected 
                      ? `✅ Detected (${analysisResult.bloomTools.seesawTheory.count} instances)` 
                      : '❌ Not detected'}
                  </p>
                  {analysisResult.bloomTools.seesawTheory.segments?.length > 0 && (
                    <div className="tool-examples">
                      <strong>Examples:</strong>
                      <ul>
                        {analysisResult.bloomTools.seesawTheory.segments.slice(0, 3).map((seg, i) => (
                          <li key={i}>{seg.text.substring(0, 100)}...</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bloom-tool-card">
                  <h4>Balloon Pop</h4>
                  <p className={analysisResult.bloomTools.balloonPop.detected ? 'detected' : 'not-detected'}>
                    {analysisResult.bloomTools.balloonPop.detected 
                      ? `✅ Detected (${analysisResult.bloomTools.balloonPop.count} instances)` 
                      : '❌ Not detected'}
                  </p>
                  {analysisResult.bloomTools.balloonPop.segments?.length > 0 && (
                    <div className="tool-examples">
                      <strong>Examples:</strong>
                      <ul>
                        {analysisResult.bloomTools.balloonPop.segments.slice(0, 3).map((seg, i) => (
                          <li key={i}>{seg.text.substring(0, 100)}...</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bloom-tool-card">
                  <h4>Word Smuggling</h4>
                  <p className={analysisResult.bloomTools.wordSmuggling.detected ? 'detected' : 'not-detected'}>
                    {analysisResult.bloomTools.wordSmuggling.detected 
                      ? `✅ Detected (${analysisResult.bloomTools.wordSmuggling.count} instances)` 
                      : '❌ Not detected'}
                  </p>
                  {analysisResult.bloomTools.wordSmuggling.segments?.length > 0 && (
                    <div className="tool-examples">
                      <strong>Examples:</strong>
                      <ul>
                        {analysisResult.bloomTools.wordSmuggling.segments.slice(0, 3).map((seg, i) => (
                          <li key={i}>{seg.text.substring(0, 100)}...</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bloom-tool-card">
                  <h4>Toppers</h4>
                  <p className={analysisResult.bloomTools.toppers.detected ? 'detected' : 'not-detected'}>
                    {analysisResult.bloomTools.toppers.detected 
                      ? `✅ Detected (${analysisResult.bloomTools.toppers.count} instances)` 
                      : '❌ Not detected'}
                  </p>
                  <p className="tool-description">Follow-up jokes on the same premise</p>
                </div>

                <div className="bloom-tool-card trimming-card">
                  <h4>Trimming Opportunities</h4>
                  {analysisResult.bloomTools.trimming.totalRedundantSyllables > 0 ? (
                    <>
                      <p className="detected">
                        ✅ {analysisResult.bloomTools.trimming.totalRedundantSyllables} redundant syllables detected
                      </p>
                      <p className="efficiency-gain">
                        Potential efficiency gain: {analysisResult.bloomTools.trimming.estimatedEfficiencyGain}
                      </p>
                      {analysisResult.bloomTools.trimming.opportunities?.length > 0 && (
                        <div className="tool-examples">
                          <strong>Suggestions:</strong>
                          <ul>
                            {analysisResult.bloomTools.trimming.opportunities.slice(0, 5).map((opp, i) => (
                              <li key={i}>{opp.suggestion || opp.pattern}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="not-detected">❌ No major trimming opportunities found</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary Section */}
          {analysisResult.summary && (
            <div className="results-section summary-section">
              <h3>📝 Style Summary</h3>
              <p className="summary-text">{analysisResult.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ComedyStyle

