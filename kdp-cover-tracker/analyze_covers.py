#!/usr/bin/env python3
"""
KDP Cover Image Dimension Tracker
Analyzes cover image dimensions across eBook, Audiobook, and Paperback formats
"""

import json
from datetime import datetime

def load_data(filepath='covers.json'):
    with open(filepath, 'r') as f:
        return json.load(f)

def analyze_dimensions(data):
    """Analyze dimension patterns across formats"""
    analysis = {
        'ebook_dims': [],
        'audiobook_dims': [],
        'paperback_dims': [],
        'aspect_ratios': {}
    }
    
    for book in data['books']:
        for fmt in book['formats']:
            width = fmt['dimensions']['width']
            height = fmt['dimensions']['height']
            ratio = round(width / height, 4)
            format_type = fmt['format']
            
            dim_entry = {
                'title': book['title'],
                'asin': fmt['asin'],
                'width': width,
                'height': height,
                'ratio': ratio
            }
            
            if format_type == 'eBook':
                analysis['ebook_dims'].append(dim_entry)
            elif format_type == 'Audiobook':
                analysis['audiobook_dims'].append(dim_entry)
            elif format_type == 'Paperback':
                analysis['paperback_dims'].append(dim_entry)
            
            # Track aspect ratios
            ratio_key = f"{width}x{height}"
            if ratio_key not in analysis['aspect_ratios']:
                analysis['aspect_ratios'][ratio_key] = []
            analysis['aspect_ratios'][ratio_key].append({
                'title': book['title'],
                'format': format_type
            })
    
    return analysis

def generate_report(analysis):
    """Generate a formatted report"""
    report = []
    report.append("=" * 80)
    report.append("KDP COVER DIMENSION ANALYSIS REPORT")
    report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("=" * 80)
    
    # eBook Analysis
    report.append("\n📱 EBOOK COVERS")
    report.append("-" * 40)
    ebook_ratios = [item['ratio'] for item in analysis['ebook_dims']]
    avg_ebook_ratio = sum(ebook_ratios) / len(ebook_ratios) if ebook_ratios else 0
    report.append(f"Count: {len(analysis['ebook_dims'])}")
    report.append(f"Average Aspect Ratio: {avg_ebook_ratio:.4f}")
    report.append(f"Dimension Range: {min(i['width'] for i in analysis['ebook_dims'])}x{min(i['height'] for i in analysis['ebook_dims'])} to {max(i['width'] for i in analysis['ebook_dims'])}x{max(i['height'] for i in analysis['ebook_dims'])}")
    
    for item in analysis['ebook_dims']:
        report.append(f"  • {item['title']}: {item['width']}x{item['height']} (ratio: {item['ratio']})")
    
    # Audiobook Analysis
    report.append("\n🎧 AUDIOBOOK COVERS")
    report.append("-" * 40)
    audiobook_ratios = [item['ratio'] for item in analysis['audiobook_dims']]
    avg_audiobook_ratio = sum(audiobook_ratios) / len(audiobook_ratios) if audiobook_ratios else 0
    report.append(f"Count: {len(analysis['audiobook_dims'])}")
    report.append(f"Average Aspect Ratio: {avg_audiobook_ratio:.4f}")
    report.append(f"All audiobooks are square format (1:1 ratio)")
    
    for item in analysis['audiobook_dims']:
        report.append(f"  • {item['title']}: {item['width']}x{item['height']} (ratio: {item['ratio']})")
    
    # Paperback Analysis
    report.append("\n📖 PAPERBACK COVERS")
    report.append("-" * 40)
    paperback_ratios = [item['ratio'] for item in analysis['paperback_dims']]
    avg_paperback_ratio = sum(paperback_ratios) / len(paperback_ratios) if paperback_ratios else 0
    report.append(f"Count: {len(analysis['paperback_dims'])}")
    report.append(f"Average Aspect Ratio: {avg_paperback_ratio:.4f}")
    report.append(f"Dimension Range: {min(i['width'] for i in analysis['paperback_dims'])}x{min(i['height'] for i in analysis['paperback_dims'])} to {max(i['width'] for i in analysis['paperback_dims'])}x{max(i['height'] for i in analysis['paperback_dims'])}")
    
    for item in analysis['paperback_dims']:
        report.append(f"  • {item['title']}: {item['width']}x{item['height']} (ratio: {item['ratio']})")
    
    # Dimension Patterns
    report.append("\n📊 DIMENSION PATTERNS")
    report.append("-" * 40)
    for dim, books in sorted(analysis['aspect_ratios'].items(), key=lambda x: -len(x[1])):
        formats = set(b['format'] for b in books)
        report.append(f"  {dim}: {len(books)} covers ({', '.join(formats)})")
    
    # Recommendations
    report.append("\n💡 RECOMMENDATIONS FOR AI AUTOMATION")
    report.append("-" * 40)
    report.append("1. eBook Covers: Target 1000x1500px (2:3 ratio) for consistency")
    report.append("2. Audiobook Covers: Use 1500x1500px (1:1 square) - ACX standard")
    report.append("3. Paperback Covers: Target 1000x1500px, but calculate based on page count")
    report.append("4. Create master templates at 3000x4500px (2x scale) for all formats")
    report.append("5. Implement auto-cropping logic for format-specific requirements")
    
    report.append("\n" + "=" * 80)
    
    return "\n".join(report)

def export_csv(data, filepath='covers.csv'):
    """Export data to CSV format"""
    with open(filepath, 'w') as f:
        f.write("Title,Format,ASIN,Cover URL,Width,Height,Aspect Ratio\n")
        for book in data['books']:
            for fmt in book['formats']:
                ratio = fmt['dimensions']['width'] / fmt['dimensions']['height']
                f.write(f'"{book["title"]}",{fmt["format"]},{fmt["asin"]},{fmt["cover_url"]},{fmt["dimensions"]["width"]},{fmt["dimensions"]["height"]},{ratio:.4f}\n')
    return filepath

if __name__ == '__main__':
    # Load data
    data = load_data()
    
    # Analyze
    analysis = analyze_dimensions(data)
    
    # Generate report
    report = generate_report(analysis)
    print(report)
    
    # Export CSV
    csv_file = export_csv(data)
    print(f"\n✅ CSV exported to: {csv_file}")
    
    # Save analysis as JSON
    with open('dimension_analysis.json', 'w') as f:
        json.dump(analysis, f, indent=2)
    print(f"✅ Analysis saved to: dimension_analysis.json")
