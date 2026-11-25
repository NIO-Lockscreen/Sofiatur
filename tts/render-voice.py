#!/usr/bin/env python3
"""Renders the game's sentences with Canora Norwegian «ingrid» (EmpirioLabs, Apache 2.0), a Kokoro-82M voice.

Called by tts/make-voice.mjs, which finds the sentences and packs the clips; it can also be run by hand:

    python3 tts/render-voice.py jobs.json cache_dir --model model.onnx --voice ingrid.bin [--speed 0.9]

jobs.json is a list of {"key": sentence as the game says it, "say": the text to read}. Each clip is written once, as
cache_dir/<hash>.wav (24 kHz, 16-bit), where the hash covers the phonemes, the speed and the model; a sentence already
rendered is not rendered again. Prints a JSON list of {"key", "phonemes", "wav"} on stdout.

Text to phonemes is EmpirioLabs' own module for this model (src/g2p_no.py, unchanged), but espeak-ng is the game's build
(tts/espeak-nb.*, with the pronunciation list src/no_listx) run through tts/espeak-ipa.mjs, so the planets and Sofia's
name are stressed the way the list says. Needs python3 with numpy and onnxruntime, and node.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import wave

import numpy as np
import onnxruntime as ort

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "src"))
import g2p_no  # noqa: E402

SAMPLE_RATE = 24000
# Phonemes changed after the text-to-phoneme step, for this voice, each tried with NB-Whisper (small) with and without (25 November 2026):
# - «Sofia» as no_listx has it (sʊfˈiːʲɑ, right for the Piper voice) was heard «Sofidia» or «Sofiria» in 6 of 6 sentences; suːfˈiːɑ «Sofia» in 6 of 6.
# - ʲ: the game's espeak-ng (newer than the 1.51 the model was trained with) puts it between two vowels («viːʲ ˌɛːr», «lˈiːʲɑnvɑnnət»), and
#   the model makes a sound of it: «Vi er» was heard «Hvit er», Lianvannet «liten vannet», KIWI «kivier». Without it, right.
# - «igjen» is stressed on the first syllable (ˈɪjən) and was heard «i renn» / «i len»; ɪjˈɛn is heard «igjen».
# - «ishall» (ˈɪshɑl) was heard «i sal»; ˈiːshˌɑl (is-hall) is heard «ishall».
PHONEME_FIXES = [("sʊfˈiːʲɑ", "suːfˈiːɑ"), ("ʲ", ""), ("ˈɪjən", "ɪjˈɛn"), ("ˈɪshɑl", "ˈiːshˌɑl")]


class GameEspeak:
    """g2p_no's Espeak, but every chunk is phonemized up front in one call to tts/espeak-ipa.mjs."""

    def __init__(self):
        self.known = {}

    def learn(self, chunks):
        todo = sorted({c for c in chunks if c not in self.known})
        if not todo:
            return
        out = subprocess.run(["node", os.path.join(HERE, "espeak-ipa.mjs")], input="\n".join(todo) + "\n",
                             capture_output=True, text=True, encoding="utf-8", check=True).stdout.split("\n")
        for text, ipa in zip(todo, out):
            self.known[text] = ipa.strip()

    def __call__(self, chunks):
        return [self.known[c] for c in chunks]


class Recorder:
    def __init__(self):
        self.chunks = []

    def __call__(self, chunks):
        self.chunks.extend(chunks)
        return ["" for _ in chunks]


def phonemize(texts):
    g2p = g2p_no.NorwegianG2P.__new__(g2p_no.NorwegianG2P)
    g2p.espeak = Recorder()
    for t in texts:
        g2p(t)
    game = GameEspeak()
    game.learn(g2p.espeak.chunks)
    g2p.espeak = game
    out = []
    for t in texts:
        ps = g2p(t)[0]
        for a, b in PHONEME_FIXES:
            ps = ps.replace(a, b)
        out.append(ps)
    return out


def trim(audio, threshold=0.004, keep=0.03):
    """Silence off both ends, keeping 30 ms."""
    loud = np.nonzero(np.abs(audio) > threshold)[0]
    if not len(loud):
        return audio[:0]
    pad = int(keep * SAMPLE_RATE)
    return audio[max(0, loud[0] - pad):loud[-1] + pad]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs")
    ap.add_argument("cache")
    ap.add_argument("--model", required=True)
    ap.add_argument("--voice", required=True)
    ap.add_argument("--speed", type=float, default=0.9)
    ap.add_argument("--threads", type=int, default=os.cpu_count() or 4)
    a = ap.parse_args()
    jobs = json.load(open(a.jobs, encoding="utf-8"))
    os.makedirs(a.cache, exist_ok=True)
    vocab = json.load(open(os.path.join(HERE, "src", "canora-config.json"), encoding="utf-8"))["vocab"]
    voice = np.fromfile(a.voice, dtype=np.float32).reshape(-1, 1, 256)
    model_id = f"{os.path.basename(a.model)}:{os.path.getsize(a.model)}:{os.path.basename(a.voice)}"
    phonemes = phonemize([j["say"] for j in jobs])
    session = None
    results, made = [], 0
    for job, ps in zip(jobs, phonemes):
        digest = hashlib.sha1(f"{ps}|{a.speed}|{model_id}".encode()).hexdigest()[:16]
        path = os.path.join(a.cache, digest + ".wav")
        if not os.path.exists(path):
            if session is None:
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = a.threads
                session = ort.InferenceSession(a.model, opts, providers=["CPUExecutionProvider"])
            ids = [0] + [vocab[p] for p in ps if p in vocab][:510] + [0]
            audio = session.run(None, {
                "input_ids": np.array([ids], dtype=np.int64),
                "style": voice[min(len(ps), len(voice)) - 1],
                "speed": np.array([a.speed], dtype=np.float32),
            })[0].reshape(-1)
            audio = trim(audio)
            pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
            with wave.open(path + ".tmp", "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(SAMPLE_RATE)
                w.writeframes(pcm.tobytes())
            os.replace(path + ".tmp", path)
            made += 1
            if made % 25 == 0:
                print(f"  {made} rendered", file=sys.stderr, flush=True)
        results.append({"key": job["key"], "phonemes": ps, "wav": path})
    print(f"Rendered {made} new, {len(jobs) - made} from the cache.", file=sys.stderr)
    json.dump(results, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
