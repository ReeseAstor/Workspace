# KDP Cover Image Dimension Tracker

## Overview
This tool tracks and analyzes SL1500 cover image URLs and dimensions for your live KDP books across all formats (eBook, Audiobook, Paperback).

## Your Portfolio Summary

**Total Books:** 8 titles  
**Total Format Variants:** 24 covers  
**Series Identified:** 
- "The Billionaire's" series (5 books)
- Corporate thriller series (3 books: The First Acquisition, Hostile Tender, Poison Pill)

## Key Findings from Your Data

### Dimension Patterns Discovered

| Format | Standard Dimensions | Aspect Ratio | Consistency |
|--------|---------------------|--------------|-------------|
| **eBook** | 970-999 × 1500 px | ~0.65 (2:3) | Variable width |
| **Audiobook** | 1500 × 1500 px | 1.0 (1:1) | ✅ Perfect consistency |
| **Paperback** | 971-1000 × 1499-1500 px | ~0.66 | Two distinct groups |

### Critical Observation: Dimension Drift

Your eBook covers show **progressive width reduction** over time:
- Early books: 999px, 994px width
- Recent books: 970-975px width

This suggests Amazon may be auto-resizing or your design pipeline changed.

### Paperback Dimension Groups

**Group A** (1000×1499px) - 5 books:
- All "Billionaire" series titles
- Consistent spine width calculation

**Group B** (971×1500px) - 3 books:
- Corporate thriller series
- Different trim size or page count

## Files Created

```
kdp-cover-tracker/
├── covers.json              # Master JSON database
├── covers.csv               # Spreadsheet-ready export
├── dimension_analysis.json  # Detailed analysis data
├── analyze_covers.py        # Python analysis script
└── README.md                # This file
```

## How to Use

### View Analysis Report
```bash
cd /workspace/kdp-cover-tracker
python3 analyze_covers.py
```

### Add New Books
Edit `covers.json` following the existing structure:
```json
{
  "title": "Your Book Title",
  "formats": [
    {
      "format": "eBook",
      "asin": "B0XXXXXXXX",
      "cover_url": "https://m.media-amazon.com/images/I/..._SL1500_.jpg",
      "dimensions": {"width": 1000, "height": 1500}
    }
  ]
}
```

### Extract Cover URLs Automatically
Use this URL pattern for any ASIN:
```
https://m.media-amazon.com/images/I/{IMAGE_ID}._SL1500_.jpg
```

Find IMAGE_ID by visiting: `https://www.amazon.com/dp/{ASIN}` and inspecting cover image.

## AI Automation Recommendations

### For Your Specific Portfolio

1. **Master Template Strategy**
   - Create base designs at **3000×4500px** (2:3 ratio, 300 DPI)
   - Auto-export to format-specific sizes:
     - eBook: 2500×3750px (Amazon's recommended)
     - Audiobook: 3000×3000px (ACX requirement)
     - Paperback: Calculate based on exact page count

2. **Series Branding Automation**
   - Your "Billionaire" series has consistent visual identity
   - Implement template locking for:
     - Font placement
     - Color palette
     - Logo/branding position
   - Only vary: title text, background imagery

3. **Quality Control Checks**
   ```python
   # Automated checks to implement:
   - Verify all eBooks maintain 0.65-0.67 aspect ratio
   - Confirm all audiobooks are exactly square
   - Flag paperbacks with unexpected dimensions
   - Monitor for Amazon auto-resizing issues
   ```

4. **A/B Testing Framework**
   - Track performance by cover variant
   - Test different widths within acceptable range
   - Monitor impact on CTR (click-through rate)

## Integration with Your AI Marketing System

### Data Flow
```
KDP API → Cover Tracker → Marketing Dashboard
    ↓           ↓              ↓
  Sales     Dimension     Ad Creative
  Data      Analysis      Generator
```

### Automation Opportunities

1. **Dynamic Ad Creative Generation**
   - Pull cover URLs automatically
   - Resize for Facebook/Instagram/TikTok ad specs
   - Generate video ads from static covers

2. **Cross-Platform Sync**
   - Update Goodreads, BookBub, StoryGraph simultaneously
   - Ensure consistent cover display everywhere

3. **Performance Analytics**
   - Correlate cover dimensions with conversion rates
   - Identify optimal sizes per marketplace
   - Track seasonal design trends

## Next Steps for Scaling

1. **Automated Monitoring**
   - Set up weekly dimension checks
   - Alert if Amazon changes image rendering
   - Track competitor cover strategies

2. **Template Library**
   - Build 5-10 master templates per genre
   - Include bleed-safe zones for print
   - Pre-configured for all three formats

3. **Batch Processing Pipeline**
   ```
   New Manuscript → AI Cover Generation → Multi-format Export → KDP Upload
   ```

## Contact & Support

For questions about integrating this tracker into your full AI automation system, reference the main KDP business strategy documentation.

---
*Last Updated: January 2025*  
*Portfolio Value: 8 titles × 3 formats = 24 revenue streams*
