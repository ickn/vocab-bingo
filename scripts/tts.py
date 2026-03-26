#!/usr/bin/env python3
"""Generate TTS audio using Kokoro local model."""

import argparse
import numpy as np
import soundfile as sf
from kokoro import KPipeline


def generate(text, output="output.wav", voice="af_heart", lang_code="a", speed=1.0):
    print(f"Generating: \"{text}\"")
    print(f"Voice: {voice}, Lang: {lang_code}, Speed: {speed}")

    pipeline = KPipeline(lang_code=lang_code)
    chunks = []
    for _, _, audio in pipeline(text, voice=voice, speed=speed):
        if audio is not None:
            chunks.append(audio)

    if not chunks:
        print("Error: No audio generated")
        return

    audio = np.concatenate(chunks)
    sf.write(output, audio, 24000)
    print(f"Saved: {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate TTS audio with Kokoro")
    parser.add_argument("text", nargs="?", default="Vocab Vibes!", help="Text to speak")
    parser.add_argument("-o", "--output", default="output.wav", help="Output WAV file")
    parser.add_argument("-v", "--voice", default="af_heart", help="Voice name")
    parser.add_argument("-l", "--lang", default="a", help="Language code")
    parser.add_argument("-s", "--speed", type=float, default=1.0, help="Speed multiplier")
    args = parser.parse_args()

    generate(args.text, args.output, args.voice, args.lang, args.speed)
