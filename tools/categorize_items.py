#!/usr/bin/env python3
"""
Add category field to items based on tags and other properties.
Categories: 'enforcement', 'update', 'news'
"""
import json

def categorize_item(item):
    """Determine category based on item properties."""
    tags = [t.lower() for t in item.get('tags', [])]
    title = item.get('title', '').lower()
    summary = item.get('summary', '').lower()
    
    # Check for enforcement indicators
    enforcement_keywords = ['enforcement', 'settlement', 'penalty', 'investigation', 'judgment', 'sanction']
    if any(kw in tags for kw in enforcement_keywords):
        return 'enforcement'
    if any(kw in title or kw in summary for kw in enforcement_keywords):
        return 'enforcement'
    
    # Check for regulatory update indicators
    update_keywords = ['guidance', 'advisory', 'alert', 'warning', 'update', 'rule', 'regulation', 'proposal', 'expected']
    if any(kw in tags for kw in update_keywords):
        return 'update'
    if any(kw in title or kw in summary for kw in update_keywords):
        return 'update'
    
    # Default to news
    return 'news'

def calculate_risk_score(impact_assessment):
    """
    Calculate a composite risk score (0-100) based on Hubbard methodology.
    Uses probability and financial exposure as primary drivers.
    """
    if not impact_assessment:
        return 50  # Neutral default
    
    prob = impact_assessment.get('probability_percent', 50) / 100.0
    
    # Financial exposure: use likely scenario
    fin_likely = impact_assessment.get('financial_loss_likely_millions', 0)
    
    # Normalize financial exposure (assume >$50M is max risk factor)
    fin_score = min(fin_likely / 50.0 * 100, 100)
    
    # Rep exposure weight
    rep_exposure = impact_assessment.get('reputational_exposure', 'Low').lower()
    rep_weights = {
        'low': 0.2,
        'medium': 0.5,
        'medium-high': 0.7,
        'high': 0.85,
        'critical': 1.0
    }
    rep_weight = rep_weights.get(rep_exposure, 0.5)
    
    # Composite: 50% probability, 35% financial, 15% reputational
    risk_score = (prob * 50) + (fin_score * 0.35) + (rep_weight * 100 * 0.15)
    
    return min(int(risk_score), 100)

def main():
    with open('data/updates.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for item in data.get('items', []):
        # Always set category (overwrite if exists)
        item['category'] = categorize_item(item)
        
        # Add risk_score if missing
        if 'risk_score' not in item and item.get('impact_assessment'):
            item['risk_score'] = calculate_risk_score(item['impact_assessment'])
    
    # Write back
    with open('data/updates.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Processed {len(data.get('items', []))} items")
    
    # Summary statistics
    categories = {}
    for item in data.get('items', []):
        cat = item.get('category', 'unknown')
        categories[cat] = categories.get(cat, 0) + 1
    
    print("Category distribution:")
    for cat, count in sorted(categories.items(), key=lambda x: (x[0] is None, x[0])):
        print(f"  {cat or 'unknown'}: {count}")

if __name__ == '__main__':
    main()
