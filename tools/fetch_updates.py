#!/usr/bin/env python3
"""
Fetch fresh regulatory updates from public sources and prepend new items to
data/updates.json. Uses only Python standard library – no pip install needed.

Sources polled:
  - Federal Register API  (BIS / export-controls)
  - Federal Register API  (FTC / AI & privacy)
  - ICO UK RSS feed       (data-protection, privacy)
  - EDPB RSS feed         (GDPR, EU data protection)

Deduplication is URL-based: any item whose URL already exists in
data/updates.json is skipped. New items are prepended so the list stays
newest-first. The top-level "generated_at" date is updated only when new items
are written; if no new items are found the file is left untouched.
"""

import hashlib
import json
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPDATES_FILE = ROOT / "data" / "updates.json"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")

FEDERAL_REGISTER_API = "https://www.federalregister.gov/api/v1/documents.json"

SOURCES = [
    {
        "type": "federal_register",
        "params": (
            "conditions%5Bagencies%5D%5B%5D=industry-security-bureau"
            "&per_page=5&order=newest"
        ),
        "jurisdiction": "United States",
        "topics": ["Export Controls", "Technology Regulation"],
        "tags": ["bis", "export-controls", "federal-register"],
        "source_label": "Federal Register \u2013 Bureau of Industry and Security",
        "id_prefix": "fr-bis",
    },
    {
        "type": "federal_register",
        "params": (
            "conditions%5Bagencies%5D%5B%5D=federal-trade-commission"
            "&conditions%5Bterm%5D=artificial+intelligence+privacy"
            "&per_page=5&order=newest"
        ),
        "jurisdiction": "United States",
        "topics": ["AI Regulation", "Consumer Protection", "Data Privacy"],
        "tags": ["ftc", "ai-regulation", "data-privacy", "federal-register"],
        "source_label": "Federal Register \u2013 Federal Trade Commission",
        "id_prefix": "fr-ftc",
    },
    {
        "type": "rss",
        "url": "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/",
        "jurisdiction": "United Kingdom",
        "topics": ["Data Protection", "Privacy", "AI Regulation"],
        "tags": ["ico", "data-protection", "uk"],
        "source_label": "ICO \u2013 Information Commissioner\u2019s Office",
        "id_prefix": "ico",
    },
    {
        "type": "rss",
        "url": "https://edpb.europa.eu/news/news_en.rss",
        "jurisdiction": "European Union",
        "topics": ["Data Protection", "GDPR", "EU Regulation"],
        "tags": ["edpb", "gdpr", "data-protection", "eu"],
        "source_label": "EDPB \u2013 European Data Protection Board",
        "id_prefix": "edpb",
    },
]


def fetch_url(url: str, timeout: int = 20) -> str | None:
    """Fetch a URL and return the response body as a string, or None on error."""
    req = urllib.request.Request(
        url, headers={"User-Agent": "AI-Regulatory-Monitor/1.0 (+https://github.com)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as exc:
        print(f"  \u26a0 Could not fetch {url}: {exc}")
        return None


def make_id(prefix: str, url: str) -> str:
    """Create a stable, short ID from a URL."""
    digest = hashlib.sha256(url.encode()).hexdigest()[:8]
    return f"{prefix}-{digest}"


def parse_date(date_str: str | None) -> str:
    """Parse an RFC 822 or ISO date string to YYYY-MM-DD; fall back to TODAY."""
    if not date_str:
        return TODAY
    # Try RFC 822 (RSS pubDate)
    try:
        return parsedate_to_datetime(date_str).strftime("%Y-%m-%d")
    except Exception:
        pass
    # Try ISO fragment (Federal Register returns YYYY-MM-DD already)
    m = re.match(r"(\d{4}-\d{2}-\d{2})", date_str)
    if m:
        return m.group(1)
    return TODAY


def strip_html(text: str) -> str:
    """Remove HTML tags from a string."""
    return re.sub(r"<[^>]+>", "", text).strip()


# ---------------------------------------------------------------------------
# Source-specific fetchers
# ---------------------------------------------------------------------------

def fetch_federal_register(source: dict) -> list[dict]:
    url = f"{FEDERAL_REGISTER_API}?{source['params']}"
    print(f"  Fetching {source['source_label']} ...")
    raw = fetch_url(url)
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"  \u26a0 JSON parse error: {exc}")
        return []

    items = []
    for doc in data.get("results", []):
        url_str = doc.get("html_url", "").strip()
        if not url_str:
            continue
        abstract = strip_html(doc.get("abstract") or doc.get("excerpt") or "")
        summary = abstract or doc.get("title", "")
        doc_type = doc.get("type", "document").lower().replace(" ", "-")
        items.append(
            {
                "id": make_id(source["id_prefix"], url_str),
                "date": parse_date(doc.get("publication_date")),
                "jurisdiction": source["jurisdiction"],
                "topics": source["topics"],
                "title": doc.get("title", "").strip(),
                "summary": summary[:600],
                "source": source["source_label"],
                "url": url_str,
                "tags": source["tags"] + [doc_type],
                "category": None,
                "impact_assessment": None,
            }
        )
    return items


def fetch_rss(source: dict) -> list[dict]:
    print(f"  Fetching {source['source_label']} ...")
    raw = fetch_url(source["url"])
    if not raw:
        return []

    # Strip namespace declarations that confuse ElementTree
    raw = re.sub(r'\s+xmlns(?::[a-zA-Z0-9_]+)?="[^"]*"', "", raw)

    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        print(f"  \u26a0 XML parse error for {source['url']}: {exc}")
        return []

    channel = root.find("channel") or root
    items = []
    for entry in channel.findall("item")[:5]:
        link = (entry.findtext("link") or "").strip()
        if not link:
            continue
        title = strip_html(entry.findtext("title") or "").strip()
        desc = strip_html(entry.findtext("description") or "").strip()
        summary = (desc or title)[:600]
        items.append(
            {
                "id": make_id(source["id_prefix"], link),
                "date": parse_date(entry.findtext("pubDate")),
                "jurisdiction": source["jurisdiction"],
                "topics": source["topics"],
                "title": title,
                "summary": summary,
                "source": source["source_label"],
                "url": link,
                "tags": source["tags"],
                "category": None,
                "impact_assessment": None,
            }
        )
    return items


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("Loading existing data ...")
    with UPDATES_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)

    existing_items: list[dict] = data.get("items", [])
    existing_urls: set[str] = {item["url"] for item in existing_items}

    new_items: list[dict] = []
    for source in SOURCES:
        if source["type"] == "federal_register":
            fetched = fetch_federal_register(source)
        elif source["type"] == "rss":
            fetched = fetch_rss(source)
        else:
            fetched = []

        added = 0
        for item in fetched:
            if item["url"] not in existing_urls:
                new_items.append(item)
                existing_urls.add(item["url"])
                added += 1
        print(f"  \u2192 {added} new item(s) from {source['source_label']}")

    if not new_items:
        # Nothing new – leave data/updates.json untouched so no spurious commit is made.
        print("\nNo new items found. data/updates.json unchanged.")
        return

    data["items"] = new_items + existing_items
    data["generated_at"] = TODAY
    print(f"\n{len(new_items)} new item(s) added. generated_at -> {TODAY}.")

    with UPDATES_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
