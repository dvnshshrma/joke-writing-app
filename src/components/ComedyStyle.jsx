import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
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
  const [transcriptText, setTranscriptText] = useState('')
  const [inputMode, setInputMode] = useState('audio') // 'audio' or 'transcript'
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionMessage, setConversionMessage] = useState(null)
  const [conversionProgress, setConversionProgress] = useState(0)
  const [mediaType, setMediaType] = useState(null) // 'audio' or 'video'
  const [convertVideoToAudio, setConvertVideoToAudio] = useState(true)
  const ffmpegRef = useRef(null)
  const ffmpegLoadedRef = useRef(false)

  // Load FFmpeg.wasm (only once)
  const loadFFmpeg = async () => {
    if (ffmpegLoadedRef.current && ffmpegRef.current) {
      return ffmpegRef.current
    }

    const ffmpeg = new FFmpeg()
    ffmpegRef.current = ffmpeg

    // Progress tracking
    ffmpeg.on('progress', ({ progress }) => {
      setConversionProgress(Math.round(progress * 100))
    })

    try {
      // Load FFmpeg.wasm core files from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      
      setConversionMessage('Loading FFmpeg...')
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      
      ffmpegLoadedRef.current = true
      return ffmpeg
    } catch (error) {
      console.error('Failed to load FFmpeg:', error)
      throw new Error('Failed to load FFmpeg. Please try again or use a smaller file.')
    }
  }

  // Extract audio from video using FFmpeg.wasm (high-quality conversion)
  const extractAudioFromVideo = async (videoFile) => {
    try {
      // Load FFmpeg if not already loaded
      const ffmpeg = await loadFFmpeg()
      
      setConversionMessage('Processing video...')
      setConversionProgress(0)

      // Generate unique filenames
      const inputFileName = `input.${videoFile.name.split('.').pop()}`
      const outputFileName = 'output.mp3'

      // Write input file to FFmpeg virtual file system
      setConversionMessage('Reading video file...')
      await ffmpeg.writeFile(inputFileName, await fetchFile(videoFile))

      // Convert video to high-quality MP3 audio
      setConversionMessage('Converting to audio (this may take a while)...')
      await ffmpeg.exec([
        '-i', inputFileName,
        '-vn', // No video
        '-acodec', 'libmp3lame', // MP3 codec
        '-ac', '2', // Stereo
        '-ar', '44100', // 44.1kHz sample rate
        '-b:a', '192k', // 192 kbps bitrate (high quality)
        '-q:a', '2', // High quality VBR encoding
        outputFileName
      ])

      // Read output file
      setConversionMessage('Finalizing audio...')
      const data = await ffmpeg.readFile(outputFileName)
      
      // Clean up virtual files
      await ffmpeg.deleteFile(inputFileName)
      await ffmpeg.deleteFile(outputFileName)

      // Create blob from output
      const audioBlob = new Blob([data], { type: 'audio/mpeg' })
      
      setConversionProgress(100)
      return audioBlob

    } catch (error) {
      console.error('FFmpeg conversion error:', error)
      throw new Error(`Conversion failed: ${error.message}. Try a smaller file or different format.`)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type (use flexible check like Analysis component)
    const isAudio = file.type.startsWith('audio/')
    const isVideo = file.type.startsWith('video/')

    // Also check file extension as fallback (some browsers don't set MIME type correctly)
    const fileName = file.name.toLowerCase()
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm', '.wma']
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv']
    const hasAudioExt = audioExtensions.some(ext => fileName.endsWith(ext))
    const hasVideoExt = videoExtensions.some(ext => fileName.endsWith(ext))

    if (!isAudio && !isVideo && !hasAudioExt && !hasVideoExt) {
      alert('Please upload an audio or video file (MP3, WAV, M4A, MP4, MOV, WEBM, etc.)')
      setError('Invalid file type. Please select an audio or video file.')
      return
    }

    // Note: File size limit removed - FFmpeg.wasm can handle large video files
    // Videos will be converted to audio (much smaller MP3 files) before upload
    const fileSizeMB = file.size / (1024 * 1024)

    // Handle video files - convert to audio if user has enabled conversion
    // FFmpeg.wasm handles any size efficiently, so we respect user preference only
    if (isVideo || hasVideoExt) {
      const shouldConvert = convertVideoToAudio
      
      if (shouldConvert) {
        setIsConverting(true)
        setError(null)
        setConversionProgress(0)
        
        try {
          const audioBlob = await extractAudioFromVideo(file)
          const audioFile = new File([audioBlob], file.name.replace(/\.[^/.]+$/, '.mp3'), { type: 'audio/mpeg' })
          
          setAudioFile(audioFile)
          setAudioFileName(audioFile.name)
          setMediaType('audio')
          setConversionMessage(`✅ Converted to high-quality MP3 audio (${(audioFile.size / (1024 * 1024)).toFixed(1)}MB)`)
          setConversionProgress(0)
        } catch (error) {
          console.error('Error converting video:', error)
          setConversionMessage(`❌ ${error.message || 'Conversion failed. Try a smaller file or audio format.'}`)
          setConversionProgress(0)
          setAudioFile(null)
          setError(error.message || 'Video conversion failed')
        } finally {
          setIsConverting(false)
        }
        return
      } else {
        // Video file, but conversion disabled and file is small enough
        setMediaType('video')
        setConversionMessage('ℹ️ Large videos can fail to upload. Enable conversion for better reliability.')
      }
    } else {
      // Audio file - no conversion needed
      setMediaType('audio')
      setConversionMessage(null)
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
    if (inputMode === 'audio' && !audioFile) {
      alert('Please upload an audio file')
      return
    }
    
    if (inputMode === 'transcript' && !transcriptText.trim()) {
      alert('Please paste your transcript')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      
      // Check if we're in production (same-origin) - use JSON + storage upload
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      
      // Handle transcript text input (direct analysis, no AssemblyAI needed)
      if (inputMode === 'transcript') {
        const apiUrl = isProduction ? '/api' : 'http://localhost:3001/api'
        const response = await fetch(`${apiUrl}/comedy-style/analyze-text`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transcriptText: transcriptText.trim()
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to analyze transcript' }))
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('Transcript analysis completed:', result)
        setAnalysisResult(result.result || result)
        return
      }
      
      // Handle audio/video file upload (existing logic)
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
        console.log('Analysis initiated (production), result:', result)
        
        if (result.status === 'processing' && result.jobId) {
          console.log('Starting to poll for job:', result.jobId)
          await pollForResults(result.jobId)
        } else if (result.result) {
          // Direct result (no polling needed)
          console.log('Analysis completed immediately (production)')
          setAnalysisResult(result.result)
        } else {
          console.log('Analysis completed (legacy format - production)')
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
        
        const pollUrl = `${apiUrl}/comedy-style/job/${jobId}`
        console.log('Polling for job status:', pollUrl, 'Attempt:', attempts + 1)
        
        const response = await fetch(pollUrl, { headers })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
          const errorMsg = errorData.error || `HTTP error ${response.status}`
          console.error('Polling error:', errorMsg, errorData, 'Status:', response.status)
          throw new Error(`Failed to check analysis status: ${errorMsg}`)
        }

        const result = await response.json()

        if (result.status === 'completed') {
          console.log('✅ Analysis completed successfully')
          setAnalysisResult(result.result)
          return true
        } else if (result.status === 'failed') {
          throw new Error(result.error || 'Analysis failed')
        } else if (result.status === 'error') {
          throw new Error(result.error || 'AssemblyAI job failed')
        }

        console.log('Job status:', result.status, '- continuing to poll...')
        return false
      } catch (err) {
        console.error('Error polling for results:', err)
        // Don't throw immediately - allow retries for network errors
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          // Network error - will retry
          return false
        }
        // Other errors - throw to stop polling
        throw err
      }
    }

    while (attempts < maxAttempts) {
      try {
        const completed = await poll()
        if (completed) return
      } catch (err) {
        // If it's a fatal error (not a network error), stop polling
        if (!err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err
        }
        // Otherwise continue polling (network error)
      }

      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    }

    throw new Error('Analysis timed out after 5 minutes. Please try again.')
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
            <h2>Analyze Your Comedy Set</h2>
            <p className="upload-description">
              Choose how you'd like to analyze your comedy style. Upload an audio/video file or paste your transcript directly.
            </p>

            {/* Input Mode Selector */}
            <div className="input-mode-selector">
              <button
                className={`mode-button ${inputMode === 'audio' ? 'active' : ''}`}
                onClick={() => {
                  setInputMode('audio')
                  setTranscriptText('')
                  setError(null)
                }}
                disabled={isAnalyzing}
              >
                🎤 Audio/Video Upload
              </button>
              <button
                className={`mode-button ${inputMode === 'transcript' ? 'active' : ''}`}
                onClick={() => {
                  setInputMode('transcript')
                  setAudioFile(null)
                  setAudioFileName('')
                  setError(null)
                }}
                disabled={isAnalyzing}
              >
                📝 Paste Transcript
              </button>
            </div>

            {/* Audio/Video Upload Option */}
            {inputMode === 'audio' && (
              <div className="file-upload-area">
                {/* Video conversion toggle */}
                <div className="video-conversion-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={convertVideoToAudio}
                      onChange={(e) => setConvertVideoToAudio(e.target.checked)}
                      disabled={isConverting || isAnalyzing}
                    />
                    <span><strong>Convert video to audio (recommended)</strong></span>
                  </label>
                  <p>
                    Videos will be converted to high-quality MP3 audio for better analysis. No file size limit - FFmpeg handles large files efficiently.
                  </p>
                </div>

                <input
                  type="file"
                  id="audio-upload"
                  accept="audio/*,video/*"
                  onChange={handleFileSelect}
                  className="file-input"
                  disabled={isAnalyzing || isConverting}
                />
                <label htmlFor="audio-upload" className="file-label">
                  {audioFile ? (
                    <div className="file-selected">
                      <span className="file-icon">{mediaType === 'video' ? '🎬' : '🎤'}</span>
                      <span className="file-name">{audioFileName}</span>
                      {mediaType === 'video' && <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '0.5rem' }}>(Video)</span>}
                    </div>
                  ) : (
                    <div className="file-placeholder">
                      <span className="upload-icon">📁</span>
                      <span>Click to upload audio or video file</span>
                      <span className="file-hint">MP3, WAV, M4A, MP4, MOV, WEBM</span>
                    </div>
                  )}
                </label>

                {/* Conversion status */}
                {isConverting && (
                  <div className="conversion-status converting">
                    <span className="spinner">🔄</span>
                    <p>{conversionMessage || 'Converting video to audio...'}</p>
                    {conversionProgress > 0 && (
                      <div className="conversion-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${conversionProgress}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{conversionProgress}%</span>
                      </div>
                    )}
                  </div>
                )}
                {conversionMessage && !isConverting && (
                  <div className={`conversion-status ${conversionMessage.includes('✅') ? 'success' : conversionMessage.includes('❌') ? 'error' : 'info'}`}>
                    <p>{conversionMessage}</p>
                  </div>
                )}
              </div>
            )}

            {/* Transcript Text Input Option */}
            {inputMode === 'transcript' && (
              <div className="transcript-input-area">
                <label htmlFor="transcript-text" className="transcript-label">
                  Paste your comedy set transcript below:
                </label>
                <textarea
                  id="transcript-text"
                  className="transcript-textarea"
                  value={transcriptText}
                  onChange={(e) => {
                    setTranscriptText(e.target.value)
                    setError(null)
                  }}
                  placeholder="Paste your comedy set transcript here... We'll analyze your style, writing elements, and identify Adam Bloom's comedy tools."
                  disabled={isAnalyzing}
                  rows={10}
                />
                <div className="transcript-hint">
                  💡 Tip: Paste the full transcript of your comedy set for best results
                </div>
              </div>
            )}

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <button
              className="analyze-btn"
              onClick={handleAnalyze}
                  disabled={(inputMode === 'audio' && !audioFile) || (inputMode === 'transcript' && !transcriptText.trim()) || isAnalyzing || isConverting}
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
                  {((analysisResult.bloomTools.trimming.opportunities?.length > 0) ||
                    (analysisResult.bloomTools.trimming.aiSuggestions?.length > 0)) ? (
                    <>
                      {(analysisResult.bloomTools.trimming.opportunities?.length > 0) && (
                        <div className="tool-examples">
                          <strong>Rule-based:</strong>
                          <ul>
                            {analysisResult.bloomTools.trimming.opportunities.slice(0, 8).map((opp, i) => (
                              <li key={i}>
                                {typeof opp === 'string' ? opp : (opp.suggestion || opp.pattern)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(analysisResult.bloomTools.trimming.aiSuggestions?.length > 0) && (
                        <div className="tool-examples ai-trimming">
                          <strong>AI suggestions:</strong>
                          <ul>
                            {analysisResult.bloomTools.trimming.aiSuggestions.map((item, i) => (
                              <li key={i}>
                                <span className="original">"{item.original}"</span>
                                <span className="arrow"> → </span>
                                <span className="suggestion">{item.suggestion}</span>
                                {item.reason && (
                                  <span className="reason"> — {item.reason}</span>
                                )}
                              </li>
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

