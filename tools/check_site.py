#!/usr/bin/env python3
import os, re, sys, json
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

# --- HTML reference extractor (no external libs) ---
class RefParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        # Common static refs
        if tag == "link" and attrs.get("href"):
            self.refs.append(("href", attrs["href"]))
        if tag in ("script", "img") and attrs.get("src"):
            self.refs.append(("src", attrs["src"]))
        if tag == "a" and attrs.get("href"):
            self.refs.append(("href", attrs["href"]))

def is_external(url: str) -> bool:
    return url.startswith(("http://", "https://", "mailto:", "tel:")) or url.startswith("#")

def normalize_path(url: str) -> str:
    # Remove querystrings/fragments
    url = url.split("#", 1)[0].split("?", 1)[0]
    # Ignore empty
    return url.strip()

def file_exists(repo_rel: str) -> bool:
    p = ROOT / repo_rel.lstrip("/")
    return p.exists()

def parse_css_urls(css_text: str):
    # Extract url(...) occurrences
    urls = re.findall(r'url\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)', css_text, flags=re.I)
    # Filter out data URIs, external URLs, and empty strings
    return [u.strip() for u in urls if u.strip() and not is_external(u) and not u.startswith('data:')]

def check_json(path: Path):
    try:
        with path.open("r", encoding="utf-8") as f:
            json.load(f)
        return True, None
    except Exception as e:
        return False, str(e)

def main():
    problems = []

    # 1) Check index exists
    if not INDEX.exists():
        print("❌ index.html not found at repo root.")
        sys.exit(2)

    html = INDEX.read_text(encoding="utf-8", errors="replace")

    # 2) Extract refs from HTML
    parser = RefParser()
    parser.feed(html)

    missing = []
    for kind, ref in parser.refs:
        ref = normalize_path(ref)
        if not ref or is_external(ref):
            continue

        # GitHub Pages: root-relative "/x" points to site root. We treat it as repo root.
        if not file_exists(ref):
            missing.append(ref)

    if missing:
        problems.append(("Missing files referenced in index.html", sorted(set(missing))))

    # 3) Check CSS file refs inside styles.css (if present)
    css_path = ROOT / "styles.css"
    if css_path.exists():
        css_text = css_path.read_text(encoding="utf-8", errors="replace")
        css_urls = parse_css_urls(css_text)
        css_missing = [u for u in css_urls if not file_exists(u)]
        if css_missing:
            problems.append(("Missing files referenced in styles.css (url(...))", sorted(set(css_missing))))
    else:
        problems.append(("styles.css missing", ["styles.css"]))

    # 4) Validate data/updates.json
    updates = ROOT / "data" / "updates.json"
    if updates.exists():
        ok, err = check_json(updates)
        if not ok:
            problems.append(("Invalid JSON in data/updates.json", [err]))
    else:
        problems.append(("data/updates.json missing", ["data/updates.json"]))

    # 5) KPI IDs sanity check (if you added KPIs)
    expected_ids = ["kpiTotal","kpiNew","kpiHigh","kpiUAE","kpiUK","kpiAI"]
    missing_ids = [i for i in expected_ids if f'id="{i}"' not in html]
    if missing_ids:
        problems.append(("KPI elements missing in index.html (IDs not found)", missing_ids))

    # 6) favicon check (your 404)
    fav = ROOT / "favicon.ico"
    if not fav.exists():
        problems.append(("favicon.ico missing (causes /favicon.ico 404)", ["favicon.ico"]))

    # Output
    if not problems:
        print("✅ All checks passed. No broken local refs, JSON valid, KPI IDs present.")
        return

    print("⚠️ Issues found:\n")
    for title, items in problems:
        print(f"--- {title} ---")
        for it in items:
            print(f"  - {it}")
        print()

    print("Next step: fix the missing files/paths above, then re-run:")
    print("  python3 tools/check_site.py")
    sys.exit(1)

if __name__ == "__main__":
    main()