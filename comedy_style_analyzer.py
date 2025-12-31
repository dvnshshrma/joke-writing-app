"""
Stand-Up Comedy Style Analyzer
Expert NLP-based analyzer for comedy transcripts using Spacy and OpenAI
"""

import json
import re
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict
import spacy
import openai
from collections import Counter
import os
from dotenv import load_dotenv

# Load environment variables from .env file (if exists)
load_dotenv()

# Load spacy model (run: python -m spacy download en_core_web_sm)
# Note: Spacy may not be compatible with Python 3.14+. Use Python 3.8-3.13 for best results.
nlp = None
try:
    nlp = spacy.load("en_core_web_sm")
except (OSError, ImportError, Exception) as e:
    print("⚠️  Spacy not available or model not found.")
    print(f"   Error: {str(e)}")
    print("   Falling back to basic text processing (syllable counting and keyword matching).")
    print("   For full NLP features, use Python 3.8-3.13 and install: python -m spacy download en_core_web_sm")
    nlp = None

# OpenAI API key (set via environment variable or .env file)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
else:
    print("ℹ️  OpenAI API key not found. Using keyword-based classification instead.")
    print("   Set OPENAI_API_KEY environment variable for more accurate style classification.")

# Comedy Styles
COMEDY_STYLES = [
    "Anecdotal", "Clowning", "Edgy", "Fantastical", "Heartfelt", 
    "Observational", "Opinionated", "Playful", "Puns", "Philosophical", 
    "Sarcasm", "Satire", "Self-deprecation", "Shock", "Superiority", 
    "Surrealism", "Tragedy", "Wordplay"
]

# Vowel patterns for syllable counting
VOWELS = set("aeiouAEIOU")


@dataclass
class BitSegment:
    """Represents a single comedy bit/segment"""
    text: str
    start_time: float
    end_time: float
    styles: List[str]
    style_scores: Dict[str, float]
    seesaw_detected: bool
    balloon_pop_detected: bool
    word_smuggling_detected: bool
    topper_detected: bool
    trimming_opportunities: List[str]
    syllable_count: int
    bloom_efficiency_score: Optional[float] = None  # Laughs / Syllables


def count_syllables(word: str) -> int:
    """Count syllables in a word using vowel pattern matching"""
    if not word:
        return 0
    
    word = word.lower().strip()
    if not word:
        return 1  # Default to 1 syllable
    
    # Remove common suffixes that don't count as syllables
    word = re.sub(r'[^a-z]', '', word)
    if len(word) <= 2:
        return 1
    
    # Count vowel groups
    vowels = re.findall(r'[aeiou]+', word)
    count = len(vowels)
    
    # Adjust for silent 'e' at end
    if word.endswith('e') and count > 1:
        count -= 1
    
    # Adjust for diphthongs and special cases
    if re.search(r'[aeiou]{2}', word):
        # Some diphthongs count as one syllable
        diphthongs = len(re.findall(r'[aeiou]{2}', word))
        count = max(1, count - diphthongs + 1)
    
    return max(1, count)


def segment_by_pauses(transcript_data: Dict, pause_threshold: float = 1.5) -> List[BitSegment]:
    """
    Segment transcript by pauses (beats) between words
    Args:
        transcript_data: JSON with 'text' and 'words' array (with timestamps)
        pause_threshold: Minimum pause in seconds to create a segment break
    """
    words = transcript_data.get('words', [])
    if not words:
        # Fallback: segment by sentences if no word timestamps
        doc = nlp(transcript_data.get('text', '')) if nlp else None
        if doc:
            segments = []
            for sent in doc.sents:
                segments.append(BitSegment(
                    text=sent.text.strip(),
                    start_time=0.0,
                    end_time=0.0,
                    styles=[],
                    style_scores={},
                    seesaw_detected=False,
                    balloon_pop_detected=False,
                    word_smuggling_detected=False,
                    topper_detected=False,
                    trimming_opportunities=[],
                    syllable_count=sum(count_syllables(str(token)) for token in sent)
                ))
            return segments
        return []
    
    segments = []
    current_segment_words = []
    last_end = None
    
    for i, word_data in enumerate(words):
        word_text = word_data.get('text', word_data.get('word', ''))
        word_start = word_data.get('start', 0) / 1000.0  # Convert ms to seconds
        word_end = word_data.get('end', word_data.get('start', 0)) / 1000.0
        
        # Check for pause (beat)
        if last_end is not None and word_start - last_end >= pause_threshold:
            # Create segment from accumulated words
            if current_segment_words:
                segment_text = ' '.join(w.get('text', w.get('word', '')) for w in current_segment_words)
                segment_start = current_segment_words[0].get('start', 0) / 1000.0
                segment_end = current_segment_words[-1].get('end', current_segment_words[-1].get('start', 0)) / 1000.0
                
                segments.append(BitSegment(
                    text=segment_text,
                    start_time=segment_start,
                    end_time=segment_end,
                    styles=[],
                    style_scores={},
                    seesaw_detected=False,
                    balloon_pop_detected=False,
                    word_smuggling_detected=False,
                    topper_detected=False,
                    trimming_opportunities=[],
                    syllable_count=sum(count_syllables(w.get('text', w.get('word', ''))) for w in current_segment_words)
                ))
                current_segment_words = []
        
        current_segment_words.append(word_data)
        last_end = word_end
    
    # Add final segment
    if current_segment_words:
        segment_text = ' '.join(w.get('text', w.get('word', '')) for w in current_segment_words)
        segment_start = current_segment_words[0].get('start', 0) / 1000.0
        segment_end = current_segment_words[-1].get('end', current_segment_words[-1].get('start', 0)) / 1000.0
        segments.append(BitSegment(
            text=segment_text,
            start_time=segment_start,
            end_time=segment_end,
            styles=[],
            style_scores={},
            seesaw_detected=False,
            balloon_pop_detected=False,
            word_smuggling_detected=False,
            topper_detected=False,
            trimming_opportunities=[],
            syllable_count=sum(count_syllables(w.get('text', w.get('word', ''))) for w in current_segment_words)
        ))
    
    return segments


def classify_styles_zero_shot(bit_text: str) -> Dict[str, float]:
    """
    Use OpenAI GPT for zero-shot classification of comedy styles
    Returns dictionary of style -> confidence score (0-1)
    """
    if not OPENAI_API_KEY:
        # Fallback: keyword-based classification
        return classify_styles_keyword(bit_text)
    
    try:
        styles_str = ", ".join(COMEDY_STYLES)
        prompt = f"""Analyze this comedy bit and classify which comedy styles apply.
Rate each style from 0.0 to 1.0 based on how strongly it applies.

Comedy Bit: "{bit_text}"

Available Styles: {styles_str}

Respond with a JSON object where keys are style names and values are scores (0.0-1.0).
Example: {{"Observational": 0.9, "Sarcasm": 0.7, "Self-deprecation": 0.5}}
"""
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert comedy analyst. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        result_text = response.choices[0].message.content.strip()
        # Extract JSON from response (handle markdown code blocks)
        json_match = re.search(r'\{[^}]+\}', result_text)
        if json_match:
            scores = json.loads(json_match.group())
            # Normalize scores to 0-1 range
            normalized = {style: min(1.0, max(0.0, float(scores.get(style, 0)))) for style in COMEDY_STYLES}
            return normalized
        
    except Exception as e:
        print(f"OpenAI API error: {e}, falling back to keyword classification")
    
    # Fallback to keyword-based
    return classify_styles_keyword(bit_text)


def classify_styles_keyword(bit_text: str) -> Dict[str, float]:
    """Fallback keyword-based style classification"""
    text_lower = bit_text.lower()
    scores = {}
    
    style_keywords = {
        "Anecdotal": ["story", "happened", "one time", "remember", "when i", "told me", "went to"],
        "Clowning": ["silly", "ridiculous", "absurd", "goofy", "funny", "weird", "strange"],
        "Edgy": ["damn", "hell", "fuck", "shit", "controversial", "offensive", "dark"],
        "Fantastical": ["imagine", "magic", "fantasy", "dream", "unreal", "impossible"],
        "Heartfelt": ["love", "family", "heart", "feelings", "emotion", "touching"],
        "Observational": ["notice", "did you ever", "what is it with", "why is it", "people"],
        "Opinionated": ["think", "believe", "opinion", "should", "wrong", "right", "stupid"],
        "Playful": ["play", "fun", "joke", "teasing", "banter", "cheeky", "witty"],
        "Puns": ["pun", "play on words", "double meaning", "wordplay"],
        "Philosophical": ["meaning", "life", "exist", "universe", "reality", "truth", "deep"],
        "Sarcasm": ["yeah right", "sure", "obviously", "totally", "great", "perfect"],
        "Satire": ["society", "politics", "government", "system", "mock", "parody"],
        "Self-deprecation": ["i'm so", "i'm terrible", "i suck", "i'm bad", "pathetic", "loser"],
        "Shock": ["what the", "holy", "unbelievable", "incredible", "amazing", "wow"],
        "Superiority": ["better than", "smarter", "above", "superior", "i'm better"],
        "Surrealism": ["surreal", "dreamlike", "bizarre", "abstract", "unrealistic"],
        "Tragedy": ["sad", "tragic", "depressing", "miserable", "unfortunate", "suffering"],
        "Wordplay": ["word", "pun", "double", "meaning", "play on", "clever", "wit"]
    }
    
    word_count = len(text_lower.split())
    
    for style, keywords in style_keywords.items():
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        score = min(1.0, (matches * 1.5) / max(1, word_count / 10))
        scores[style] = score
    
    return scores


def detect_seesaw_theory(text: str) -> bool:
    """
    Seesaw Theory: Setup should be longer (more syllables) than punchline
    Look for sentences where the last clause/sentence is shorter than the setup
    """
    if not nlp:
        return False
    
    doc = nlp(text)
    sentences = list(doc.sents)
    
    if len(sentences) < 2:
        return False
    
    # Compare setup (first part) vs punchline (last part)
    setup_text = ' '.join(str(s) for s in sentences[:-1])
    punchline_text = str(sentences[-1])
    
    setup_syllables = sum(count_syllables(str(token)) for token in nlp(setup_text) if token.is_alpha)
    punchline_syllables = sum(count_syllables(str(token)) for token in nlp(punchline_text) if token.is_alpha)
    
    # Seesaw: setup > punchline (punchline should be shorter)
    if setup_syllables > 0 and punchline_syllables > 0:
        ratio = punchline_syllables / setup_syllables
        return ratio < 0.7  # Punchline is 30%+ shorter than setup
    
    return False


def detect_balloon_pop(text: str) -> bool:
    """
    Balloon Pop: Tension builds, then releases at a specific word/phrase (the reveal)
    Look for patterns: buildup phrases followed by a reveal word/phrase
    """
    if not nlp:
        return False
    
    # Patterns that indicate tension building
    buildup_patterns = [
        r"(so|then|and|but|until|when|suddenly)\s+[^.!?]{10,}",
        r"(turns out|actually|really|just|only)",
        r"(wait|hold on|no way|you know what)"
    ]
    
    # Reveal indicators (words that often signal the pop)
    reveal_indicators = [
        r"\b(just|only|actually|really|turns out|but|however)\b",
        r"\b(not|never|no|nobody|nothing)\b",
        r"\b(was|is|are|were)\s+\w+ing",  # Passive reveals
    ]
    
    text_lower = text.lower()
    
    # Check for buildup + reveal pattern
    has_buildup = any(re.search(pattern, text_lower) for pattern in buildup_patterns)
    has_reveal = any(re.search(pattern, text_lower) for pattern in reveal_indicators)
    
    if has_buildup and has_reveal:
        # Check if reveal comes after buildup
        buildup_positions = [m.end() for pattern in buildup_patterns for m in re.finditer(pattern, text_lower)]
        reveal_positions = [m.start() for pattern in reveal_indicators for m in re.finditer(pattern, text_lower)]
        
        if buildup_positions and reveal_positions:
            # At least one reveal should come after a buildup
            return any(rev > build for build in buildup_positions for rev in reveal_positions)
    
    return False


def detect_word_smuggling(text: str) -> bool:
    """
    Word Smuggling: Punchline word hidden inside a casual sentence
    Look for sentences where a key word seems out of place or unexpectedly placed
    """
    if not nlp:
        return False
    
    doc = nlp(text)
    sentences = list(doc.sents)
    
    if not sentences:
        return False
    
    # Focus on last sentence (likely punchline)
    last_sent = sentences[-1]
    
    # Look for words that seem unexpectedly placed
    # (e.g., a noun in a place where you'd expect something else)
    tokens = [token for token in last_sent if token.is_alpha]
    
    if len(tokens) < 3:
        return False
    
    # Check for unusual word ordering or unexpected word types
    # (this is a simplified heuristic - could be improved with more sophisticated parsing)
    for i, token in enumerate(tokens[:-1]):
        next_token = tokens[i + 1]
        # Look for noun-noun pairs or unexpected adj-noun combinations
        if token.pos_ == "NOUN" and next_token.pos_ == "NOUN":
            # Might indicate smuggling
            return True
        # Look for unexpected adjectives before nouns
        if token.pos_ == "ADJ" and i > 0 and tokens[i-1].pos_ not in ["DET", "ADJ"]:
            return True
    
    return False


def detect_toppers(text: str, previous_text: Optional[str] = None) -> bool:
    """
    Toppers: Follow-up jokes on the same premise
    Compare current bit with previous bit to see if they share a premise
    """
    if not previous_text or not nlp:
        return False
    
    current_doc = nlp(text)
    previous_doc = nlp(previous_text)
    
    # Extract key nouns/subjects from both
    current_nouns = {token.lemma_.lower() for token in current_doc if token.pos_ == "NOUN" and token.is_alpha}
    previous_nouns = {token.lemma_.lower() for token in previous_doc if token.pos_ == "NOUN" and token.is_alpha}
    
    # Check for overlap in key nouns
    overlap = current_nouns & previous_nouns
    overlap_ratio = len(overlap) / max(1, min(len(current_nouns), len(previous_nouns)))
    
    # If significant overlap, might be a topper
    return overlap_ratio > 0.3 and len(overlap) >= 2


def detect_trimming_opportunities(text: str) -> List[str]:
    """
    Trimming: Identify redundant syllables/words
    Look for filler words, unnecessary qualifiers, redundant phrases
    """
    if not nlp:
        return []
    
    doc = nlp(text)
    opportunities = []
    
    # Common filler words/phrases
    fillers = ["like", "you know", "um", "uh", "actually", "basically", "literally", 
               "really", "very", "pretty", "quite", "sort of", "kind of", "I mean"]
    
    text_lower = text.lower()
    for filler in fillers:
        if filler in text_lower:
            opportunities.append(f"Remove filler: '{filler}'")
    
    # Look for redundant adjectives
    # (e.g., "really very good" -> "good")
    redundant_patterns = [
        r"\b(really|very|pretty|quite)\s+(really|very|pretty|quite)\s+",
        r"\b(kind of|sort of)\s+\w+",
    ]
    
    for pattern in redundant_patterns:
        matches = re.finditer(pattern, text_lower)
        for match in matches:
            opportunities.append(f"Trim redundant: '{match.group()}'")
    
    # Look for unnecessary qualifiers
    qualifiers = ["I think", "I guess", "I suppose", "maybe", "perhaps", "probably"]
    for qualifier in qualifiers:
        if qualifier in text_lower:
            opportunities.append(f"Consider removing qualifier: '{qualifier}'")
    
    return opportunities


def calculate_bloom_efficiency(bit: BitSegment, laugh_count: int = 0) -> float:
    """
    Bloom Efficiency Score = Number of Laughs / Total Syllables
    Higher score = more efficient (more laughs per syllable)
    """
    if bit.syllable_count == 0:
        return 0.0
    
    return laugh_count / bit.syllable_count


def analyze_comedy_transcript(transcript_json: Dict, pause_threshold: float = 1.5) -> Dict:
    """
    Main analysis function
    Args:
        transcript_json: JSON with 'text' and optional 'words' array
        pause_threshold: Pause duration in seconds to segment bits
    Returns:
        Dictionary with analysis results
    """
    # Segment transcript into bits
    segments = segment_by_pauses(transcript_json, pause_threshold)
    
    # Analyze each segment
    analyzed_segments = []
    previous_text = None
    
    for segment in segments:
        # Classify styles (zero-shot with OpenAI or keyword fallback)
        style_scores = classify_styles_zero_shot(segment.text)
        top_styles = [style for style, score in sorted(style_scores.items(), key=lambda x: x[1], reverse=True) if score > 0.3]
        
        # Detect Adam Bloom tools
        segment.seesaw_detected = detect_seesaw_theory(segment.text)
        segment.balloon_pop_detected = detect_balloon_pop(segment.text)
        segment.word_smuggling_detected = detect_word_smuggling(segment.text)
        segment.topper_detected = detect_toppers(segment.text, previous_text)
        segment.trimming_opportunities = detect_trimming_opportunities(segment.text)
        segment.styles = top_styles
        segment.style_scores = style_scores
        
        # Note: Bloom efficiency requires laugh count (would need separate input)
        # segment.bloom_efficiency_score = calculate_bloom_efficiency(segment, laugh_count)
        
        analyzed_segments.append(asdict(segment))
        previous_text = segment.text
    
    # Overall statistics
    all_styles = Counter()
    for seg in analyzed_segments:
        for style in seg['styles']:
            all_styles[style] += 1
    
    return {
        "segments": analyzed_segments,
        "overall_statistics": {
            "total_segments": len(analyzed_segments),
            "total_syllables": sum(seg['syllable_count'] for seg in analyzed_segments),
            "most_common_styles": all_styles.most_common(5),
            "seesaw_detections": sum(1 for seg in analyzed_segments if seg['seesaw_detected']),
            "balloon_pop_detections": sum(1 for seg in analyzed_segments if seg['balloon_pop_detected']),
            "word_smuggling_detections": sum(1 for seg in analyzed_segments if seg['word_smuggling_detected']),
            "topper_detections": sum(1 for seg in analyzed_segments if seg['topper_detected']),
        }
    }


# CLI usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python comedy_style_analyzer.py <transcript.json>")
        print("\nTranscript JSON format:")
        print('{"text": "Full transcript text", "words": [{"text": "word", "start": 0, "end": 100}]}')
        sys.exit(1)
    
    transcript_file = sys.argv[1]
    with open(transcript_file, 'r') as f:
        transcript_data = json.load(f)
    
    results = analyze_comedy_transcript(transcript_data)
    
    # Output results
    output_file = transcript_file.replace('.json', '_analyzed.json')
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"Analysis complete! Results saved to {output_file}")
    print(f"\nSegments analyzed: {results['overall_statistics']['total_segments']}")
    print(f"Total syllables: {results['overall_statistics']['total_syllables']}")
    print(f"\nMost common styles:")
    for style, count in results['overall_statistics']['most_common_styles']:
        print(f"  {style}: {count}")
    print(f"\nAdam Bloom Tools Detected:")
    print(f"  Seesaw Theory: {results['overall_statistics']['seesaw_detections']}")
    print(f"  Balloon Pop: {results['overall_statistics']['balloon_pop_detections']}")
    print(f"  Word Smuggling: {results['overall_statistics']['word_smuggling_detections']}")
    print(f"  Toppers: {results['overall_statistics']['topper_detections']}")

