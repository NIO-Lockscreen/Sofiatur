#!/usr/bin/env python3
"""Renders the game's sentences with Piper «talesyntese» (no_NO-talesyntese-medium, Nasjonalbiblioteket, CC0), 26 November 2026.

Called by tts/make-voice.mjs, which finds the sentences, makes the phoneme ids (espeak-ng + piper-core.mjs) and packs the clips:

    python3 tts/render-voice.py jobs.json cache_dir --model no_NO-talesyntese-medium.onnx --config no_NO-talesyntese-medium.onnx.json [--length-scale 1.12]

jobs.json is a list of {"key": sentence as the game says it, "ids": [[phoneme ids of one sentence], ...]}. Each clip is written once,
as cache_dir/<hash>.wav (22 050 Hz, 16-bit), where the hash covers the ids, the settings and the model; a sentence already rendered
is not rendered again. Prints a JSON list of {"key", "wav"} on stdout.

The sound is the model's own, as Piper makes it: the noise and pace settings from the voice's config (the pace slowed by --length-scale,
which stretches the sounds in time and leaves the pitch alone), loudness to a peak of 0.92 like Piper's own normalize_audio, and the
silence before and after trimmed. No pitch or formant shift. The model draws its own noise, so a sentence rendered again sounds the same
but is not bit for bit the same; that is why rendered clips are kept. Needs python3 with numpy and onnxruntime.
"""
import argparse
import hashlib
import json
import os
import sys
import wave

import numpy as np
import onnxruntime as ort

GAP = 0.22  # between two sentences in one clip (the same as the game's pause between clips)


def trim(audio, sample_rate, threshold=0.008, lead=0.03, tail=0.09):
    """Silence off both ends, keeping 30 ms before and 90 ms after (as the voice did on the iPad)."""
    loud = np.nonzero(np.abs(audio) > threshold)[0]
    if not len(loud):
        return audio[:0]
    return audio[max(0, loud[0] - int(lead * sample_rate)):loud[-1] + 1 + int(tail * sample_rate)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs")
    ap.add_argument("cache")
    ap.add_argument("--model", required=True)
    ap.add_argument("--config", required=True)
    ap.add_argument("--length-scale", type=float, default=1.0)
    ap.add_argument("--threads", type=int, default=os.cpu_count() or 4)
    a = ap.parse_args()
    jobs = json.load(open(a.jobs, encoding="utf-8"))
    config = json.load(open(a.config, encoding="utf-8"))
    inf, sr = config.get("inference", {}), config["audio"]["sample_rate"]
    scales = [inf.get("noise_scale", 0.667), inf.get("length_scale", 1.0) * a.length_scale, inf.get("noise_w", 0.8)]
    os.makedirs(a.cache, exist_ok=True)
    model_id = f"{os.path.basename(a.model)}:{os.path.getsize(a.model)}"
    session = None
    results, made = [], 0
    for job in jobs:
        digest = hashlib.sha1(f"{json.dumps(job['ids'])}|{scales}|{model_id}".encode()).hexdigest()[:16]
        path = os.path.join(a.cache, digest + ".wav")
        if not os.path.exists(path):
            if session is None:
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = a.threads
                session = ort.InferenceSession(a.model, opts, providers=["CPUExecutionProvider"])
            pieces = []
            for ids in job["ids"]:
                audio = session.run(None, {
                    "input": np.array([ids], dtype=np.int64),
                    "input_lengths": np.array([len(ids)], dtype=np.int64),
                    "scales": np.array(scales, dtype=np.float32),
                })[0].reshape(-1)
                peak = float(np.max(np.abs(audio))) if len(audio) else 0.0
                audio = audio * (0.92 / peak) if peak > 1e-8 else audio * 0
                if pieces:
                    pieces.append(np.zeros(int(GAP * sr), dtype=np.float32))
                pieces.append(trim(audio, sr))
            audio = np.concatenate(pieces) if pieces else np.zeros(0, dtype=np.float32)
            pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
            with wave.open(path + ".tmp", "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(sr)
                w.writeframes(pcm.tobytes())
            os.replace(path + ".tmp", path)
            made += 1
            if made % 100 == 0:
                print(f"  {made} rendered", file=sys.stderr, flush=True)
        results.append({"key": job["key"], "wav": path})
    print(f"Rendered {made} new, {len(jobs) - made} from the cache.", file=sys.stderr)
    json.dump(results, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
