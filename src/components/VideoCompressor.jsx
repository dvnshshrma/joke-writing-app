import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './VideoCompressor.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const COMPRESSION_BASE_URL = import.meta.env.VITE_COMPRESSION_URL || API_BASE_URL

function VideoCompressor() {
  const navigate = useNavigate()
  const [videoFile, setVideoFile] = useState(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [compressedVideoUrl, setCompressedVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const [originalSize, setOriginalSize] = useState(null)
  const [compressedSize, setCompressedSize] = useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file)
        setOriginalSize(file.size)
        setCompressedVideoUrl(null)
        setError(null)
        setProgress(0)
      } else {
        alert('Please select a video file (MP4, MOV, AVI, MKV, WEBM, etc.)')
      }
    }
  }

  const handleCompress = async () => {
    if (!videoFile) {
      alert('Please select a video file first')
      return
    }

    setIsCompressing(true)
    setError(null)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('video', videoFile)

      const response = await fetch(`${COMPRESSION_BASE_URL}/api/compress-video`, {
        method: 'POST',
        body: formData
      })

      // Check if response is OK
      if (!response.ok) {
        // Try to parse error as JSON
        let errorMessage = `Server error: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorData.message || errorMessage
        } catch (e) {
          // If not JSON, try text
          try {
            const errorText = await response.text()
            if (errorText) errorMessage = errorText
          } catch (e2) {
            // Keep default error message
          }
        }
        setError(errorMessage)
        setIsCompressing(false)
        setProgress(0)
        return
      }

      // Check content type to see if it's a video or JSON error
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        // Server returned JSON (error)
        const errorData = await response.json()
        setError(errorData.error || errorData.details || errorData.message || 'Compression failed')
        setIsCompressing(false)
        setProgress(0)
        return
      }

      // It's a video file
      const blob = await response.blob()
      
      // Double check it's actually a video
      if (blob.type && blob.type.startsWith('video/')) {
        const url = URL.createObjectURL(blob)
        setCompressedVideoUrl(url)
        setCompressedSize(blob.size)
        setProgress(100)
        setIsCompressing(false)
      } else {
        // Might be an error message in text format
        const text = await blob.text()
        try {
          const errorJson = JSON.parse(text)
          setError(errorJson.error || errorJson.details || errorJson.message || 'Compression failed')
        } catch (e) {
          setError(text || 'Compression failed - unexpected response format')
        }
        setIsCompressing(false)
        setProgress(0)
      }
    } catch (error) {
      console.error('Error compressing video:', error)
      setError(error.message || 'Failed to compress video. Please check your connection and try again.')
      setIsCompressing(false)
      setProgress(0)
    }
  }

  const handleDownload = () => {
    if (compressedVideoUrl) {
      const a = document.createElement('a')
      a.href = compressedVideoUrl
      const originalName = videoFile.name.replace(/\.[^/.]+$/, '')
      a.download = `${originalName}_compressed.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getCompressionRatio = () => {
    if (originalSize && compressedSize) {
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)
      return ratio
    }
    return null
  }

  return (
    <div className="video-compressor">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Compress Video Under 2 GB</h1>
      </div>

      <div className="compressor-content">
        <div className="compressor-section">
          <h2>1. Upload Video</h2>
          <p className="section-hint">
            Select any video file. The compression will maintain high quality while reducing file size.
          </p>
          
          <div className="upload-area">
            <input
              type="file"
              id="video-upload"
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isCompressing}
            />
            <label htmlFor="video-upload" className={`upload-label ${isCompressing ? 'disabled' : ''}`}>
              {videoFile ? (
                <div className="file-selected">
                  <span className="file-icon">🎬</span>
                  <div className="file-info">
                    <p className="file-name">{videoFile.name}</p>
                    <p className="file-size">
                      {formatFileSize(videoFile.size)}
                      {originalSize > 2 * 1024 * 1024 * 1024 && (
                        <span className="file-warning"> (Over 2GB)</span>
                      )}
                    </p>
                  </div>
                  {!isCompressing && (
                    <button
                      className="remove-file-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setVideoFile(null)
                        setOriginalSize(null)
                        setCompressedVideoUrl(null)
                        setCompressedSize(null)
                        setError(null)
                        setProgress(0)
                        document.getElementById('video-upload').value = ''
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">📁</span>
                  <p>Click to upload video file</p>
                  <p className="upload-hint">
                    Supports: MP4, MOV, AVI, MKV, WEBM, and more
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {videoFile && (
          <div className="compressor-section">
            <h2>2. Compress Video</h2>
            <button
              className="compress-btn"
              onClick={handleCompress}
              disabled={isCompressing || !videoFile}
            >
              {isCompressing ? '🔄 Compressing...' : '🚀 Compress Video'}
            </button>

            {isCompressing && (
              <div className="progress-section">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{Math.round(progress)}%</p>
                <p className="progress-hint">
                  {progress < 50 ? 'Uploading video...' : 'Compressing video...'}
                </p>
              </div>
            )}

            {error && (
              <div className="error-message">
                <p>❌ {error}</p>
              </div>
            )}
          </div>
        )}

        {compressedVideoUrl && (
          <div className="compressor-section">
            <h2>3. Download Compressed Video</h2>
            <div className="compression-results">
              <div className="result-card">
                <h3>Original</h3>
                <p className="file-size-display">{formatFileSize(originalSize)}</p>
              </div>
              <div className="result-arrow">→</div>
              <div className="result-card compressed">
                <h3>Compressed</h3>
                <p className="file-size-display">{formatFileSize(compressedSize)}</p>
                {getCompressionRatio() && (
                  <p className="compression-ratio">
                    {getCompressionRatio()}% smaller
                  </p>
                )}
              </div>
            </div>

            <button className="download-btn" onClick={handleDownload}>
              ⬇️ Download Compressed Video
            </button>

            <div className="video-preview">
              <video controls src={compressedVideoUrl} style={{ maxWidth: '100%', maxHeight: '400px' }}>
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>ℹ️ About Video Compression</h3>
          <ul>
            <li>Uses advanced H.264 encoding with optimal settings for quality</li>
            <li>Maintains video resolution and frame rate</li>
            <li>Automatically adjusts bitrate to achieve target file size</li>
            <li>Supports all common video formats</li>
            <li>Compressed videos are optimized for sharing and storage</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default VideoCompressor

