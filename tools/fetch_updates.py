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
import os
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
        "type": "fr_api",
        "url": "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bagencies%5D%5B%5D=industry-and-security-bureau&order=newest&per_page=20",
        "source": "BIS – Federal Register (rules & notices)",
        "jurisdiction": "United States",
        "tags": ["bis", "export-controls", "entity-list", "federal-register"],
    },
    # Law firm insight feeds — export controls, sanctions, and AI regulatory analysis
    {
        "url": "https://www.skadden.com/insights/rss",
        "source": "Skadden",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.paulweiss.com/insights/rss",
        "source": "Paul Weiss",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.cov.com/en/news-and-insights/rss",
        "source": "Covington & Burling",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.freshfields.com/en/our-thinking/rss",
        "source": "Freshfields",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.wilmerhale.com/en/insights/rss",
        "source": "WilmerHale",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.squirepattonboggs.com/en/insights/rss",
        "source": "Squire Patton Boggs",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.blankrome.com/publications/rss",
        "source": "Blank Rome",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.sidley.com/en/insights/rss",
        "source": "Sidley Austin",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.hklaw.com/rss",
        "source": "Holland & Knight",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.arnoldporter.com/en/perspectives/rss",
        "source": "Arnold & Porter",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    {
        "url": "https://www.millerchevalier.com/rss",
        "source": "Miller & Chevalier",
        "jurisdiction": "Global",
        "tags": ["law-firm", "export-controls", "regulatory-analysis"],
    },
    # Federal Register topic-RSS feeds — flags published rules/notices matching
    # active watch terms (AI diffusion, frontier models, Anthropic/BIS action)
    {
        "type": "fr_api",
        "url": "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=frontier+model+export&order=newest&per_page=20",
        "source": "Federal Register — frontier model export",
        "jurisdiction": "United States",
        "tags": ["federal-register", "frontier-models", "export-controls", "ai-diffusion"],
    },
    {
        "type": "fr_api",
        "url": "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=covered+AI+model&order=newest&per_page=20",
        "source": "Federal Register — covered AI model",
        "jurisdiction": "United States",
        "tags": ["federal-register", "frontier-models", "export-controls", "ai-diffusion"],
    },
    {
        "type": "fr_api",
        "url": "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=deemed+export+artificial+intelligence&order=newest&per_page=20",
        "source": "Federal Register — deemed export AI",
        "jurisdiction": "United States",
        "tags": ["federal-register", "deemed-export", "export-controls", "national-security"],
    },
    {
        "type": "fr_api",
        "url": "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=BIS+AI+diffusion&order=newest&per_page=20",
        "source": "Federal Register — BIS AI diffusion",
        "jurisdiction": "United States",
        "tags": ["federal-register", "bis", "export-controls", "ai-diffusion"],
    },
    {
        "type": "fr_api",
        "url": "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=chip+security+location+verification&order=newest&per_page=20",
        "source": "Federal Register — chip security location verification",
        "jurisdiction": "United States",
        "tags": ["federal-register", "chip-security", "export-controls", "location-verification"],
    },
    # Threat-intel / incident news — high volume, so gated by a relevance regex (see "keywords")
    {
        "url": "https://cybersecuritynews.com/feed/",
        "source": "Cyber Security News",
        "jurisdiction": "Global",
        "tags": ["cybersecurity", "incident", "threat-intel"],
        "keywords": (
            r"\b(hacked|breach|leak|ransomware attack|data (theft|exposure|stolen)|"
            r"hospital|health|blood|medical|water|energy|grid|pipeline|refrigerat|ics|scada|\bot\b|plc|critical infrastructure|"
            r"cert-fr|anssi|enisa|cisa|ncsc|\bico\b|cnil|edpb|ftc|gdpr|nis2|regulator|fine[sd]?\b|sanction|export control|"
            r"supply[- ]chain|third[- ]party|vendor compromise|ai (model|agent)|llm|prompt injection|deepfake)\b"
        ),
    },
]

# Namespaces used in Atom feeds
_ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}
# Timeout for each HTTP request (seconds)
_TIMEOUT = 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _atomic_write(path: Path, data: dict) -> None:
    """Serialize *data* to JSON and replace *path* atomically.

    Writes to a sibling .tmp file first so that a crash or disk-full error
    during the write never leaves the target file in a corrupt/partial state.
    os.replace() is atomic on POSIX; on Windows it is as close as the OS allows.
    """
    tmp = path.with_suffix(".tmp")
    try:
        serialized = json.dumps(data, indent=2, ensure_ascii=False)
        # Validate round-trip before touching the real file
        json.loads(serialized)
        tmp.write_text(serialized, encoding="utf-8")
        os.replace(tmp, path)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise

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
                "Mozilla/5.0 (compatible; AI-regulatory-monitor/1.1; "
                "+https://github.com/felipelago17/AI-regulatory-monitor)"
            ),
            "Accept": "application/rss+xml, application/atom+xml, application/xml, application/json;q=0.9, */*;q=0.8",
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


def _parse_fr_api(content: bytes, feed_meta: dict) -> list[dict]:
    """Parse a Federal Register API v1 documents.json response."""
    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        print(f"  ⚠ JSON parse error for {feed_meta['source']}: {exc}")
        return []
    items = []
    for doc in payload.get("results", []):
        title = _strip_html(doc.get("title") or "")
        url = doc.get("html_url") or ""
        if not title or not url:
            continue
        agencies = ", ".join(a.get("name", "") for a in doc.get("agencies", []) if isinstance(a, dict))
        doc_type = doc.get("type") or ""
        abstract = _strip_html(doc.get("abstract") or "")
        prefix = " — ".join(x for x in (doc_type, agencies) if x)
        summary = f"{prefix}. {abstract}".strip(". ") if prefix else abstract
        tags = list(feed_meta["tags"])
        if doc_type and doc_type.lower().replace(" ", "-") not in tags:
            tags.append(doc_type.lower().replace(" ", "-"))
        items.append({
            "id": _make_id(url, title),
            "date": _parse_date(doc.get("publication_date") or ""),
            "jurisdiction": feed_meta["jurisdiction"],
            "topics": [],
            "title": title,
            "summary": summary,
            "source": feed_meta["source"],
            "url": url,
            "tags": tags,
            "category": "news",
            "citation": doc.get("citation") or "",
            "document_number": doc.get("document_number") or "",
        })
    return items


_BARE_AMP = re.compile(rb"&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);)")
_CTRL = re.compile(rb"[\x00-\x08\x0b\x0c\x0e-\x1f]")


_XML_ENTITIES = {"amp", "lt", "gt", "quot", "apos"}
_NAMED_ENT = re.compile(rb"&([a-zA-Z][a-zA-Z0-9]*);")


def _sanitize_xml(content: bytes) -> bytes:
    """Make near-valid feeds parseable by a strict XML parser.

    - escape bare ampersands
    - convert HTML-only named entities (&nbsp; &rsquo; …) to numeric references
    - drop control characters
    """
    from html.entities import name2codepoint

    def _ent(m):
        name = m.group(1).decode("ascii")
        if name in _XML_ENTITIES:
            return m.group(0)
        cp = name2codepoint.get(name)
        return f"&#{cp};".encode("ascii") if cp else b"&amp;" + name.encode("ascii") + b";"

    content = _BARE_AMP.sub(b"&amp;", content)
    content = _NAMED_ENT.sub(_ent, content)
    return _CTRL.sub(b"", content)


def _parse_with_feedparser(content: bytes, feed_meta: dict) -> list[dict]:
    """Tolerant fallback for malformed RSS/Atom.

    1. Re-try strict parsing on a sanitised copy (no extra dependency).
    2. If that still fails, use feedparser when installed.
    """
    cleaned = _sanitize_xml(content)
    if cleaned != content:
        try:
            root = ET.fromstring(cleaned)
        except ET.ParseError:
            root = None
        if root is not None:
            print(f"  ↻ Recovered {feed_meta['source']} after sanitising XML")
            if root.tag.endswith("feed"):
                return _parse_atom_root(root, feed_meta)
            return _parse_rss_root(root, feed_meta)
    try:
        import feedparser  # type: ignore
    except ImportError:
        print("  ⚠ feedparser not installed – cannot recover malformed feed")
        return []
    parsed = feedparser.parse(content)
    items = []
    for e in parsed.entries:
        title = _strip_html(e.get("title", ""))
        url = e.get("link", "") or e.get("id", "")
        if not title:
            continue
        summary = _strip_html(e.get("summary", "") or e.get("description", ""))
        date_text = e.get("published", "") or e.get("updated", "")
        if e.get("published_parsed") or e.get("updated_parsed"):
            tp = e.get("published_parsed") or e.get("updated_parsed")
            date_text = f"{tp.tm_year:04d}-{tp.tm_mon:02d}-{tp.tm_mday:02d}"
        items.append({
            "id": _make_id(url, title),
            "date": _parse_date(date_text),
            "jurisdiction": feed_meta["jurisdiction"],
            "topics": [],
            "title": title,
            "summary": summary,
            "source": feed_meta["source"],
            "url": url,
            "tags": list(feed_meta["tags"]),
            "category": "news",
        })
    if items:
        print(f"  ↻ Recovered {len(items)} item(s) from {feed_meta['source']} with tolerant parser")
    return items


def _parse_rss(content: bytes, feed_meta: dict) -> list[dict]:
    """Parse an RSS 2.0 feed and return a list of item dicts."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        print(f"  ⚠ RSS parse error for {feed_meta['source']}: {exc}")
        return _parse_with_feedparser(content, feed_meta)
    return _parse_rss_root(root, feed_meta)


def _parse_rss_root(root, feed_meta: dict) -> list[dict]:
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
        return _parse_with_feedparser(content, feed_meta)
    return _parse_atom_root(root, feed_meta)


def _parse_atom_root(root, feed_meta: dict) -> list[dict]:
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

    if feed_meta.get("type") == "fr_api":
        return _parse_fr_api(content, feed_meta)

    # Detect format: Atom feeds contain <feed, RSS feeds contain <rss or <channel
    snippet = content[:512].lower()
    if b"<feed" in snippet or b"xmlns=\"http://www.w3.org/2005/atom\"" in snippet:
        return _parse_atom(content, feed_meta)
    return _parse_rss(content, feed_meta)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _report_feed_health(feed_health: list[tuple[str, int]]) -> None:
    """Print a feed-health table and append it to the GitHub job summary."""
    ok = [(n, c) for n, c in feed_health if c > 0]
    dead = [n for n, c in feed_health if c == 0]
    lines = [
        f"### Feed health — {len(ok)}/{len(feed_health)} sources returned items",
        "",
        "| Source | Items parsed |",
        "|---|---|",
    ]
    lines += [f"| {n} | {c} |" for n, c in feed_health]
    if dead:
        lines += ["", f"⚠️ **{len(dead)} source(s) returned nothing:** " + ", ".join(dead)]
    text = "\n".join(lines)
    print(text)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as fh:
            fh.write(text + "\n")
    if feed_health and len(dead) > len(feed_health) // 2:
        print("::warning::More than half of the configured feeds returned no items – check feed URLs.")


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
    feed_health: list[tuple[str, int]] = []
    for feed_meta in FEEDS:
        try:
            fetched = _fetch_feed(feed_meta)
        except Exception:  # noqa: BLE001
            print(f"  ⚠ Skipping {feed_meta['source']} due to unexpected error:")
            traceback.print_exc()
            fetched = []
        kw = feed_meta.get("keywords")
        if kw:
            rx = re.compile(kw, re.IGNORECASE)
            fetched = [i for i in fetched if rx.search(f"{i.get('title','')} {i.get('summary','')}")]
        feed_health.append((feed_meta["source"], len(fetched)))

        for item in fetched:
            if item["id"] not in existing_ids and item.get("url", "") not in existing_urls:
                new_items.append(item)
                existing_ids.add(item["id"])
                if item.get("url"):
                    existing_urls.add(item["url"])

    print(f"✅ {len(new_items)} new item(s) fetched from feeds.")
    _report_feed_health(feed_health)

    if not new_items:
        # Nothing new – update timestamp and exit cleanly
        data["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        try:
            _atomic_write(DATA_FILE, data)
        except OSError as exc:
            print(f"❌ Failed to write data/updates.json: {exc}", file=sys.stderr)
            return 1
        return 0

    # --- 3. Merge and write (hard failure only if write fails) ---
    data["items"] = data.get("items", []) + new_items
    data["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")

    try:
        _atomic_write(DATA_FILE, data)
    except OSError as exc:
        print(f"❌ Failed to write data/updates.json: {exc}", file=sys.stderr)
        return 1

    print(f"💾 data/updates.json updated – {len(data['items'])} total items.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
