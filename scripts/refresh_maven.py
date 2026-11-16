"""Refresh data/maven.json from the public Maven expert profiles.
Usage: python3 scripts/refresh_maven.py
The AI For Everyday People page renders this file; every item links back to Maven."""
import json, pathlib, re, urllib.request

PROFILES = [
    {"slug": "anthony-virgo", "photo": "assets/anthony.png", "role": "Founder & CEO, A+ Active Services",
     "blurb": "Makes AI simple for healthcare professionals, entrepreneurs, and everyday people. Former partnerships lead at Cityblock Health, onboarding providers from Mount Sinai, NYU, and NewYork Presbyterian."},
    {"slug": "a-plus", "photo": "assets/jai.jpg", "role": "Director of AI Education & Community",
     "blurb": "Taught at Madison Square Garden and Parsons School of Design. Now shows business leaders what AI really costs and how to run it well."},
]
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "maven.json"
BASE = "https://maven.com"


def text(html, limit=None):
    t = re.sub(r"<br\s*/?>", " ", html or "")
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t).replace("&amp;", "&").replace("&#x27;", "'").strip()
    return t if not limit or len(t) <= limit else t[:limit].rsplit(" ", 1)[0] + "..."


def page_props(slug):
    req = urllib.request.Request(f"{BASE}/{slug}", headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    return json.loads(m.group(1))["props"]["pageProps"]


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def build(p):
    pp = page_props(p["slug"])
    bio = pp.get("instructor_bio") or {}
    sessions = [
        {
            "title": it["title"],
            "url": f"{BASE}/p/{it['slug']}/{slugify(it['title'])}",
            "start": it.get("start_datetime"),
            "minutes": it.get("duration_minutes"),
            "signups": it.get("signup_count"),
        }
        for it in (pp.get("free_items") or {}).get("items", [])
    ]
    workshops = [
        {"title": c["course_name"], "description": c.get("course_description"), "url": f"{BASE}/{p['slug']}/{c['course_slug']}"}
        for c in pp.get("paid_workshop_courses") or []
    ]
    offers = [
        {
            "title": o["title"],
            "description": text(o.get("description"), 160),
            "price": (o.get("price_unit_amount") or 0) / 100,
            "kind": o.get("category"),
            "cta": o.get("cta_text"),
            "url": f"{BASE}/{p['slug']}/o/{o['slug']}",
        }
        for o in (pp.get("offering_services") or []) + (pp.get("offering_resources") or [])
    ]
    return {
        "name": pp.get("name"),
        "url": f"{BASE}/{p['slug']}",
        "photo": p["photo"],
        "role": p["role"],
        "title": bio.get("title"),
        "blurb": p["blurb"],
        "sessionsTotal": ((pp.get("free_items") or {}).get("metadata") or {}).get("total", len(sessions)),
        "sessions": sessions,
        "workshops": workshops,
        "offers": offers,
    }


if __name__ == "__main__":
    data = {"profiles": [build(p) for p in PROFILES]}
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    for pr in data["profiles"]:
        print(pr["name"], len(pr["sessions"]), "sessions,", len(pr["workshops"]), "workshops,", len(pr["offers"]), "offers")
