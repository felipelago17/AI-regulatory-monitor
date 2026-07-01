#!/usr/bin/env python3
"""
Transform data/updates.json → data/items.json + data/connectors.json.

items.json schema (new app format):
  id, type, title, why, summary, jurisdiction, source, source_url,
  date, risk, risk_note, topics, actions, links

connectors.json schema:
  [{ name, status, last_sync, count }]

Run after categorize_items.py in the CI pipeline.
"""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPDATES = ROOT / "data" / "updates.json"
ITEMS_OUT = ROOT / "data" / "items.json"
CONNS_OUT = ROOT / "data" / "connectors.json"

_JURIS_MAP = {
    "United States": "US",
    "European Union": "EU",
    "United Kingdom": "UK",
    "UAE": "UAE",
    "Global": "INT",
    "US / EU": "INT",
    "International": "INT",
}

_TYPE_MAP = {
    "enforcement": "enforce",
    "enforce":     "enforce",
    "update":      "update",
    "news":        "news",
}

_TOPIC_NORM = {
    "export controls":       "export-controls",
    "export-controls":       "export-controls",
    "sanctions":             "sanctions",
    "sanctions compliance":  "sanctions",
    "data privacy":          "data-privacy",
    "data-privacy":          "data-privacy",
    "data residency":        "data-residency",
    "data-residency":        "data-residency",
    "ai governance":         "ai-governance",
    "ai-governance":         "ai-governance",
    "responsible ai":        "responsible-ai",
    "responsible-ai":        "responsible-ai",
    "cybersecurity":         "cybersecurity",
}

_KNOWN_TOPICS = {
    "export-controls", "sanctions", "data-privacy",
    "data-residency", "ai-governance", "responsible-ai", "cybersecurity",
}


def _atomic_write(path: Path, data) -> None:
    tmp = path.with_suffix(".tmp")
    try:
        serialized = json.dumps(data, indent=2, ensure_ascii=False)
        json.loads(serialized)
        tmp.write_text(serialized, encoding="utf-8")
        os.replace(tmp, path)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise


def _first_sentence(text: str, max_chars: int = 180) -> str:
    if not text:
        return ""
    # Strip common RSS noise: "Title Author Mon, DD/MM/YYYY - HH:MM ..."
    text = re.sub(r"\b\w+\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\d{2}/\d{2}/\d{4}\s*-\s*\d{2}:\d{2}", "", text)
    # Strip patterns like "Anonymous (not verified)"
    text = re.sub(r"\bAnonymous\s*\([^)]+\)", "", text)
    text = " ".join(text.split())
    m = re.search(r"[.!?](?:\s|$)", text)
    end = m.end() if m else len(text)
    s = text[:end].strip()
    if len(s) > max_chars:
        s = s[:max_chars].rsplit(" ", 1)[0] + "…"
    return s or text[:max_chars].rsplit(" ", 1)[0] + "…"


def _normalise_juris(raw: str) -> str:
    return _JURIS_MAP.get(raw, raw.split("/")[0].strip() if "/" in raw else raw)


def _normalise_type(raw: str) -> str:
    return _TYPE_MAP.get((raw or "news").lower(), "news")


def _normalise_topics(raw_topics: list, raw_tags: list) -> list:
    seen = set()
    out = []
    for t in list(raw_topics) + list(raw_tags):
        norm = _TOPIC_NORM.get(t.lower().replace("_", "-"))
        if norm and norm not in seen:
            seen.add(norm)
            out.append(norm)
    if not out:
        return []
    return [t for t in out if t in _KNOWN_TOPICS] or out[:3]


def transform(item: dict) -> dict:
    ia = item.get("impact_assessment") or {}
    raw_type = item.get("category") or item.get("type") or "news"
    raw_juris = item.get("jurisdiction", "")
    summary = item.get("summary", "")
    why = (
        item.get("keyTakeaway")
        or item.get("why")
        or _first_sentence(summary)
    )
    risk = item.get("risk_score") or item.get("risk") or 50
    risk_note = (
        item.get("risk_note")
        or ia.get("confidence_level")
        or ""
    )
    url = item.get("url") or item.get("source_url") or ""
    source = item.get("source", "")
    links = item.get("links") or (
        [["Read more", source, url]] if url and source else []
    )
    actions = item.get("actions") or []
    topics = _normalise_topics(
        item.get("topics", []), item.get("tags", [])
    )

    return {
        "id":         item["id"],
        "type":       _normalise_type(raw_type),
        "title":      item.get("title", ""),
        "why":        why,
        "summary":    summary,
        "jurisdiction": _normalise_juris(raw_juris),
        "source":     source,
        "source_url": url,
        "date":       item.get("date", ""),
        "risk":       min(int(risk), 100),
        "risk_note":  risk_note,
        "topics":     topics,
        "actions":    actions,
        "links":      links,
    }


def build_connectors(items: list, generated_at: str) -> list:
    counts: dict[str, int] = {}
    for it in items:
        counts[it.get("source", "unknown")] = counts.get(it.get("source", "unknown"), 0) + 1

    priority = [
        "FTC", "NIST", "EU Digital Strategy", "gov.uk",
        "BIS – Export Administration Regulations",
        "Skadden", "Paul Weiss", "Covington & Burling", "Freshfields",
        "WilmerHale", "Squire Patton Boggs", "Blank Rome",
        "Sidley Austin", "Holland & Knight", "Arnold & Porter", "Miller & Chevalier",
        "Federal Register — frontier model export",
        "Federal Register — covered AI model",
        "Federal Register — deemed export AI",
        "Federal Register — BIS AI diffusion",
    ]
    conns = []
    seen = set()
    for name in priority:
        if name in counts:
            conns.append({
                "name": name,
                "status": "live",
                "last_sync": generated_at,
                "count": counts[name],
            })
            seen.add(name)
    # Add remaining sources by volume, cap total feed connectors at 20
    for name, ct in sorted(counts.items(), key=lambda x: -x[1]):
        if name not in seen and len(conns) < 20:
            conns.append({
                "name": name,
                "status": "live",
                "last_sync": generated_at,
                "count": ct,
            })
    conns.append({
        "name": "Claude triage",
        "status": "live",
        "last_sync": generated_at,
        "count": None,
    })
    return conns


def main() -> None:
    with UPDATES.open(encoding="utf-8") as f:
        data = json.load(f)

    raw_items = data.get("items", [])
    generated_at = data.get("generated_at", datetime.now(timezone.utc).isoformat(timespec="seconds"))

    items = [transform(it) for it in raw_items if it.get("id") and it.get("title")]
    items.sort(key=lambda i: i["date"], reverse=True)

    conns = build_connectors(raw_items, generated_at)

    _atomic_write(ITEMS_OUT, items)
    _atomic_write(CONNS_OUT, conns)

    print(f"✅ data/items.json — {len(items)} items")
    print(f"✅ data/connectors.json — {len(conns)} connectors")

    enforce = sum(1 for i in items if i["type"] == "enforce")
    update  = sum(1 for i in items if i["type"] == "update")
    news    = sum(1 for i in items if i["type"] == "news")
    high    = sum(1 for i in items if i["risk"] >= 65)
    print(f"   enforce={enforce} update={update} news={news} high-risk={high}")


if __name__ == "__main__":
    main()
