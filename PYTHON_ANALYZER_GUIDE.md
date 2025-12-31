# Python Comedy Style Analyzer - Complete Setup & Usage Guide

This guide will walk you through setting up and running the Python-based comedy style analyzer with NLP and OpenAI integration.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Environment Setup](#environment-setup)
4. [Preparing Input Data](#preparing-input-data)
5. [Running the Script](#running-the-script)
6. [Understanding the Output](#understanding-the-output)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- **Python 3.8 or higher** installed on your system
- **pip** (Python package installer) - usually comes with Python
- **OpenAI API Key** (optional but recommended for better style classification)
- **Internet connection** (for downloading Spacy models and OpenAI API calls)

### Check Python Installation

Open a terminal/command prompt and run:

```bash
python --version
# OR
python3 --version
```

You should see something like `Python 3.8.x` or higher. If not, download Python from [python.org](https://www.python.org/downloads/).

---

## Installation Steps

### Step 1: Navigate to Project Directory

Open a terminal and navigate to the project folder:

```bash
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app
```

### Step 2: Create Virtual Environment (Recommended)

Creating a virtual environment isolates dependencies and prevents conflicts:

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

You should see `(venv)` appear in your terminal prompt, indicating the virtual environment is active.

### Step 3: Install Required Packages

Install all required Python packages:

```bash
pip install -r requirements.txt
```

This installs:
- `spacy>=3.7.0` - Natural Language Processing library
- `openai>=1.0.0` - OpenAI API client
- `python-dotenv>=1.0.0` - Environment variable management

### Step 4: Download Spacy Language Model

Spacy needs a language model for NLP tasks. Download the English model:

```bash
python -m spacy download en_core_web_sm
```

**Note:** This downloads approximately 15-20 MB. The download happens automatically.

### Step 5: Verify Installation

Verify everything is installed correctly:

```bash
python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('Spacy OK')"
python -c "import openai; print('OpenAI OK')"
```

If both commands complete without errors, you're ready to proceed!

---

## Environment Setup

### Setting Up OpenAI API Key (Optional but Recommended)

The script works without OpenAI (using keyword-based classification), but OpenAI provides much more accurate style classification.

#### Option 1: Environment Variable (Recommended)

**On macOS/Linux:**
```bash
export OPENAI_API_KEY="your-api-key-here"
```

**On Windows (Command Prompt):**
```cmd
set OPENAI_API_KEY=your-api-key-here
```

**On Windows (PowerShell):**
```powershell
$env:OPENAI_API_KEY="your-api-key-here"
```

#### Option 2: Create .env File

Create a file named `.env` in the project directory:

```bash
# .env file
OPENAI_API_KEY=your-api-key-here
```

Then modify the script to load it (if not already done):

```python
from dotenv import load_dotenv
load_dotenv()
```

#### Getting an OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy and save it securely (you won't see it again!)

**Important:** Keep your API key secret! Never commit it to Git.

---

## Preparing Input Data

The script expects a JSON file with transcript data. Here's the format:

### Required Format

Create a file (e.g., `transcript.json`) with this structure:

```json
{
  "text": "Full transcript text here. This is a complete comedy set transcript with all the jokes and stories told during the performance.",
  "words": [
    {"text": "I", "start": 0, "end": 100},
    {"text": "was", "start": 100, "end": 200},
    {"text": "at", "start": 200, "end": 300},
    {"text": "the", "start": 300, "end": 400},
    {"text": "store", "start": 400, "end": 600},
    {"text": "yesterday", "start": 600, "end": 900}
  ]
}
```

### Field Descriptions

- **`text`** (required): Full transcript as a single string
- **`words`** (optional but recommended): Array of word objects with timestamps
  - `text`: The word itself
  - `start`: Start time in milliseconds (e.g., 1000 = 1 second)
  - `end`: End time in milliseconds

### Creating Transcript Data from AssemblyAI

If you're using AssemblyAI (like in the main app), you can extract the data:

```python
# Example: Convert AssemblyAI response to our format
import json

assemblyai_response = {
    "text": "Your full transcript...",
    "words": [
        {"text": "word", "start": 0, "end": 100}
    ]
}

# Save to file
with open('transcript.json', 'w') as f:
    json.dump(assemblyai_response, f, indent=2)
```

### Minimal Example (Text Only)

If you only have the text (no word timestamps), that's okay too:

```json
{
  "text": "I was at the store yesterday and this crazy thing happened..."
}
```

The script will segment by sentences instead of pauses.

### Example Transcript File

Save this as `example_transcript.json`:

```json
{
  "text": "I went to the grocery store the other day, and I noticed something weird. People are buying way too much toilet paper. Like, are you planning on hosting a party for your digestive system? Then I realized, wait, I'm also buying a lot of toilet paper. I'm part of the problem! That's when it hit me - self-awareness is just realizing you're the main character in your own sitcom.",
  "words": [
    {"text": "I", "start": 0, "end": 50},
    {"text": "went", "start": 50, "end": 200},
    {"text": "to", "start": 200, "end": 250},
    {"text": "the", "start": 250, "end": 300},
    {"text": "grocery", "start": 300, "end": 600},
    {"text": "store", "start": 600, "end": 900}
  ]
}
```

---

## Running the Script

### Basic Usage

Once everything is set up, run the script with your transcript file:

```bash
python comedy_style_analyzer.py transcript.json
```

Or if using Python 3 explicitly:

```bash
python3 comedy_style_analyzer.py transcript.json
```

### Complete Example Workflow

```bash
# 1. Navigate to project directory
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app

# 2. Activate virtual environment (if using one)
source venv/bin/activate

# 3. Set OpenAI API key (if using OpenAI)
export OPENAI_API_KEY="sk-your-key-here"

# 4. Run the analyzer
python comedy_style_analyzer.py example_transcript.json
```

### What Happens During Execution

1. **Loading:** Script loads the JSON file
2. **Segmenting:** Divides transcript into "bits" using pauses (or sentences)
3. **Style Classification:** 
   - If OpenAI key is set: Uses GPT-3.5-turbo for zero-shot classification
   - Otherwise: Uses keyword-based classification
4. **Bloom Tools Analysis:** Detects Seesaw Theory, Balloon Pop, Word Smuggling, Toppers, and Trimming
5. **Syllable Counting:** Counts syllables for efficiency calculations
6. **Output:** Saves results to `transcript_analyzed.json`

### Console Output

You'll see progress information:

```
Analysis complete! Results saved to example_transcript_analyzed.json

Segments analyzed: 5
Total syllables: 342

Most common styles:
  Observational: 3
  Self-deprecation: 2
  Playful: 1

Adam Bloom Tools Detected:
  Seesaw Theory: 2
  Balloon Pop: 1
  Word Smuggling: 0
  Toppers: 1
```

---

## Understanding the Output

The script generates a JSON file (e.g., `transcript_analyzed.json`) with detailed analysis.

### Output Structure

```json
{
  "segments": [
    {
      "text": "I went to the grocery store...",
      "start_time": 0.0,
      "end_time": 5.2,
      "styles": ["Observational", "Self-deprecation"],
      "style_scores": {
        "Observational": 0.85,
        "Self-deprecation": 0.72,
        "Playful": 0.45,
        ...
      },
      "seesaw_detected": true,
      "balloon_pop_detected": false,
      "word_smuggling_detected": false,
      "topper_detected": false,
      "trimming_opportunities": [
        "Remove filler: 'like'",
        "Remove filler: 'you know'"
      ],
      "syllable_count": 68,
      "bloom_efficiency_score": null
    }
  ],
  "overall_statistics": {
    "total_segments": 5,
    "total_syllables": 342,
    "most_common_styles": [
      ["Observational", 3],
      ["Self-deprecation", 2],
      ["Playful", 1]
    ],
    "seesaw_detections": 2,
    "balloon_pop_detections": 1,
    "word_smuggling_detections": 0,
    "topper_detections": 1
  }
}
```

### Key Fields Explained

#### Segment Fields

- **`text`**: The actual text of this comedy bit
- **`start_time`** / **`end_time`**: Timing in seconds (if word timestamps provided)
- **`styles`**: List of applicable comedy styles (top matches)
- **`style_scores`**: Confidence scores (0.0-1.0) for all 18 styles
- **`seesaw_detected`**: Whether Seesaw Theory pattern is found
- **`balloon_pop_detected`**: Whether Balloon Pop pattern is found
- **`word_smuggling_detected`**: Whether Word Smuggling is detected
- **`topper_detected`**: Whether this is a follow-up joke (topper)
- **`trimming_opportunities`**: List of redundant words/phrases to remove
- **`syllable_count`**: Total syllables in this segment
- **`bloom_efficiency_score`**: Laughs/Syllables ratio (requires laugh data)

#### Overall Statistics

- **`total_segments`**: Number of comedy bits identified
- **`total_syllables`**: Total syllables across all segments
- **`most_common_styles`**: Top 5 styles with frequency counts
- **`seesaw_detections`**: Count of Seesaw Theory instances
- **`balloon_pop_detections`**: Count of Balloon Pop instances
- **`word_smuggling_detections`**: Count of Word Smuggling instances
- **`topper_detections`**: Count of Topper instances

---

## Advanced Usage

### Customizing Pause Threshold

By default, segments are created at pauses ≥ 1.5 seconds. Modify the script:

```python
# In the script, change this line:
segments = segment_by_pauses(transcript_data, pause_threshold=2.0)  # 2 seconds
```

Or modify the function call in `analyze_comedy_transcript()`:

```python
results = analyze_comedy_transcript(transcript_data, pause_threshold=2.0)
```

### Using as a Python Module

You can import and use the functions in other scripts:

```python
from comedy_style_analyzer import (
    analyze_comedy_transcript,
    segment_by_pauses,
    classify_styles_zero_shot,
    detect_seesaw_theory,
    detect_balloon_pop,
    count_syllables
)

# Use functions directly
transcript = {"text": "Your transcript here..."}
results = analyze_comedy_transcript(transcript)
print(results['overall_statistics'])
```

### Batch Processing Multiple Transcripts

Create a script to process multiple files:

```python
import json
import glob
from comedy_style_analyzer import analyze_comedy_transcript

# Process all JSON files in a directory
for transcript_file in glob.glob("transcripts/*.json"):
    with open(transcript_file, 'r') as f:
        transcript_data = json.load(f)
    
    results = analyze_comedy_transcript(transcript_data)
    
    output_file = transcript_file.replace('.json', '_analyzed.json')
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Processed: {transcript_file}")
```

### Calculating Bloom Efficiency Score

To calculate efficiency scores, you need laugh data. Modify the script:

```python
# Add laugh count to each segment
for segment in segments:
    laugh_count = get_laugh_count_for_segment(segment)  # Your function
    segment.bloom_efficiency_score = calculate_bloom_efficiency(
        segment, laugh_count
    )
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "OSError: Can't find model 'en_core_web_sm'"

**Problem:** Spacy model not downloaded.

**Solution:**
```bash
python -m spacy download en_core_web_sm
```

If that doesn't work, try:
```bash
python3 -m spacy download en_core_web_sm
```

#### 2. "ModuleNotFoundError: No module named 'spacy'"

**Problem:** Dependencies not installed.

**Solution:**
```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install spacy openai python-dotenv
```

#### 3. "OpenAI API error: Invalid API key"

**Problem:** API key is incorrect or not set.

**Solution:**
- Check that your API key is correct
- Verify it's set in environment: `echo $OPENAI_API_KEY`
- Make sure you're using the key, not the secret
- The script will fall back to keyword-based classification if OpenAI fails

#### 4. "FileNotFoundError: transcript.json"

**Problem:** Transcript file path is incorrect.

**Solution:**
- Check the file path is correct
- Use absolute path: `python comedy_style_analyzer.py /full/path/to/transcript.json`
- Or ensure you're in the right directory

#### 5. "JSONDecodeError: Expecting value"

**Problem:** JSON file is malformed.

**Solution:**
- Validate JSON format: Use an online JSON validator
- Check for missing commas, brackets, quotes
- Ensure proper encoding (UTF-8)

#### 6. Script Runs But Produces Empty Results

**Problem:** Transcript text might be empty or very short.

**Solution:**
- Verify transcript has actual content
- Check that `text` field in JSON is not empty
- Minimum recommended length: 50+ words for meaningful analysis

#### 7. Slow Performance

**Problem:** OpenAI API calls are slow.

**Solution:**
- OpenAI API calls take 2-5 seconds per classification
- For faster testing, remove OpenAI key to use keyword-based classification
- Consider batching multiple segments in one API call (advanced)

#### 8. Virtual Environment Issues

**Problem:** Packages installed globally instead of in venv.

**Solution:**
```bash
# Deactivate and recreate venv
deactivate
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Getting Help

If you encounter issues:

1. **Check Python version:** `python --version` (need 3.8+)
2. **Verify installations:** `pip list | grep -E "spacy|openai"`
3. **Test Spacy:** `python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('OK')"`
4. **Check file encoding:** Ensure JSON is UTF-8
5. **Review error messages:** They usually point to the issue

### Performance Tips

- **Without OpenAI:** Fast (keyword-based, ~1 second)
- **With OpenAI:** Slower but more accurate (~5-10 seconds per segment)
- **Large transcripts:** Consider splitting into smaller chunks
- **Batch processing:** Process multiple files in parallel (advanced)

---

## Example Workflow (Complete)

Here's a complete end-to-end example:

```bash
# 1. Setup (one-time)
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
export OPENAI_API_KEY="sk-your-key-here"

# 2. Create transcript file
cat > my_transcript.json << 'EOF'
{
  "text": "I noticed something funny at the coffee shop yesterday. Everyone was looking at their phones while waiting in line. Like, we're all here to get the same thing, why are we pretending we're not? Then I realized I was also on my phone. I'm part of the problem!",
  "words": [
    {"text": "I", "start": 0, "end": 50},
    {"text": "noticed", "start": 50, "end": 300}
  ]
}
EOF

# 3. Run analysis
python comedy_style_analyzer.py my_transcript.json

# 4. View results
cat my_transcript_analyzed.json | python -m json.tool
```

---

## Next Steps

After running the analyzer:

1. **Review Results:** Open the `*_analyzed.json` file
2. **Interpret Scores:** Higher style scores (0.7+) indicate strong presence
3. **Use Bloom Tools:** Look for trimming opportunities to improve efficiency
4. **Compare Performances:** Analyze multiple sets to track style evolution
5. **Refine Material:** Use insights to improve joke structure and delivery

The analysis provides actionable insights for improving your comedy writing and performance!

