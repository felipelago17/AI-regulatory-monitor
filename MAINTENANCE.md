# Maintenance Guide

## Daily Update Workflow

### What it does

The workflow runs four steps in sequence each day:

| Step | Script | Purpose |
|------|--------|---------|
| 1 | `tools/fetch_updates.py` | Polls Federal Register (BIS, FTC), ICO RSS, and EDPB RSS; prepends new items to `data/updates.json` (URL-based deduplication). |
| 2 | `tools/categorize_items.py` | Assigns a `category` (`enforcement`, `update`, or `news`) and computes a `risk_score` for each item. |
| 3 | inline `python -c …` | Parses `data/updates.json` to confirm it is valid JSON before any commit. |
| 4 | `tools/check_site.py` | Checks for broken local references in `index.html` / `styles.css` (non-blocking — `continue-on-error: true`). |

If any new items were found, the workflow commits `data/updates.json` with the message `chore: daily regulatory data update [YYYY-MM-DD]` and pushes to the default branch. If nothing changed, the commit step exits cleanly with no commit.

### Files involved

| File | Role |
|------|------|
| `.github/workflows/daily-update.yml` | Workflow definition and schedule |
| `tools/fetch_updates.py` | Fetches items from public APIs/RSS feeds |
| `tools/categorize_items.py` | Categorizes items and scores risk |
| `tools/check_site.py` | Validates site integrity (non-blocking) |
| `data/updates.json` | The only file modified and committed by the workflow |

### Schedule

Runs automatically every day at **06:00 UTC** (`cron: "0 6 * * *"`).

---

## Verifying the Workflow is Healthy

1. Go to **Actions → Daily Regulatory Monitoring Update** in the GitHub repository.
2. Confirm the most recent run has a green ✅ status.
3. On days when new regulatory items are available, the commit history on the default branch will include a commit from `github-actions[bot]` with the message `chore: daily regulatory data update [YYYY-MM-DD]`. On days with no new items the run still passes; look for "No data changes to commit" in the run logs.

---

## Manual Trigger

Navigate to **Actions → Daily Regulatory Monitoring Update → Run workflow** and click **Run workflow**. No inputs are required.

---

## Troubleshooting

**Workflow fails at "Fetch regulatory updates"**  
An external source (Federal Register API, ICO RSS, EDPB RSS) is temporarily unreachable. Re-run the workflow manually once the source is available. Each source is fetched independently, so a single source failure does not block the others.

**Workflow fails at "Validate data JSON"**  
`data/updates.json` was corrupted (e.g. by a manual edit). Restore the last known-good version with:
```bash
git checkout HEAD~1 -- data/updates.json
git commit -m "fix: restore valid updates.json"
```

**"Validate site integrity" shows warnings**  
This step runs with `continue-on-error: true` and will not fail the workflow. Review the step output in the Actions log and fix any missing local file references reported by `tools/check_site.py`.

---

## Disabling the Workflow

To pause automated runs without deleting the workflow file, go to **Actions → Daily Regulatory Monitoring Update → ⋯ → Disable workflow**. Re-enable it from the same menu when ready. Alternatively, remove or comment out the `schedule:` block in `.github/workflows/daily-update.yml`.
