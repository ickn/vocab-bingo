#!/usr/bin/env python3
"""Batch generate TTS audio for Vocab Vibes reactions and words."""

import os
import re
import subprocess
import tempfile
import numpy as np
import soundfile as sf
from kokoro import KPipeline

VOICE = "af_heart"
LANG = "a"
SAMPLE_RATE = 24000

# All reaction phrases (without emojis)
CORRECT_REACTIONS = [
    "Slay!", "No cap!", "It's giving genius", "Bussin!",
    "W!", "Ate that!", "Periodt!", "You cooked!",
    "Main character energy!", "So iconic!", "Yaaas!", "Rizz level 100!",
    "Sheeeesh!", "On point!", "Vibes!",
]

STREAK_REACTIONS = [
    "Ate and left no crumbs!", "Unstoppable queen!",
    "Serving LOOKS and BRAINS!", "Living rent free in genius town!",
]

WRONG_REACTIONS = [
    "Bruh", "Oof", "Not the L", "It's giving wrong answer",
    "That ain't it chief", "Nah fam", "Plot twist!",
]

MASTER_REACTIONS = [
    "LOCKED IN!", "This word is YOUR bestie now!",
    "Permanent brain resident!", "Added to the collection!",
]

UI_PHRASES = [
    "The answer was:",
    "You understood the assignment!",
    "Word mastered!",
]


def sanitize_filename(text):
    """Convert text to a safe filename."""
    clean = re.sub(r'[^\w\s-]', '', text.lower().strip())
    clean = re.sub(r'[\s]+', '_', clean)
    return clean[:60]


def synth_to_mp3(pipeline, text, filepath, speed=1.0):
    """Synthesize text and save as MP3 via ffmpeg."""
    chunks = []
    for _, _, audio in pipeline(text, voice=VOICE, speed=speed):
        if audio is not None:
            chunks.append(audio)
    if not chunks:
        return False
    audio = np.concatenate(chunks)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, audio, SAMPLE_RATE)
        subprocess.run(
            ["ffmpeg", "-y", "-i", tmp.name, "-codec:a", "libmp3lame", "-b:a", "64k", filepath],
            capture_output=True,
        )
        os.unlink(tmp.name)
    return True


def generate_all(output_dir):
    os.makedirs(output_dir, exist_ok=True)

    pipeline = KPipeline(lang_code=LANG)

    all_phrases = {
        "correct": CORRECT_REACTIONS,
        "streak": STREAK_REACTIONS,
        "wrong": WRONG_REACTIONS,
        "master": MASTER_REACTIONS,
        "ui": UI_PHRASES,
    }

    total = sum(len(v) for v in all_phrases.values())
    count = 0

    for category, phrases in all_phrases.items():
        cat_dir = os.path.join(output_dir, category)
        os.makedirs(cat_dir, exist_ok=True)

        for phrase in phrases:
            count += 1
            filename = sanitize_filename(phrase) + ".mp3"
            filepath = os.path.join(cat_dir, filename)

            if os.path.exists(filepath):
                print(f"  [{count}/{total}] SKIP (exists): {filepath}")
                continue

            print(f"  [{count}/{total}] Generating: \"{phrase}\" -> {filepath}")

            if not synth_to_mp3(pipeline, phrase, filepath):
                print(f"    WARNING: No audio generated for \"{phrase}\"")

    print(f"\nDone! Generated {count} audio files in {output_dir}")


if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "reactions")
    generate_all(output_dir)
