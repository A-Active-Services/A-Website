#!/usr/bin/env python3
"""
Refreshes data/tools.json for the homepage "Tools Behind The Work" marquee.

There is no reliable public API for "trending AI tools" — this is a manual
curation scaffold, not a live scraper. Run it whenever you want to update the
list (e.g. monthly via launchd, the same pattern as the Spring Cleaning job),
then hand-edit CURATED_TOOLS below with whatever's actually worth featuring.

Each entry needs a name and, optionally, a path to an SVG mask icon under
assets/logos/ (icon: null falls back to a generic star glyph on the site).
"""

import json
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent
TOOLS_JSON = SITE_ROOT / "data" / "tools.json"

CURATED_TOOLS = [
    {"name": "Claude Code", "icon": "assets/logos/anthropic.svg"},
    {"name": "OpenAI", "icon": None},
    {"name": "Google Gemini", "icon": "assets/logos/googlegemini.svg"},
    {"name": "Make.com", "icon": "assets/logos/make.svg"},
    {"name": "ElevenLabs", "icon": "assets/logos/elevenlabs.svg"},
    {"name": "Figma", "icon": "assets/logos/figma.svg"},
    {"name": "Vapi", "icon": None},
    {"name": "Cursor", "icon": "assets/logos/cursor.svg"},
    {"name": "Copilot", "icon": "assets/logos/githubcopilot.svg"},
    {"name": "Perplexity", "icon": None},
    {"name": "Midjourney", "icon": None},
]


def main():
    TOOLS_JSON.write_text(json.dumps(CURATED_TOOLS, indent=2) + "\n")
    print(f"Wrote {len(CURATED_TOOLS)} tools to {TOOLS_JSON}")


if __name__ == "__main__":
    main()
