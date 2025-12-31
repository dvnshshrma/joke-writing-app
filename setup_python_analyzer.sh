#!/bin/bash

# Quick Setup Script for Python Comedy Style Analyzer
# Run this script to set up everything needed for the analyzer

echo "🎭 Python Comedy Style Analyzer - Setup Script"
echo "================================================"
echo ""

# Check Python version
echo "1. Checking Python installation..."
if command -v python3.12 &> /dev/null; then
    PYTHON_VERSION=$(python3.12 --version)
    echo "   ✅ Found: $PYTHON_VERSION (recommended)"
    PYTHON_CMD="python3.12"
elif command -v python3.11 &> /dev/null; then
    PYTHON_VERSION=$(python3.11 --version)
    echo "   ✅ Found: $PYTHON_VERSION (recommended)"
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    PYTHON_MAJOR=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    if (( $(echo "$PYTHON_MAJOR >= 3.14" | bc -l 2>/dev/null || echo "0") )); then
        echo "   ⚠️  Found: $PYTHON_VERSION"
        echo "   ⚠️  WARNING: Python 3.14+ may have compatibility issues with Spacy"
        echo "   💡 Recommended: Use Python 3.11 or 3.12 for best compatibility"
        read -p "   Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "   Please install Python 3.11 or 3.12 and run this script again"
            exit 1
        fi
    else
        echo "   ✅ Found: $PYTHON_VERSION"
    fi
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo "   ✅ Found: $PYTHON_VERSION"
    PYTHON_CMD="python"
else
    echo "   ❌ Python not found. Please install Python 3.8-3.13 from python.org"
    echo "   💡 Recommended: Python 3.11 or 3.12 for best compatibility"
    exit 1
fi

# Check if virtual environment exists
echo ""
echo "2. Setting up virtual environment..."
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    $PYTHON_CMD -m venv venv
    echo "   ✅ Virtual environment created"
else
    echo "   ✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "   Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "3. Upgrading pip..."
pip install --upgrade pip --quiet

# Install requirements
echo ""
echo "4. Installing required packages..."
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo "   ✅ Packages installed successfully"
else
    echo "   ❌ Failed to install packages"
    exit 1
fi

# Download Spacy model
echo ""
echo "5. Downloading Spacy language model..."
$PYTHON_CMD -m spacy download en_core_web_sm --quiet
if [ $? -eq 0 ]; then
    echo "   ✅ Spacy model downloaded"
else
    echo "   ⚠️  Failed to download Spacy model. You can download it manually:"
    echo "      python -m spacy download en_core_web_sm"
fi

# Check for OpenAI API key
echo ""
echo "6. Checking for OpenAI API key..."
if [ -z "$OPENAI_API_KEY" ]; then
    echo "   ⚠️  OPENAI_API_KEY not set in environment"
    echo "   The analyzer will use keyword-based classification (still works!)"
    echo ""
    read -p "   Do you want to set it now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "   Enter your OpenAI API key: " api_key
        export OPENAI_API_KEY="$api_key"
        echo "   ✅ API key set for this session"
        echo "   💡 Tip: Add 'export OPENAI_API_KEY=\"your-key\"' to ~/.bashrc or ~/.zshrc for permanent setup"
    fi
else
    echo "   ✅ OPENAI_API_KEY found in environment"
fi

# Create example transcript
echo ""
echo "7. Creating example transcript file..."
cat > example_transcript.json << 'EOF'
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
EOF
echo "   ✅ Created example_transcript.json"

# Final instructions
echo ""
echo "================================================"
echo "✅ Setup Complete!"
echo ""
echo "To run the analyzer:"
echo "  1. Activate virtual environment:"
echo "     source venv/bin/activate"
echo ""
echo "  2. Run with example transcript:"
echo "     python comedy_style_analyzer.py example_transcript.json"
echo ""
echo "  3. Or with your own transcript:"
echo "     python comedy_style_analyzer.py your_transcript.json"
echo ""
echo "For detailed instructions, see: PYTHON_ANALYZER_GUIDE.md"
echo "================================================"

