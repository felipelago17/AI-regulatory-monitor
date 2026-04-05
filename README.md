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

## Daily Update

**Status: this repository includes a configured GitHub Actions workflow for unattended daily updates. Expected operation depends on repository settings, Actions permissions, and upstream source availability.**

### What runs
A GitHub Actions workflow (`.github/workflows/daily-update.yml`) automatically:
1. Fetches the latest AI-related regulatory notices from the Federal Register (BIS and FTC agencies) and from the ICO and EDPB RSS feeds (`tools/fetch_updates.py`).
2. Categorizes each item and computes a risk score (`tools/categorize_items.py`).
3. Validates that `data/updates.json` is well-formed JSON before committing.
4. Commits any new or updated items to `data/updates.json` with a dated commit message.

### When it runs
Every day at **06:00 UTC** (cron schedule `0 6 * * *`).

### What files it updates
`data/updates.json` — the single source of truth for all regulatory items displayed by the site.

### How to trigger it manually
Navigate to **Actions → Daily Regulatory Monitoring Update → Run workflow** in the GitHub repository UI and click **Run workflow**. No additional inputs are required.

### Post-deployment health check
After the first scheduled run, go to **Actions → Daily Regulatory Monitoring Update** and confirm the most recent run shows a green ✅ status. When new items are found, the run will produce a commit on the default branch with a message of the form `chore: daily regulatory data update [YYYY-MM-DD]`. On days when no new regulatory items are discovered, `data/updates.json` is left unchanged and no commit is made.
