"""Generate A+ Active Services background loops with Google AI Studio (Gemini Omni via Interactions API).
Usage: python3 scripts/gen_bg_videos.py [name ...]   (reads GOOGLE_API_KEY from ~/.env)
Outputs raw mp4s to assets/media/<name>.raw.mp4; compress with ffmpeg afterwards.
Prompts ask for pure black backgrounds so the page can composite them with mix-blend-mode: screen."""
import base64, json, os, sys, urllib.request, concurrent.futures, pathlib

KEY = os.environ.get("GOOGLE_API_KEY") or next(
    (l.split("=", 1)[1].strip().strip('"') for l in open(os.path.expanduser("~/.env")) if l.startswith("GOOGLE_API_KEY")), None)
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "media"
OUT.mkdir(parents=True, exist_ok=True)
BASE = ("Pure solid black background, no text, no logos, no people, no robots, no UI, widescreen 16:9, "
        "static locked-off camera, cinematic macro photography, shallow depth of field, slow and calm, "
        "seamless looping motion, minimal and elegant, lots of empty black negative space. ")
PROMPTS = {
    "hero-flow": BASE + "Thousands of tiny points of cobalt blue light (#2E7CFF) drift slowly from left to right and gather "
                        "into soft flowing silk-like ribbons of light that bend and weave like a calm current, a few warm "
                        "red sparks (#FF3B3B) glint now and then. Concentrated on the right side of the frame, fading to pure black on the left.",
    "healthcare-pulse": BASE + "A single thin glowing line of cobalt blue light draws a gentle heartbeat pulse across the frame, "
                               "and after each beat the line softly blooms into delicate threads of blue light that ripple outward "
                               "like rings on water before fading. Tranquil, clinical, trustworthy.",
    "builders-rise": BASE + "Warm amber and gold light trails (#F5A623) rise slowly upward from the bottom of the frame, "
                            "tracing clean vertical paths that branch and connect like a growing circuit or a skyline being drawn "
                            "in light, with small glowing nodes where paths meet. Optimistic, steady momentum.",
}

def gen(name):
    body = json.dumps({"model": "gemini-omni-flash-preview", "input": PROMPTS[name], "response_modalities": ["video"]}).encode()
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/interactions", body,
                                 {"x-goog-api-key": KEY, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=900))
    vid = next(c for s in d["steps"] if s["type"] == "model_output" for c in s["content"] if c["type"] == "video")
    raw = OUT / f"{name}.raw.mp4"
    raw.write_bytes(base64.b64decode(vid["data"]))
    return name, raw

if __name__ == "__main__":
    names = sys.argv[1:] or list(PROMPTS)
    with concurrent.futures.ThreadPoolExecutor(3) as ex:
        for f in concurrent.futures.as_completed([ex.submit(gen, n) for n in names]):
            try: print("OK", *f.result())
            except Exception as e: print("FAIL", e)
