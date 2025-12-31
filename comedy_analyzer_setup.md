# Comedy Style Analyzer Setup

## Python Analyzer (Standalone Tool)

This Python script provides advanced NLP-based comedy analysis using Spacy and OpenAI.

### Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Download Spacy English model
python -m spacy download en_core_web_sm

# Set OpenAI API key (optional, for zero-shot classification)
export OPENAI_API_KEY="your-api-key-here"
```

### Usage

```bash
python comedy_style_analyzer.py transcript.json
```

The script will output an analyzed JSON file with:
- Segmented bits (by pauses)
- Style classifications (18 styles)
- Adam Bloom tool detections (Seesaw, Balloon Pop, Word Smuggling, Toppers, Trimming)
- Syllable counts
- Bloom Efficiency Score (if laugh data provided)

### Transcript JSON Format

```json
{
  "text": "Full transcript text here...",
  "words": [
    {"text": "word", "start": 0, "end": 100},
    {"text": "another", "start": 100, "end": 300}
  ]
}
```

## Integration with JavaScript Implementation

The existing JavaScript implementation in `api/index.js` can be enhanced to use similar techniques. For production use, consider:

1. **Zero-Shot Classification**: Already using OpenAI API for style classification (can be enhanced)
2. **Syllable Counting**: Can be implemented in JavaScript (simpler heuristic)
3. **Adam Bloom Tools**: Detection logic can be ported to JavaScript

### Next Steps

1. Create a Python microservice (FastAPI) for advanced analysis
2. Enhance JavaScript implementation with improved heuristics
3. Integrate OpenAI for zero-shot classification in the existing endpoint

