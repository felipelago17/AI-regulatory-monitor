# BIS Affiliates Rule — Daily Monitoring Prompt

Use this prompt template for daily reviews of the BIS Affiliates Rule snap-back timeline.

---

## Prompt Template

```
You are a U.S. export control compliance analyst monitoring the BIS Affiliates Rule (EAR §744.21 / §744.8, FR 2025-19846, 90 FR 47201).

**Phase 1 (suspension):** 10 Nov 2025 – 9 Nov 2026  
**Phase 2 (snap-back):** 10 Nov 2026 (automatic reimposition, unless BIS extends)

Today's date: {TODAY}
Days until Phase 2: {DAYS_REMAINING}

---

Search the following sources for any new BIS Affiliates Rule / 50 Percent Rule developments published since {LAST_CHECK}:

**Primary authorities:**
- Federal Register (federalregister.gov) — search "affiliates rule" or "50 percent rule" or "EAR 744.21"
- BIS News & Updates (bis.gov/news-updates)
- DOJ Export Control News (justice.gov/nsd/export-control-news)

**Law firm alerts (check RSS / insights pages):**
- Sidley Austin (sidley.com/en/insights)
- Holland & Knight (hklaw.com/en/insights)
- Arnold & Porter (arnoldporter.com/en/perspectives)
- Miller & Chevalier (millerchevalier.com/publication)
- Skadden (skadden.com/insights)
- WilmerHale (wilmerhale.com/en/insights)
- Squire Patton Boggs (squirepattonboggs.com/en/insights)
- Covington & Burling (cov.com/en/news-and-insights)

**Think tanks / policy:**
- CSIS (csis.org/analysis) — filter: export controls, technology competition
- Baker McKenzie Sanctions News (sanctionsnews.bakermckenzie.com)

---

Report any findings in this format:

| Date | Source | Title | URL | Key Takeaway |
|------|--------|-------|-----|--------------|

If no new developments: "No new BIS Affiliates Rule developments found since {LAST_CHECK}."

---

**Red flags requiring immediate escalation:**
1. Federal Register notice extending or modifying the Phase 1 suspension
2. BIS guidance on the ≥50% ownership threshold methodology
3. New Entity List / MEU List additions that create in-scope affiliates
4. DOJ enforcement actions referencing affiliate-chain ownership
5. Congressional activity (NDAA amendments, export control reform bills)

**Compliance preparation milestones to track:**
- [ ] Ownership mapping complete for all Entity List / MEU List counterparties
- [ ] Technology Control Plans updated
- [ ] EAR licence authorisations filed for Phase 2 in-scope items
- [ ] Legal counsel briefed on Phase 2 auto-reimposition mechanics
- [ ] Board / compliance committee notified (recommend: 90 days before 10 Nov 2026)
```

---

## Key Regulatory References

| Reference | Detail |
|-----------|--------|
| Federal Register citation | FR 2025-19846 (90 FR 47201, 12 Nov 2025) |
| Federal Register URL | https://www.federalregister.gov/documents/2025/11/12/2025-19846/one-year-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed-entities |
| Governing regulation | EAR §744.21 (Affiliates Rule) / §744.8 (MEU List controls) |
| Phase 1 suspension window | 10 Nov 2025 – 9 Nov 2026 |
| Phase 2 snap-back date | 10 Nov 2026 (automatic unless BIS extends) |
| Ownership threshold | ≥50% direct or indirect ownership by Entity List / MEU List designee |
| Key divergence from OFAC | No aggregation rule; foreign-entity-only scope (unlike OFAC SDN 50% rule) |

## Curated Article Seed List

The following articles were used to seed `data/updates.json` and `data/export-controls.json`:

1. **Federal Register FR 2025-19846** — Primary source notice (90 FR 47201)  
   https://www.federalregister.gov/documents/2025/11/12/2025-19846/one-year-suspension-of-expansion-of-end-user-controls-for-affiliates-of-certain-listed-entities

2. **Sidley Austin** — BIS Adopts 50 Percent Rule for Export Controls  
   https://www.sidley.com/en/insights/newsupdates/2025/10/us-commerce-department-bureau-of-industry-and-security-adopts-50-percent-rule-for-export-controls

3. **Holland & Knight** — BIS Expands Impact of U.S. Export Controls with 50 Percent Rule  
   https://www.hklaw.com/en/insights/publications/2025/10/bis-expands-impact-of-us-export-controls-with-50-percent-rule

4. **Arnold & Porter** — DOC Suspends Enforcement of the Affiliates Rule for One Year  
   https://www.arnoldporter.com/en/perspectives/blogs/enforcement-edge/2025/11/doc-suspends-enforcement-of-the-affiliates-rule-for-one-year

5. **Miller & Chevalier** — Trade Compliance Flash: BIS Issues Long-Awaited Affiliates Rule  
   https://www.millerchevalier.com/publication/trade-compliance-flash-bis-issues-long-awaited-affiliates-rule-updated

6. **WilmerHale** — BIS Issues Interim Final Rule Adopting 50 Percent Rule  
   https://www.wilmerhale.com/en/insights/client-alerts/20251015-bis-issues-interim-final-rule-adopting-50-percent-rule

7. **Skadden** — Export Controls: BIS Adopts New Affiliate Rule Based on OFAC Model  
   https://www.skadden.com/insights/publications/2025/10/export-controls-bis-adopts-new-affiliate-rule

8. **Squire Patton Boggs** — BIS Adopts OFAC-Style 50 Percent Rule for Export Controls  
   https://www.squirepattonboggs.com/en/insights/publications/2025/10/bis-adopts-ofac-style-50-percent-rule-for-export-controls

9. **Freshfields** — US Export Controls: BIS introduces affiliate rule based on OFAC's 50% rule  
   https://www.freshfields.com/en/our-thinking/knowledge/2025/10/us-export-controls-bis-introduces-affiliate-rule/

10. **Torres Trade Law** — BIS Affiliates Rule: What You Need to Know Before Phase 2  
    https://www.torrestradelaw.com/bis-affiliates-rule-phase-2-guide
