# FFmpeg.wasm Setup Instructions

## Overview

We've upgraded the video-to-audio conversion to use **FFmpeg.wasm** for professional-grade, high-quality conversion. This replaces the previous low-quality MediaRecorder approach.

## Installation

Run the following command to install the required packages:

```bash
npm install @ffmpeg/ffmpeg@^0.12.10 @ffmpeg/util@^0.12.1
```

## Features

### High-Quality Conversion
- **192 kbps bitrate** (vs previous 24 kbps) - 8x better quality!
- **44.1kHz sample rate** - CD quality audio
- **MP3 format** - Better compatibility with AssemblyAI
- **Stereo audio** - Preserves original audio channels

### Professional Tools
- Uses FFmpeg (industry-standard video/audio processing)
- Better codec support
- More reliable conversion
- Progress tracking during conversion

## How It Works

1. **FFmpeg.wasm loads** (first time only, ~10MB download)
2. **Video file is processed** using FFmpeg
3. **High-quality MP3 audio is extracted**
4. **Progress bar shows conversion status**

## User Experience

- First conversion: May take a moment to load FFmpeg (~10MB download)
- Subsequent conversions: Fast processing
- Progress indicator: Shows conversion percentage
- Quality: Much better audio quality for transcription

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (may be slower)
- Mobile browsers: ✅ Supported

## Performance

- Conversion is done client-side (no server load)
- Progress is tracked and displayed
- Memory-efficient processing
- Faster than real-time playback method

## Troubleshooting

### FFmpeg fails to load
- Check internet connection (needs to download ~10MB initially)
- Try refreshing the page
- Clear browser cache

### Conversion is slow
- Large videos take longer to process
- First conversion includes FFmpeg download
- This is normal for high-quality conversion

### Out of memory errors
- Try converting smaller video files
- Close other browser tabs
- Restart browser if needed

## Technical Details

### FFmpeg Arguments Used
```
-i input.video          # Input video file
-vn                     # No video output
-acodec libmp3lame      # MP3 audio codec
-ac 2                   # Stereo (2 channels)
-ar 44100               # 44.1kHz sample rate
-b:a 192k               # 192 kbps bitrate
-q:a 2                  # High quality VBR encoding
output.mp3              # Output file
```

### Quality Comparison

**Old Method (MediaRecorder):**
- 24 kbps bitrate
- WebM/Opus format
- Real-time processing (slow)
- Quality loss from re-encoding

**New Method (FFmpeg.wasm):**
- 192 kbps bitrate (8x better)
- MP3 format (better compatibility)
- Faster processing
- Professional-grade conversion

## Benefits

1. **Much Better Quality**: 8x higher bitrate
2. **Better Format**: MP3 is more compatible with AssemblyAI
3. **Progress Tracking**: Users see conversion progress
4. **Professional Tool**: Industry-standard FFmpeg
5. **Reliable**: Better error handling and codec support

