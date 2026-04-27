#!/usr/bin/env python3
"""
Fetch regulatory updates from public RSS/Atom feeds and merge them into
data/updates.json.

Exit codes:
  0 – success, or non-fatal network/feed error (data file is untouched / still valid)
  1 – JSON corruption detected in data/updates.json, or write failure
"""

import hashlib
import html as html_module
import json
import re
import sys
import traceback
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "updates.json"

# ---------------------------------------------------------------------------
# RSS/Atom feeds for AI and regulatory updates
# ---------------------------------------------------------------------------
FEEDS = [
    {
        "url": "https://www.ftc.gov/feeds/press-releases.xml",
        "source": "FTC",
        "jurisdiction": "United States",
        "tags": ["ftc", "enforcement", "consumer-protection"],
    },
    {
        "url": "https://www.nist.gov/news-events/news/rss.xml",
        "source": "NIST",
        "jurisdiction": "United States",
        "tags": ["nist", "ai-standards", "cybersecurity"],
    },
    {
        "url": "https://digital-strategy.ec.europa.eu/en/rss.xml",
        "source": "EU Digital Strategy",
        "jurisdiction": "European Union",
        "tags": ["eu", "ai-act", "digital-regulation"],
    },
    {
        "url": "https://www.gov.uk/search/news-and-communications.atom?topic%5B%5D=artificial-intelligence",
        "source": "gov.uk",
        "jurisdiction": "United Kingdom",
        "tags": ["uk", "ai-regulation", "policy"],
    },
    {
        "url": "https://www.bis.gov/rss.xml",
        "source": "BIS – Export Administration Regulations",
        "jurisdiction": "United States",
        "tags": ["bis", "export-controls", "entity-list"],
    },
]

# Namespaces used in Atom feeds
_ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}
# Timeout for each HTTP request (seconds)
_TIMEOUT = 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_id(url: str, title: str) -> str:
    """Generate a stable item ID from its URL (or title as fallback)."""
    key = url.strip() if url.strip() else title.strip()
    return hashlib.sha1(key.encode("utf-8", errors="replace")).hexdigest()[:16]


def _strip_html(text: str) -> str:
    """Strip HTML tags and decode HTML entities from a string."""
    if not text:
        return text
    # Decode HTML entities (e.g. &amp; → &, &quot; → ")
    text = html_module.unescape(text)
    # Remove HTML tags (e.g. <span>, </span>, <br/>, etc.)
    text = re.sub(r"<[^>]+>", " ", text)
    # Collapse whitespace
    return " ".join(text.split())


def _fetch_url(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "AI-regulatory-monitor/1.0 "
                "(https://github.com/felipelago17/AI-regulatory-monitor)"
            )
        },
    )
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        return resp.read()


def _parse_date(text: str) -> str:
    """Try to extract a YYYY-MM-DD date from common feed date strings."""
    if not text:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    text = text.strip()
    # ISO-8601 / Atom: 2025-11-04T... or 2025-11-04
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
        return text[:10]
    # RFC 2822: Mon, 12 May 2025 ...
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _text(element, tag: str, ns: dict | None = None) -> str:
    """Safe text extraction from an XML element."""
    if ns:
        el = element.find(tag, ns)
    else:
        el = element.find(tag)
    if el is not None and el.text:
        return el.text.strip()
    return ""


def _parse_rss(content: bytes, feed_meta: dict) -> list[dict]:
    """Parse an RSS 2.0 feed and return a list of item dicts."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        print(f"  ⚠ RSS parse error for {feed_meta['source']}: {exc}")
        return []

    items = []
    for entry in root.findall(".//item"):
        title = _strip_html(_text(entry, "title"))
        url = _text(entry, "link") or _text(entry, "guid")
        summary = _strip_html(_text(entry, "description"))
        pub_date = _text(entry, "pubDate")

        if not title:
            continue

        item = {
            "id": _make_id(url, title),
            "date": _parse_date(pub_date),
            "jurisdiction": feed_meta["jurisdiction"],
            "topics": [],
            "title": title,
            "summary": summary,
            "source": feed_meta["source"],
            "url": url,
            "tags": list(feed_meta["tags"]),
            "category": "news",
        }
        items.append(item)
    return items


def _parse_atom(content: bytes, feed_meta: dict) -> list[dict]:
    """Parse an Atom feed and return a list of item dicts."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        print(f"  ⚠ Atom parse error for {feed_meta['source']}: {exc}")
        return []

    ns = _ATOM_NS
    items = []
    for entry in root.findall("atom:entry", ns):
        title = _strip_html(_text(entry, "atom:title", ns))
        # <link href="..."> in Atom
        link_el = entry.find("atom:link", ns)
        url = (link_el.get("href", "") if link_el is not None else "") or _text(entry, "atom:id", ns)
        summary = _strip_html(_text(entry, "atom:summary", ns) or _text(entry, "atom:content", ns))
        pub_date = _text(entry, "atom:updated", ns) or _text(entry, "atom:published", ns)

        if not title:
            continue

        item = {
            "id": _make_id(url, title),
            "date": _parse_date(pub_date),
            "jurisdiction": feed_meta["jurisdiction"],
            "topics": [],
            "title": title,
            "summary": summary,
            "source": feed_meta["source"],
            "url": url,
            "tags": list(feed_meta["tags"]),
            "category": "news",
        }
        items.append(item)
    return items


def _fetch_feed(feed_meta: dict) -> list[dict]:
    """Fetch and parse one feed. Returns [] on any network or parse error."""
    url = feed_meta["url"]
    print(f"  Fetching {feed_meta['source']} ({url})")
    try:
        content = _fetch_url(url)
    except (urllib.error.URLError, OSError, TimeoutError) as exc:
        print(f"  ⚠ Network error for {feed_meta['source']}: {exc}")
        return []
    except Exception as exc:  # noqa: BLE001
        print(f"  ⚠ Unexpected error fetching {feed_meta['source']}: {exc}")
        return []

    # Detect format: Atom feeds contain <feed, RSS feeds contain <rss or <channel
    snippet = content[:512].lower()
    if b"<feed" in snippet or b"xmlns=\"http://www.w3.org/2005/atom\"" in snippet:
        return _parse_atom(content, feed_meta)
    return _parse_rss(content, feed_meta)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    print(f"📡 fetch_updates.py – {datetime.now(timezone.utc).isoformat(timespec='seconds')}")

    # --- 1. Load existing data (hard failure if JSON is corrupt) ---
    if DATA_FILE.exists():
        try:
            with DATA_FILE.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
        except json.JSONDecodeError as exc:
            print(f"❌ data/updates.json is corrupt: {exc}", file=sys.stderr)
            return 1
    else:
        data = {"generated_at": "", "items": []}

    existing_ids = {item["id"] for item in data.get("items", [])}
    existing_urls = {item.get("url", "") for item in data.get("items", [])}

    # --- 2. Fetch from each feed (errors are non-fatal) ---
    new_items: list[dict] = []
    for feed_meta in FEEDS:
        try:
            fetched = _fetch_feed(feed_meta)
        except Exception:  # noqa: BLE001
            print(f"  ⚠ Skipping {feed_meta['source']} due to unexpected error:")
            traceback.print_exc()
            fetched = []

        for item in fetched:
            if item["id"] not in existing_ids and item.get("url", "") not in existing_urls:
                new_items.append(item)
                existing_ids.add(item["id"])
                if item.get("url"):
                    existing_urls.add(item["url"])

    print(f"✅ {len(new_items)} new item(s) fetched from feeds.")

    if not new_items:
        # Nothing new – update timestamp and exit cleanly
        data["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        try:
            with DATA_FILE.open("w", encoding="utf-8") as fh:
                json.dump(data, fh, indent=2, ensure_ascii=False)
        except OSError as exc:
            print(f"❌ Failed to write data/updates.json: {exc}", file=sys.stderr)
            return 1
        return 0

    # --- 3. Merge and write (hard failure only if write fails) ---
    data["items"] = data.get("items", []) + new_items
    data["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")

    try:
        with DATA_FILE.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
    except OSError as exc:
        print(f"❌ Failed to write data/updates.json: {exc}", file=sys.stderr)
        return 1

    print(f"💾 data/updates.json updated – {len(data['items'])} total items.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
