#!/usr/bin/env python3
"""Pre-records the voice coach with Microsoft Edge's neural voices (edge-tts).

Usage: python tools/build-audio.py lines.json OUT_DIR CACHE_DIR

Each line becomes an MP3 named by a hash of (voice, rate, text), and OUT_DIR/manifest.json
maps text -> file. Clips already in CACHE_DIR are reused, so a deploy only records new or
changed lines. If the service fails repeatedly the build stops early, prints a summary and
writes a manifest with whatever succeeded: the app falls back to the device voice for the rest.

Env: TTS_VOICE (default en-US-AvaNeural), TTS_RATE (default +0%).
"""
import asyncio
import hashlib
import json
import os
import shutil
import sys

import edge_tts

VOICE = os.environ.get("TTS_VOICE") or "en-US-AvaNeural"
RATE = os.environ.get("TTS_RATE") or "+0%"
CONCURRENCY = 4
GIVE_UP_AFTER = 8  # consecutive failures before we assume the service is blocked


def clip_name(text: str) -> str:
    return hashlib.sha1(f"{VOICE}|{RATE}|{text}".encode()).hexdigest()[:16] + ".mp3"


async def record(text: str, path: str) -> None:
    last = None
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(path + ".part")
            if os.path.getsize(path + ".part") < 512:
                raise RuntimeError("empty audio")
            os.replace(path + ".part", path)
            return
        except Exception as e:  # noqa: BLE001 - report any failure from the unofficial service
            last = e
            await asyncio.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"{type(last).__name__}: {last}")


async def main() -> int:
    lines_file, out_dir, cache_dir = sys.argv[1:4]
    lines = json.load(open(lines_file, encoding="utf-8"))
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)
    clips, failed, new = {}, [], 0
    streak = 0
    stop = asyncio.Event()
    sem = asyncio.Semaphore(CONCURRENCY)

    async def one(text: str) -> None:
        nonlocal new, streak
        name = clip_name(text)
        cached = os.path.join(cache_dir, name)
        if not os.path.exists(cached):
            if stop.is_set():
                failed.append((text, "skipped after repeated failures"))
                return
            async with sem:
                try:
                    await record(text, cached)
                    new += 1
                    streak = 0
                except Exception as e:  # noqa: BLE001
                    failed.append((text, str(e)))
                    streak += 1
                    if streak >= GIVE_UP_AFTER:
                        stop.set()
                    return
        shutil.copyfile(cached, os.path.join(out_dir, name))
        clips[text] = name

    await asyncio.gather(*(one(t) for t in lines))
    # keep the cache to what this build uses
    keep = {clip_name(t) for t in lines}
    for f in os.listdir(cache_dir):
        if f.endswith(".mp3") and f not in keep:
            os.remove(os.path.join(cache_dir, f))

    if clips:
        with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump({"voice": VOICE, "rate": RATE, "clips": clips}, f, ensure_ascii=False, indent=0)
    print(f"voice: {VOICE} {RATE} · {len(clips)}/{len(lines)} clips · {new} new · {len(failed)} failed")
    if failed:
        print("::warning::Some voice lines could not be recorded; the app will use the device voice for them.")
        for text, err in failed[:10]:
            print(f"  ✗ {text!r}: {err}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
