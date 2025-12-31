# Fix for Python 3.14 Compatibility Issue

## Problem
Python 3.14 is too new and Spacy's dependencies (Pydantic v1) are not compatible with it yet.

## Solution: Use Python 3.11 or 3.12

### Option 1: Install Python 3.12 (Recommended)

**On macOS (using Homebrew):**
```bash
brew install python@3.12
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

**On macOS (using pyenv - Recommended for managing multiple Python versions):**
```bash
# Install pyenv if you don't have it
brew install pyenv

# Install Python 3.12
pyenv install 3.12.7

# Set it for this project
cd /Users/mcdeav/Desktop/portfolio/joke-writing-app
pyenv local 3.12.7

# Create venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

**On Linux:**
```bash
# Install Python 3.12
sudo apt update
sudo apt install python3.12 python3.12-venv

# Create venv
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

**On Windows:**
1. Download Python 3.12 from [python.org](https://www.python.org/downloads/)
2. Install it (check "Add Python to PATH")
3. Open Command Prompt:
```cmd
python3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### Option 2: Use the Script Without Spacy (Basic Mode)

The script will now work without Spacy, but with reduced functionality:

- ✅ Style classification (keyword-based)
- ✅ Syllable counting (basic algorithm)
- ✅ Adam Bloom tool detection (basic heuristics)
- ❌ Advanced NLP parsing (requires Spacy)
- ❌ Some advanced Bloom tool detections

Just run it:
```bash
python comedy_style_analyzer.py example_transcript.json
```

It will automatically fall back to basic mode if Spacy isn't available.

### Option 3: Wait for Spacy Update

Spacy and its dependencies are being updated to support Python 3.14. Check for updates:
```bash
pip install --upgrade spacy
```

## Quick Fix (Use Existing Python 3.12 if Available)

Check if you have Python 3.12 installed:
```bash
python3.12 --version
```

If it exists, use it:
```bash
# Remove old venv
rm -rf venv

# Create new venv with Python 3.12
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Verify Python Version

Check your current Python version:
```bash
python --version
python3 --version
which python
```

## Recommended Setup

For the best experience, use **Python 3.11 or 3.12**:
- ✅ Full Spacy support
- ✅ All NLP features
- ✅ Stable and well-tested
- ✅ Compatible with all dependencies

## Test the Fix

After switching to Python 3.11/3.12:
```bash
source venv/bin/activate
python comedy_style_analyzer.py example_transcript.json
```

You should see no errors and full analysis results!

