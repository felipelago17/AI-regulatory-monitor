# AI Regulatory Monitor

Dynamic, data-driven, Netlify-friendly monitor for curated regulatory updates.

## Methodology

This repository tracks AI-related regulatory signals including:
- Binding regulations
- Regulatory guidance
- Enforcement actions
- Company AI policies
- Corporate governance statements
Content is curated and structured to separate factual updates from interpretive analysis. Sources are reviewed and added intentionally to preserve accuracy and governance context.
- Edit `data/updates.json` to add items (metadata + internal summary).
- Watermark uses `assets/ai-watermark.png` extracted from the attached PPTX.
- For subscription sources (MLex/Reuters/MLex), store metadata and internal notes only unless your licence permits republication.

## Related Repositories

| Repository | Focus | Status |
|------------|-------|--------|
| [AI-regulatory-monitor](https://github.com/felipelago17/AI-regulatory-monitor) | AI & technology regulation (EU AI Act, US Executive Orders, UK AI Safety) | Active |
| BIS-affiliates-monitor *(planned)* | U.S. export controls — BIS Affiliates Rule (EAR §744.21 / 50 Percent Rule), Entity List & MEU List tracking, Phase 2 snap-back (10 Nov 2026) | Planned |
| Sanctions-tracker *(planned)* | OFAC SDN List changes, Treasury/State sanctions designations, cross-regime overlap with BIS Entity List | Planned |

### Cross-Repository Signals

The following regulatory developments overlap across all three repositories and should be tracked in each:

- **BIS Affiliates Rule snap-back (10 Nov 2026)** — export controls + AI chip supply chain implications  
  Primary source: [FR 2025-19846](https://www.federalregister.gov/documents/2025/11/12/2025-19846/one-year-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed-entities)
- **Entity List / MEU List updates** — overlap with OFAC SDN and AI hardware export restrictions
- **AI chip export controls** (BIS AI diffusion rules, H100/A100 restrictions) — tracked here under export controls + AI regulation
