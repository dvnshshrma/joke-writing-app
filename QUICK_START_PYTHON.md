# Quick Start - Python Comedy Style Analyzer

## Fastest Way to Get Started (3 Steps)

### Step 1: Run Setup Script

```bash
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app
./setup_python_analyzer.sh
```

This automatically:
- ✅ Checks Python installation
- ✅ Creates virtual environment
- ✅ Installs all dependencies
- ✅ Downloads Spacy model
- ✅ Creates example transcript

### Step 2: Activate Virtual Environment

```bash
source venv/bin/activate
```

You'll see `(venv)` in your terminal prompt.

### Step 3: Run the Analyzer

```bash
# Test with example transcript
python comedy_style_analyzer.py example_transcript.json

# Or with your own transcript
python comedy_style_analyzer.py your_transcript.json
```

Results will be saved to `*_analyzed.json`

---

## Manual Setup (If Script Doesn't Work)

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install packages
pip install -r requirements.txt

# 3. Download Spacy model
python -m spacy download en_core_web_sm

# 4. (Optional) Set OpenAI API key
export OPENAI_API_KEY="your-key-here"

# 5. Run analyzer
python comedy_style_analyzer.py example_transcript.json
```

---

## Transcript Format

Create a JSON file with your transcript:

```json
{
  "text": "Your full transcript text here...",
  "words": [
    {"text": "word", "start": 0, "end": 100}
  ]
}
```

The `words` array is optional - you can just provide `text` if you don't have timestamps.

---

## Need More Help?

See the complete guide: **PYTHON_ANALYZER_GUIDE.md**

It includes:
- Detailed installation steps
- Troubleshooting
- Advanced usage
- Output interpretation
- Batch processing

