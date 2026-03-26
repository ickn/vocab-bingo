#!/usr/bin/env python3
"""Generate TTS audio for all vocab words across all lists."""

import os
import glob
import subprocess
import tempfile
import yaml
import numpy as np
import soundfile as sf
from kokoro import KPipeline

VOICE = "af_heart"
LANG = "a"
SAMPLE_RATE = 24000


def synth_to_mp3(pipeline, text, filepath, speed=0.9):
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


def generate_words():
    lists_dir = os.path.join(os.path.dirname(__file__), "..", "data", "lists")
    output_dir = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "words")
    os.makedirs(output_dir, exist_ok=True)

    # Collect all unique words across all lists
    words = set()
    for yaml_path in sorted(glob.glob(os.path.join(lists_dir, "*.yaml"))):
        with open(yaml_path) as f:
            entries = yaml.safe_load(f)
        for entry in entries:
            words.add(entry["word"])

    words = sorted(words)
    print(f"Found {len(words)} unique words across all lists\n")

    pipeline = KPipeline(lang_code=LANG)

    for i, word in enumerate(words, 1):
        filename = word.lower().replace(" ", "_") + ".mp3"
        filepath = os.path.join(output_dir, filename)

        if os.path.exists(filepath):
            print(f"  [{i}/{len(words)}] SKIP (exists): {word}")
            continue

        print(f"  [{i}/{len(words)}] Generating: \"{word}\"")

        if not synth_to_mp3(pipeline, word, filepath):
            print(f"    WARNING: No audio for \"{word}\"")

    print(f"\nDone! Generated audio for {len(words)} words in {output_dir}")


if __name__ == "__main__":
    generate_words()
